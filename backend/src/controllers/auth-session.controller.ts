import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { AdminMenuModel, AdminUserModel } from '../models/index.js';
import { getEnforcer } from '../rbac/enforcer.js';
import { checkLegacyAdminHeader, isLegacyAdminAllowed } from '../middleware/auth.middleware.js';

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

  const menus = await serializeMenus(username, permissions);
  return {
    username,
    roles,
    permissions: Array.from(permissions),
    menus,
  };
};

export const login = async (req: Request, res: Response) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    res.status(400).json({ success: false, error: 'USERNAME_PASSWORD_REQUIRED' });
    return;
  }

  const user = await AdminUserModel.findOne({ where: { username } as any });
  if (!user) {
    res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS' });
    return;
  }

  const data = user.toJSON() as any;
  if (!data.is_active) {
    res.status(403).json({ success: false, error: 'USER_DISABLED' });
    return;
  }

  const ok = await bcrypt.compare(password, String(data.password_hash || ''));
  if (!ok) {
    res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS' });
    return;
  }

  (req.session as any).userId = String(data.id);
  (req.session as any).username = String(data.username);

  const payload = await buildMePayload(String(data.username));
  res.json({ success: true, data: payload });
};

export const logout = async (req: Request, res: Response) => {
  const destroy = () =>
    new Promise<void>((resolve) => {
      req.session.destroy(() => resolve());
    });

  await destroy();
  res.json({ success: true, data: true });
};

export const me = async (req: Request, res: Response) => {
  const username = (req.session as any)?.username;
  if (typeof username !== 'string') {
    if (isLegacyAdminAllowed() && (await checkLegacyAdminHeader(req))) {
      const payload = {
        username: 'legacy',
        roles: ['role:super_admin'],
        permissions: ['*'],
        menus: await serializeMenus('legacy', new Set(['*'])),
      };
      res.json({ success: true, data: payload });
      return;
    }
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  const payload = await buildMePayload(username);
  res.json({ success: true, data: payload });
};
