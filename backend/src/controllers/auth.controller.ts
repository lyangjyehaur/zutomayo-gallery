import { Request, Response } from 'express';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { authService } from '../services/auth.service.js';
import { AdminUserModel } from '../models/index.js';

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
  try {
    const user = (req as any).user as { id: string; username: string } | undefined;
    if (!user?.id || !user?.username) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
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
    (req.session as any).passkeyChallenge = options.challenge;
    res.json(options);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyReg = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const name = body.name || 'Unnamed Passkey';
    const { origin, rpID } = getOriginInfo(req);
    const expectedChallenge = (req.session as any).passkeyChallenge as string | undefined;
    const user = (req as any).user as { id: string; username: string } | undefined;
    if (!user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!expectedChallenge) return res.status(400).json({ error: 'No active challenge' });

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
      (req.session as any).passkeyChallenge = null;
      return res.json({ success: true });
    }
    res.status(400).json({ success: false });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const generateAuthOptions = async (req: Request, res: Response) => {
  try {
    const { rpID } = getOriginInfo(req);
    const passkeys = await authService.getPasskeys();
    if (passkeys.length === 0) {
      return res.status(400).json({ error: '系統中沒有註冊任何 Passkey' });
    }
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: passkeys.map(pk => ({
        id: pk.id,
        transports: pk.transports as any,
      })),
    });
    (req.session as any).passkeyChallenge = options.challenge;
    res.json(options);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const verifyAuth = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { origin, rpID } = getOriginInfo(req);
    const expectedChallenge = (req.session as any).passkeyChallenge as string | undefined;
    if (!expectedChallenge) return res.status(400).json({ error: 'No active challenge' });

    const passkeys = await authService.getPasskeys();
    const passkey = passkeys.find(pk => pk.id === body.id);

    if (!passkey) return res.status(400).json({ error: '找不到對應的 Passkey' });
    if (!passkey.user_id) return res.status(400).json({ error: 'Passkey 需要重新註冊' });

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
      const user = await AdminUserModel.findByPk(passkey.user_id);
      const data = user?.toJSON ? (user.toJSON() as any) : null;
      if (!data?.id || !data?.username || !data?.is_active) {
        res.status(403).json({ success: false, error: 'USER_DISABLED' });
        return;
      }
      (req.session as any).userId = String(data.id);
      (req.session as any).username = String(data.username);
      (req.session as any).passkeyChallenge = null;
      return res.json({ success: true });
    }
    res.status(400).json({ success: false });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const listPasskeys = async (req: Request, res: Response) => {
  const user = (req as any).user as { id: string } | undefined;
  if (!user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const passkeys = await authService.getPasskeys(user.id);
  res.json(passkeys.map(pk => ({ id: pk.id, name: pk.name, createdAt: pk.createdAt })));
};

export const removePasskey = async (req: Request, res: Response) => {
  const user = (req as any).user as { id: string } | undefined;
  if (!user?.id) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  await authService.removePasskey(req.params.id, user.id);
  res.json({ success: true });
};

 
