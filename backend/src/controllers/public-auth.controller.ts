import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PublicAuthTokenModel, PublicUserModel } from '../models/index.js';
import { generateToken, sha256Hex } from '../utils/submission.js';
import { isMailConfigured, sendMagicLinkEmail } from '../services/mail.service.js';

const magicTokenTtlMs = 15 * 60 * 1000;
const verifyTokenTtlMs = 60 * 60 * 1000;
const resetTokenTtlMs = 60 * 60 * 1000;

const normalizeEmail = (email: string) => String(email || '').trim().toLowerCase();

export const requestMagicLink = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail((req.body as any)?.email);
    if (!email || !email.includes('@') || email.length > 254) {
      res.status(400).json({ success: false, error: 'INVALID_EMAIL' });
      return;
    }

    const [user] = await PublicUserModel.findOrCreate({
      where: { email },
      defaults: {
        email,
        display_name: email.split('@')[0],
      } as any,
    });

    const token = generateToken();
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + magicTokenTtlMs);

    await PublicAuthTokenModel.create({
      user_id: (user as any).get('id'),
      purpose: 'login',
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: new Date(),
    } as any);

    const origin = process.env.PUBLIC_APP_ORIGIN || 'http://localhost:5173';
    const redirect = typeof (req.body as any)?.redirectUrl === 'string' ? (req.body as any).redirectUrl : '/';
    const link = `${origin.replace(/\/$/, '')}/auth/magic?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirect)}`;

    const sent = await sendMagicLinkEmail(email, link).catch(() => false);

    if (!sent) {
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
        res.status(500).json({ success: false, error: isMailConfigured() ? 'MAIL_SEND_FAILED' : 'MAIL_NOT_CONFIGURED' });
        return;
      }
      res.json({ success: true, data: { link, token } });
      return;
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'REQUEST_MAGIC_LINK_FAILED' });
  }
};

export const verifyMagicLink = async (req: Request, res: Response) => {
  try {
    const token = String((req.body as any)?.token || '').trim();
    if (!token || token.length < 16) {
      res.status(400).json({ success: false, error: 'INVALID_TOKEN' });
      return;
    }

    const tokenHash = sha256Hex(token);
    const record = await PublicAuthTokenModel.findOne({ where: { token_hash: tokenHash } });
    if (!record) {
      res.status(401).json({ success: false, error: 'TOKEN_NOT_FOUND' });
      return;
    }
    if (String((record as any).get('purpose') || 'login') !== 'login') {
      res.status(401).json({ success: false, error: 'TOKEN_PURPOSE_INVALID' });
      return;
    }

    if ((record as any).get('used_at')) {
      res.status(401).json({ success: false, error: 'TOKEN_USED' });
      return;
    }

    const expiresAt = (record as any).get('expires_at') as Date;
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      res.status(401).json({ success: false, error: 'TOKEN_EXPIRED' });
      return;
    }

    await (record as any).update({ used_at: new Date() });

    const userId = (record as any).get('user_id');
    (req.session as any).publicUserId = userId;

    const user = await PublicUserModel.findByPk(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
      return;
    }

    res.json({ success: true, data: user.toJSON() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'VERIFY_MAGIC_LINK_FAILED' });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.publicUserId;
    if (!userId) {
      res.json({ success: true, data: null });
      return;
    }
    const user = await PublicUserModel.findByPk(userId);
    res.json({ success: true, data: user ? user.toJSON() : null });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'PUBLIC_ME_FAILED' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    if (req.session) {
      (req.session as any).publicUserId = undefined;
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'PUBLIC_LOGOUT_FAILED' });
  }
};

