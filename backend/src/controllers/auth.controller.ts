import { Request, Response } from 'express';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { authService } from '../services/auth.service.js';
import { AdminUserModel } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

// V10 SimpleWebAuthn API 變更：不再使用 isoBase64URL，而是使用 Uint8Array 處理。
// 但為了簡化 JSON 儲存，我們將 base64URL 與 Uint8Array 進行轉換。

function bufferToBase64URL(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString('base64url');
}

function base64URLToBuffer(base64url: string): Uint8Array {
  const buf = Buffer.from(base64url, 'base64url');
  const arr = new Uint8Array(buf.length);
  for (let i = 0; i < buf.length; i++) arr[i] = buf[i];
  return arr as any;
}

const rpName = 'ZUTOMAYO Gallery Admin';

const getOriginInfo = (req: Request) => {
  const origin = req.get('origin') || process.env.EXPECTED_ORIGIN || 'http://localhost:5173';
  const rpID = process.env.RP_ID || new URL(origin).hostname;
  return { origin, rpID };
};

export const generateRegOptions = async (req: Request, res: Response) => {
  const user = (req as any).user as { id: string; username: string } | undefined;
  if (!user?.id || !user?.username) {
    throw new AppError(401, 'Unauthorized');
  }
  const { rpID } = getOriginInfo(req);
  const passkeys = await authService.getPasskeys(user.id);
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new Uint8Array(Buffer.from(user.id)),
    userName: user.username,
    attestationType: 'none',
    excludeCredentials: passkeys.map(pk => ({
      id: pk.id,
      transports: pk.transports as any,
    })),
  });
  req.session.passkeyChallenge = options.challenge;
  res.json(options);
};

export const verifyReg = async (req: Request, res: Response) => {
  const body = req.body;
  const name = body.name || 'Unnamed Passkey';
  const { origin, rpID } = getOriginInfo(req);
  const expectedChallenge = req.session.passkeyChallenge as string | undefined;
  const user = (req as any).user as { id: string; username: string } | undefined;
  if (!user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  if (!expectedChallenge) throw new AppError(400, 'No active challenge');

  const verification = await verifyRegistrationResponse({
    response: body.data,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (verification.verified && verification.registrationInfo) {
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    await authService.savePasskey({
      id: credential.id,
      user_id: user.id,
      publicKey: bufferToBase64URL(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports,
      name,
      createdAt: new Date().toISOString()
    });
    req.session.passkeyChallenge = null;
    return res.json({ success: true });
  }
  throw new AppError(400, 'Passkey registration verification failed');
};

/**
 * 生成 Passkey 認證選項
 * 安全修復：必須提供 username 參數，只查詢該用戶的 passkey
 * 不再獲取系統中全部 passkey
 */
export const generateAuthOptions = async (req: Request, res: Response) => {
  const { rpID } = getOriginInfo(req);
  const usernameRaw = typeof req.body?.username === 'string'
    ? req.body.username
    : typeof req.query?.username === 'string'
      ? req.query.username
      : '';
  const username = usernameRaw.trim();

  // 必須提供用戶名才能查詢對應的 passkey
  if (!username || typeof username !== 'string') {
    throw new AppError(400, '無法生成認證選項');
  }

  // 先查找用戶
  const adminUser = await AdminUserModel.findOne({ where: { username } as any });
  if (!adminUser) {
    // 不洩露用戶是否存在，返回統一錯誤
    throw new AppError(400, '無法生成認證選項');
  }

  const userData = adminUser.toJSON() as any;
  if (!userData.is_active) {
    throw new AppError(400, '無法生成認證選項');
  }

  // 只查詢該用戶的 passkey
  const passkeys = await authService.getPasskeys(String(userData.id));
  if (passkeys.length === 0) {
    throw new AppError(400, '該用戶沒有註冊任何 Passkey');
  }
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: passkeys.map(pk => ({
      id: pk.id,
      transports: pk.transports as any,
    })),
  });
  req.session.passkeyChallenge = options.challenge;
  req.session.passkeyUsername = username;
  res.json(options);
};

/**
 * 驗證 Passkey 認證
 * 安全修復：只查詢 session 中記錄的用戶的 passkey，不再獲取全部
 */
export const verifyAuth = async (req: Request, res: Response) => {
  const body = req.body;
  const { origin, rpID } = getOriginInfo(req);
  const expectedChallenge = req.session.passkeyChallenge as string | undefined;
  const passkeyUsername = req.session.passkeyUsername as string | undefined;

  if (!expectedChallenge) throw new AppError(400, 'No active challenge');
  if (!passkeyUsername) throw new AppError(400, 'No active authentication session');

  // 根據 session 中的用戶名查找用戶，只查詢該用戶的 passkey
  const adminUser = await AdminUserModel.findOne({ where: { username: passkeyUsername } as any });
  if (!adminUser) throw new AppError(400, 'Passkey authentication failed');

  const userData = adminUser.toJSON() as any;
  const passkeys = await authService.getPasskeys(String(userData.id));
  const passkey = passkeys.find(pk => pk.id === body.id);

  if (!passkey) throw new AppError(400, 'Passkey authentication failed');
  if (!passkey.user_id) throw new AppError(400, 'Passkey requires re-registration');

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: passkey.id,
      publicKey: base64URLToBuffer(passkey.publicKey) as any,
      counter: passkey.counter,
      transports: passkey.transports as any,
    },
  });

  if (verification.verified) {
    await authService.updatePasskeyCounter(passkey.id, verification.authenticationInfo.newCounter);
    if (!userData?.id || !userData?.username || !userData?.is_active) {
      throw new AppError(401, 'INVALID_CREDENTIALS');
    }
    req.session.userId = String(userData.id);
    req.session.username = String(userData.username);
    req.session.passkeyChallenge = null;
    req.session.passkeyUsername = null;
    return res.json({ success: true });
  }
  throw new AppError(400, 'Passkey authentication failed');
};

export const listPasskeys = async (req: Request, res: Response) => {
  const user = (req as any).user as { id: string } | undefined;
  if (!user?.id) {
    throw new AppError(401, 'Unauthorized');
  }
  const passkeys = await authService.getPasskeys(user.id);
  res.json(passkeys.map(pk => ({ id: pk.id, name: pk.name, createdAt: pk.createdAt })));
};

export const removePasskey = async (req: Request, res: Response) => {
  const user = (req as any).user as { id: string } | undefined;
  if (!user?.id) {
    throw new AppError(401, 'Unauthorized');
  }
  await authService.removePasskey(req.params.id, user.id);
  res.json({ success: true });
};
