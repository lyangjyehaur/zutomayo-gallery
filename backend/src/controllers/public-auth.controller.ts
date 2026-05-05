import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PublicAuthTokenModel, PublicUserModel } from '../models/index.js';
import { generateToken, sha256Hex } from '../utils/submission.js';
import { isMailConfiguredFor, sendAuthLinkEmail, sendMagicLinkEmail } from '../services/mail.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import {
  requestMagicLinkSchema,
  verifyMagicLinkSchema,
  registerSchema,
  loginWithPasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  updateMeSchema,
} from '../validators/public-auth.validator.js';

const magicTokenTtlMs = 15 * 60 * 1000;
const verifyTokenTtlMs = 60 * 60 * 1000;
const resetTokenTtlMs = 60 * 60 * 1000;

const normalizeEmail = (email: string) => String(email || '').trim().toLowerCase();

export const requestMagicLink = async (req: Request, res: Response) => {
  const parsed = requestMagicLinkSchema.parse(req.body);
  const email = normalizeEmail(parsed.email);
  if (!email || !email.includes('@') || email.length > 254) {
    throw new AppError(400, 'INVALID_EMAIL');
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
  const redirect = parsed.redirectUrl || '/';
  const link = `${origin.replace(/\/$/, '')}/auth/magic?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirect)}`;

  const sent = await sendMagicLinkEmail(email, link).catch(() => false);

  if (!sent) {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      throw new AppError(500, isMailConfiguredFor(email) ? 'MAIL_SEND_FAILED' : 'MAIL_NOT_CONFIGURED');
    }
    logger.warn({ email }, 'Magic link email not sent in dev mode; returning link in response');
    res.json({ success: true, data: { link, token } });
    return;
  }

  res.json({ success: true });
};

export const verifyMagicLink = async (req: Request, res: Response) => {
  const parsed = verifyMagicLinkSchema.parse(req.body);
  const token = parsed.token;

  const tokenHash = sha256Hex(token);
  const record = await PublicAuthTokenModel.findOne({ where: { token_hash: tokenHash } });
  if (!record) {
    throw new AppError(401, 'TOKEN_NOT_FOUND');
  }
  if (String((record as any).get('purpose') || 'login') !== 'login') {
    throw new AppError(401, 'TOKEN_PURPOSE_INVALID');
  }

  if ((record as any).get('used_at')) {
    throw new AppError(401, 'TOKEN_USED');
  }

  const expiresAt = (record as any).get('expires_at') as Date;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    throw new AppError(401, 'TOKEN_EXPIRED');
  }

  await (record as any).update({ used_at: new Date() });

  const userId = (record as any).get('user_id');
  (req.session as any).publicUserId = userId;

  const user = await PublicUserModel.findByPk(userId);
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND');
  }

  res.json({ success: true, data: user.toJSON() });
};

export const me = async (req: Request, res: Response) => {
  const userId = (req.session as any)?.publicUserId;
  if (!userId) {
    res.json({ success: true, data: null });
    return;
  }
  const user = await PublicUserModel.findByPk(userId);
  res.json({ success: true, data: user ? user.toJSON() : null });
};

export const logout = async (req: Request, res: Response) => {
  if (req.session) {
    (req.session as any).publicUserId = undefined;
  }
  res.json({ success: true });
};

export const updateMe = async (req: Request, res: Response) => {
  const parsed = updateMeSchema.parse(req.body);
  const userId = (req.session as any)?.publicUserId;
  if (!userId) {
    throw new AppError(401, 'PUBLIC_UNAUTHORIZED');
  }

  const user = await PublicUserModel.findByPk(userId);
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND');
  }

  const update: any = {};

  if (typeof parsed.display_name === 'string') {
    const v = parsed.display_name.trim();
    update.display_name = v.slice(0, 64);
  }

  if (parsed.social_links && typeof parsed.social_links === 'object' && !Array.isArray(parsed.social_links)) {
    const allowedKeys = ['x', 'instagram', 'pixiv', 'youtube', 'website'];
    const next: any = {};
    allowedKeys.forEach((k) => {
      const val = (parsed.social_links as any)[k];
      if (typeof val === 'string') {
        const s = val.trim();
        if (s) next[k] = s.slice(0, 200);
      }
    });
    update.social_links = next;
  }

  if (typeof parsed.public_profile_enabled === 'boolean') {
    update.public_profile_enabled = parsed.public_profile_enabled;
  }

  if (parsed.public_profile_fields && typeof parsed.public_profile_fields === 'object' && !Array.isArray(parsed.public_profile_fields)) {
    const next = {
      display_name: Boolean(parsed.public_profile_fields.display_name),
      socials: Boolean(parsed.public_profile_fields.socials),
      email_masked: Boolean(parsed.public_profile_fields.email_masked),
    };
    update.public_profile_fields = next;
  }

  await (user as any).update(update);

  res.json({ success: true, data: (user as any).toJSON() });
};