export const updateMe = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.publicUserId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'PUBLIC_UNAUTHORIZED' });
      return;
    }

    const user = await PublicUserModel.findByPk(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
      return;
    }

    const update: any = {};

    if (typeof (req.body as any)?.display_name === 'string') {
      const v = String((req.body as any).display_name).trim();
      update.display_name = v.slice(0, 64);
    }

    const rawSocials = (req.body as any)?.social_links;
    if (rawSocials && typeof rawSocials === 'object' && !Array.isArray(rawSocials)) {
      const allowedKeys = ['x', 'instagram', 'pixiv', 'youtube', 'website'];
      const next: any = {};
      allowedKeys.forEach((k) => {
        const val = (rawSocials as any)[k];
        if (typeof val === 'string') {
          const s = val.trim();
          if (s) next[k] = s.slice(0, 200);
        }
      });
      update.social_links = next;
    }

    if (typeof (req.body as any)?.public_profile_enabled === 'boolean') {
      update.public_profile_enabled = (req.body as any).public_profile_enabled;
    }

    const rawFields = (req.body as any)?.public_profile_fields;
    if (rawFields && typeof rawFields === 'object' && !Array.isArray(rawFields)) {
      const next = {
        display_name: Boolean((rawFields as any).display_name),
        socials: Boolean((rawFields as any).socials),
        email_masked: Boolean((rawFields as any).email_masked),
      };
      update.public_profile_fields = next;
    }

    await (user as any).update(update);

    res.json({ success: true, data: (user as any).toJSON() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'PUBLIC_UPDATE_ME_FAILED' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail((req.body as any)?.email);
    const password = String((req.body as any)?.password || '');
    const displayName = typeof (req.body as any)?.display_name === 'string' ? String((req.body as any).display_name).trim() : '';

    if (!email || !email.includes('@') || email.length > 254) {
      res.status(400).json({ success: false, error: 'INVALID_EMAIL' });
      return;
    }
    if (!password || password.length < 8 || password.length > 72) {
      res.status(400).json({ success: false, error: 'INVALID_PASSWORD' });
      return;
    }

    const existing = await PublicUserModel.findOne({ where: { email } as any });
    if (existing && (existing as any).get('password_hash')) {
      res.status(409).json({ success: false, error: 'EMAIL_ALREADY_REGISTERED' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let user: any;
    if (!existing) {
      user = await PublicUserModel.create({
        email,
        display_name: displayName || email.split('@')[0],
        password_hash: passwordHash,
        email_verified_at: null,
      } as any);
    } else {
      user = existing;
      await (user as any).update({
        display_name: displayName || (user as any).get('display_name') || email.split('@')[0],
        password_hash: passwordHash,
        email_verified_at: null,
      });
    }

    const token = generateToken();
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + verifyTokenTtlMs);
    await PublicAuthTokenModel.create({
      user_id: (user as any).get('id'),
      purpose: 'verify_email',
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: new Date(),
    } as any);

    const origin = process.env.PUBLIC_APP_ORIGIN || 'http://localhost:5173';
    const redirect = typeof (req.body as any)?.redirectUrl === 'string' ? (req.body as any).redirectUrl : '/';
    const link = `${origin.replace(/\/$/, '')}/auth/verify-email?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirect)}`;

    const sent = await sendMagicLinkEmail(email, link).catch(() => false);
    if (!sent) {
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
        res.status(500).json({ success: false, error: isMailConfigured() ? 'MAIL_SEND_FAILED' : 'MAIL_NOT_CONFIGURED' });
        return;
      }
      res.json({ success: true, data: { link, token } });
      return;
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'REGISTER_FAILED' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const token = String((req.body as any)?.token || '').trim();
    if (!token || token.length < 16) {
      res.status(400).json({ success: false, error: 'INVALID_TOKEN' });
      return;
    }
    const tokenHash = sha256Hex(token);
    const record = await PublicAuthTokenModel.findOne({ where: { token_hash: tokenHash } });
    if (!record) {
      res.status(401).json({ success: false, error: 'TOKEN_NOT_FOUND' });
      return;
    }
    if (String((record as any).get('purpose') || '') !== 'verify_email') {
      res.status(401).json({ success: false, error: 'TOKEN_PURPOSE_INVALID' });
      return;
    }
    if ((record as any).get('used_at')) {
      res.status(401).json({ success: false, error: 'TOKEN_USED' });
      return;
    }
    const expiresAt = (record as any).get('expires_at') as Date;
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      res.status(401).json({ success: false, error: 'TOKEN_EXPIRED' });
      return;
    }

    await (record as any).update({ used_at: new Date() });
    const userId = (record as any).get('user_id');
    const user = await PublicUserModel.findByPk(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
      return;
    }

    await (user as any).update({ email_verified_at: new Date() });
    (req.session as any).publicUserId = userId;
    res.json({ success: true, data: (user as any).toJSON() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'VERIFY_EMAIL_FAILED' });
  }
};

export const loginWithPassword = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail((req.body as any)?.email);
    const password = String((req.body as any)?.password || '');
    if (!email || !email.includes('@') || !password) {
      res.status(400).json({ success: false, error: 'INVALID_CREDENTIALS' });
      return;
    }
    const user = await PublicUserModel.findOne({ where: { email } as any });
    if (!user) {
      res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS' });
      return;
    }
    const hash = (user as any).get('password_hash') as any;
    if (!hash) {
      res.status(401).json({ success: false, error: 'PASSWORD_NOT_SET' });
      return;
    }
    const ok = await bcrypt.compare(password, String(hash));
    if (!ok) {
      res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS' });
      return;
    }
    if (!(user as any).get('email_verified_at')) {
      res.status(403).json({ success: false, error: 'EMAIL_NOT_VERIFIED' });
      return;
    }
    (req.session as any).publicUserId = (user as any).get('id');
    res.json({ success: true, data: (user as any).toJSON() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'LOGIN_FAILED' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail((req.body as any)?.email);
    const redirect = typeof (req.body as any)?.redirectUrl === 'string' ? (req.body as any).redirectUrl : '/';

    res.json({ success: true });

    if (!email || !email.includes('@') || email.length > 254) return;
    const user = await PublicUserModel.findOne({ where: { email } as any });
    if (!user) return;
    if (!(user as any).get('email_verified_at')) return;
    if (!(user as any).get('password_hash')) return;

    const token = generateToken();
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + resetTokenTtlMs);
    await PublicAuthTokenModel.create({
      user_id: (user as any).get('id'),
      purpose: 'reset_password',
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: new Date(),
    } as any);

    const origin = process.env.PUBLIC_APP_ORIGIN || 'http://localhost:5173';
    const link = `${origin.replace(/\/$/, '')}/auth/reset-password?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirect)}`;
    await sendMagicLinkEmail(email, link).catch(() => false);
  } catch {
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const token = String((req.body as any)?.token || '').trim();
    const password = String((req.body as any)?.password || '');
    if (!token || token.length < 16) {
      res.status(400).json({ success: false, error: 'INVALID_TOKEN' });
      return;
    }
    if (!password || password.length < 8 || password.length > 72) {
      res.status(400).json({ success: false, error: 'INVALID_PASSWORD' });
      return;
    }
    const tokenHash = sha256Hex(token);
    const record = await PublicAuthTokenModel.findOne({ where: { token_hash: tokenHash } });
    if (!record) {
      res.status(401).json({ success: false, error: 'TOKEN_NOT_FOUND' });
      return;
    }
    if (String((record as any).get('purpose') || '') !== 'reset_password') {
      res.status(401).json({ success: false, error: 'TOKEN_PURPOSE_INVALID' });
      return;
    }
    if ((record as any).get('used_at')) {
      res.status(401).json({ success: false, error: 'TOKEN_USED' });
      return;
    }
    const expiresAt = (record as any).get('expires_at') as Date;
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      res.status(401).json({ success: false, error: 'TOKEN_EXPIRED' });
      return;
    }

    await (record as any).update({ used_at: new Date() });
    const userId = (record as any).get('user_id');
    const user = await PublicUserModel.findByPk(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await (user as any).update({ password_hash: passwordHash });
    (req.session as any).publicUserId = userId;
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || 'RESET_PASSWORD_FAILED' });
  }
};
