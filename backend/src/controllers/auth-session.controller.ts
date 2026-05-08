import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { AdminMenuModel, AdminUserModel } from '../models/index.js';
import { getEnforcer } from '../rbac/enforcer.js';
import { normalizeAdminPermissionCodes } from '../constants/admin-permissions.js';
import { getSessionCookieOptions, sessionCookieName } from '../config/session.js';

const serializeMenus = async (username: string, permissions: Set<string>) => {
  const allowAll = permissions.has('*');
  const rows = await AdminMenuModel.findAll({ order: [['sort', 'ASC'], ['created_at', 'ASC']] });
  const menus = rows
    .map(r => r.toJSON() as any)
    .filter(m => {
      if (!m.permission) return true;
      return allowAll ? true : permissions.has(String(m.permission));
    })
    .map(m => ({
      id: m.id,
      label: m.label,
      path: m.path,
      icon: m.icon,
      parentId: m.parent_id,
      sort: m.sort,
      permission: m.permission,
    }));
  return menus;
};

const buildMePayload = async (username: string) => {
  const enforcer = await getEnforcer();
  const roles = await enforcer.getRolesForUser(username);
  const permissions = new Set<string>();

  for (const role of roles) {
    const perms = await enforcer.getPermissionsForUser(role);
    for (const p of perms) {
      const code = p?.[1];
      const act = p?.[2];
      if (act !== 'access') continue;
      if (typeof code === 'string' && code.length > 0) permissions.add(code);
    }
  }

  const normalizedPermissions = new Set(normalizeAdminPermissionCodes(permissions));

  const menus = await serializeMenus(username, normalizedPermissions);
  const user = await AdminUserModel.findOne({ where: { username } as any });
  const data = user?.toJSON ? (user.toJSON() as any) : null;
  return {
    username,
    email: data?.email ? String(data.email) : null,
    display_name: data?.display_name ? String(data.display_name) : null,
    avatar_url: data?.avatar_url ? String(data.avatar_url) : null,
    notification_preferences: data?.notification_preferences || { staging: true, submission: true, error: true, crawler: true },
    roles,
    permissions: Array.from(normalizedPermissions),
    menus,
  };
};

export const login = async (req: Request, res: Response) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    res.status(400).json({ success: false, error: '請輸入帳號和密碼', code: 'USERNAME_PASSWORD_REQUIRED' });
    return;
  }

  const user = await AdminUserModel.findOne({ where: { username } as any });
  if (!user) {
    res.status(401).json({ success: false, error: '帳號或密碼錯誤，請重新輸入', code: 'INVALID_CREDENTIALS' });
    return;
  }

  const data = user.toJSON() as any;
  if (!data.is_active) {
    res.status(401).json({ success: false, error: '此帳號已被停用，請聯繫管理員', code: 'ACCOUNT_DISABLED' });
    return;
  }

  const ok = await bcrypt.compare(password, String(data.password_hash || ''));
  if (!ok) {
    res.status(401).json({ success: false, error: '帳號或密碼錯誤，請重新輸入', code: 'INVALID_CREDENTIALS' });
    return;
  }

  req.session.userId = String(data.id);
  req.session.username = String(data.username);

  const payload = await buildMePayload(String(data.username));
  res.json({ success: true, data: payload });
};

export const logout = async (req: Request, res: Response) => {
  const destroy = () =>
    new Promise<void>((resolve) => {
      req.session.destroy(() => resolve());
    });

  await destroy();
  const opts = getSessionCookieOptions();
  res.clearCookie(sessionCookieName, {
    domain: opts.domain,
    path: '/',
  });
  res.json({ success: true, data: true });
};

export const me = async (req: Request, res: Response) => {
  const username = req.session.username;
  if (typeof username !== 'string') {
    res.status(401).json({ success: false, error: '請先登入後再操作', code: 'Unauthorized' });
    return;
  }
  const payload = await buildMePayload(username);
  res.json({ success: true, data: payload });
};

const normalizeOptionalString = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
};

export const updateMeProfile = async (req: Request, res: Response) => {
  const userId = req.session.userId;
  const username = req.session.username;
  if (typeof userId !== 'string' || typeof username !== 'string') {
    res.status(401).json({ success: false, error: '請先登入後再操作', code: 'Unauthorized' });
    return;
  }

  const email = normalizeOptionalString(req.body?.email);
  const displayName = normalizeOptionalString(req.body?.display_name);
  const avatarUrl = normalizeOptionalString(req.body?.avatar_url);

  const update: any = {};
  if (req.body && 'email' in req.body) update.email = email;
  if (req.body && 'display_name' in req.body) update.display_name = displayName;
  if (req.body && 'avatar_url' in req.body) update.avatar_url = avatarUrl;

  if (Object.keys(update).length === 0) {
    res.status(400).json({ success: false, error: '沒有可更新的資料', code: 'NO_FIELDS_TO_UPDATE' });
    return;
  }

  const user = await AdminUserModel.findOne({ where: { id: userId, username } as any });
  if (!user) {
    res.status(401).json({ success: false, error: '請先登入後再操作', code: 'Unauthorized' });
    return;
  }

  await user.update(update as any);
  const payload = await buildMePayload(username);
  res.json({ success: true, data: payload });
};

export const updateNotificationPreferences = async (req: Request, res: Response) => {
  const userId = req.session.userId;
  const username = req.session.username;
  if (typeof userId !== 'string' || typeof username !== 'string') {
    res.status(401).json({ success: false, error: '請先登入後再操作', code: 'Unauthorized' });
    return;
  }

  const prefs = req.body;
  if (!prefs || typeof prefs !== 'object') {
    res.status(400).json({ success: false, error: '通知偏好設定格式不正確', code: 'INVALID_PREFERENCES' });
    return;
  }

  const allowedKeys = new Set(['staging', 'submission', 'error', 'crawler']);
  const sanitized: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(prefs)) {
    if (allowedKeys.has(key) && typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }

  if (Object.keys(sanitized).length === 0) {
    res.status(400).json({ success: false, error: '沒有有效的通知偏好設定', code: 'NO_VALID_PREFERENCES' });
    return;
  }

  const user = await AdminUserModel.findOne({ where: { id: userId, username } as any });
  if (!user) {
    res.status(401).json({ success: false, error: '請先登入後再操作', code: 'Unauthorized' });
    return;
  }

  const current = (user.toJSON() as any).notification_preferences || {};
  const merged = { ...current, ...sanitized };
  await user.update({ notification_preferences: merged } as any);

  const payload = await buildMePayload(username);
  res.json({ success: true, data: payload });
};
