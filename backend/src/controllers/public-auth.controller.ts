import type { Request, Response } from 'express';
import { PublicAuthTokenModel, PublicUserModel } from '../models/index.js';
import { generateToken, sha256Hex } from '../utils/submission.js';
import { isMailConfigured, sendMagicLinkEmail } from '../services/mail.service.js';

const magicTokenTtlMs = 15 * 60 * 1000;

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