export const register = async (req: Request, res: Response) => {
  const parsed = registerSchema.parse(req.body);
  const email = normalizeEmail(parsed.email);
  const password = parsed.password;
  const displayName = typeof parsed.display_name === 'string' ? parsed.display_name.trim() : '';

  if (!email || !email.includes('@') || email.length > 254) {
    throw new AppError(400, 'INVALID_EMAIL');
  }

  const existing = await PublicUserModel.findOne({ where: { email } as any });
  if (existing && (existing as any).get('password_hash')) {
    throw new AppError(409, 'EMAIL_ALREADY_REGISTERED');
  }

  const passwordHash = await bcrypt.hash(password, 12);
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
  const redirect = parsed.redirectUrl || '/';
  const link = `${origin.replace(/\/$/, '')}/auth/verify-email?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirect)}`;

  const sent = await sendAuthLinkEmail(email, { purpose: 'verify_email', link }).catch(() => false);
  if (!sent) {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      throw new AppError(500, isMailConfiguredFor(email) ? 'MAIL_SEND_FAILED' : 'MAIL_NOT_CONFIGURED');
    }
    logger.warn({ email }, 'Verification email not sent in dev mode; returning link in response');
    res.json({ success: true, data: { link, token } });
    return;
  }

  res.json({ success: true });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const parsed = verifyEmailSchema.parse(req.body);
  const token = parsed.token;
  const tokenHash = sha256Hex(token);
  const record = await PublicAuthTokenModel.findOne({ where: { token_hash: tokenHash } });
  if (!record) {
    throw new AppError(401, 'TOKEN_NOT_FOUND');
  }
  if (String((record as any).get('purpose') || '') !== 'verify_email') {
    throw new AppError(401, 'TOKEN_PURPOSE_INVALID');
  }
  if ((record as any).get('used_at')) {
    throw new AppError(401, 'TOKEN_USED');
  }
  const expiresAt = (record as any).get('expires_at') as Date;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    throw new AppError(401, 'TOKEN_EXPIRED');
  }

  await (record as any).update({ used_at: new Date() });
  const userId = (record as any).get('user_id');
  const user = await PublicUserModel.findByPk(userId);
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND');
  }

  await (user as any).update({ email_verified_at: new Date() });
  (req.session as any).publicUserId = userId;
  res.json({ success: true, data: (user as any).toJSON() });
};

export const loginWithPassword = async (req: Request, res: Response) => {
  const parsed = loginWithPasswordSchema.parse(req.body);
  const email = normalizeEmail(parsed.email);
  const password = parsed.password;
  if (!email || !email.includes('@') || !password) {
    throw new AppError(400, 'INVALID_CREDENTIALS');
  }
  const user = await PublicUserModel.findOne({ where: { email } as any });
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS');
  }
  const hash = (user as any).get('password_hash') as any;
  if (!hash) {
    throw new AppError(401, 'PASSWORD_NOT_SET');
  }
  const ok = await bcrypt.compare(password, String(hash));
  if (!ok) {
    throw new AppError(401, 'INVALID_CREDENTIALS');
  }
  if (!(user as any).get('email_verified_at')) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED');
  }
  (req.session as any).publicUserId = (user as any).get('id');
  res.json({ success: true, data: (user as any).toJSON() });
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const parsed = requestPasswordResetSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);
    const redirect = parsed.redirectUrl || '/';

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
    await sendAuthLinkEmail(email, { purpose: 'reset_password', link }).catch(() => false);
  } catch (error) {
    logger.error({ err: error }, 'requestPasswordReset failed');
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const parsed = resetPasswordSchema.parse(req.body);
  const token = parsed.token;
  const password = parsed.password;
  const tokenHash = sha256Hex(token);
  const record = await PublicAuthTokenModel.findOne({ where: { token_hash: tokenHash } });
  if (!record) {
    throw new AppError(401, 'TOKEN_NOT_FOUND');
  }
  if (String((record as any).get('purpose') || '') !== 'reset_password') {
    throw new AppError(401, 'TOKEN_PURPOSE_INVALID');
  }
  if ((record as any).get('used_at')) {
    throw new AppError(401, 'TOKEN_USED');
  }
  const expiresAt = (record as any).get('expires_at') as Date;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    throw new AppError(401, 'TOKEN_EXPIRED');
  }

  await (record as any).update({ used_at: new Date() });
  const userId = (record as any).get('user_id');
  const user = await PublicUserModel.findByPk(userId);
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await (user as any).update({ password_hash: passwordHash });
  (req.session as any).publicUserId = userId;
  res.json({ success: true });
};
