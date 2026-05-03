import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { authService } from '../services/auth.service.js';
import { AdminUserModel } from '../models/index.js';
import { getEnforcer } from '../rbac/enforcer.js';

type AuthedUser = { id: string; username: string };

const setReqUser = (req: Request, user: AuthedUser) => {
  (req as any).user = user;
};

const getReqUser = (req: Request): AuthedUser | null => {
  const u = (req as any).user;
  if (!u || typeof u !== 'object') return null;
  if (typeof u.id !== 'string' || typeof u.username !== 'string') return null;
  return u as AuthedUser;
};

export const checkLegacyAdminHeader = async (req: Request): Promise<boolean> => {
  const password = req.headers['x-admin-password'];
  if (typeof password !== 'string') return false;

  if (await authService.isValidSessionToken(password)) return true;

  if (!isLegacyAdminAllowed()) return false;

  const storedPassword = await authService.getPassword();
  if (!storedPassword) {
    const expectedPassword = process.env.ADMIN_PASSWORD || 'zutomayo';
    return password === expectedPassword;
  }

  return bcrypt.compare(password, storedPassword);
};

export const isLegacyAdminAllowed = () => {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_LEGACY_ADMIN_HEADER === 'true';
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = (req.session as any)?.userId;
  const username = (req.session as any)?.username;
  if (typeof userId !== 'string' || typeof username !== 'string') {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const user = await AdminUserModel.findOne({ where: { id: userId, username } as any });
  if (!user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const data = user.toJSON() as any;
  if (!data.is_active) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  setReqUser(req, { id: String(data.id), username: String(data.username) });
  next();
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (await checkLegacyAdminHeader(req)) {
    setReqUser(req, { id: 'legacy', username: 'legacy' });
    next();
    return;
  }

  await requireAuth(req, res, async (err?: any) => {
    if (err) next(err);
  });
  const user = getReqUser(req);
  if (!user) return;

  try {
    const enforcer = await getEnforcer();
    const roles = await enforcer.getRolesForUser(user.username);
    if (!roles.includes('role:super_admin')) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const requirePermission = (perms: string | string[]) => {
  const required = Array.isArray(perms) ? perms : [perms];
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (await checkLegacyAdminHeader(req)) {
      setReqUser(req, { id: 'legacy', username: 'legacy' });
      next();
      return;
    }

    await requireAuth(req, res, async (err?: any) => {
      if (err) next(err);
    });
    const user = getReqUser(req);
    if (!user) return;

    try {
      const enforcer = await getEnforcer();
      const roles = await enforcer.getRolesForUser(user.username);
      if (roles.includes('role:super_admin')) {
        next();
        return;
      }
      for (const permission of required) {
        const ok = await enforcer.enforce(user.username, permission, 'access');
        if (!ok) {
          res.status(403).json({ success: false, error: 'Forbidden' });
          return;
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};
