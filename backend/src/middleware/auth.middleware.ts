import { Request, Response, NextFunction } from 'express';
import { AdminUserModel } from '../models/index.js';
import { getAdminPermissionCandidates } from '../constants/admin-permissions.js';
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

const canAccessPermission = async (username: string, permission: string): Promise<boolean> => {
  const enforcer = await getEnforcer();
  for (const candidate of getAdminPermissionCandidates(permission)) {
    const ok = await enforcer.enforce(username, candidate, 'access');
    if (ok) return true;
  }
  return false;
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
        const ok = await canAccessPermission(user.username, permission);
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

export const requireAnyPermission = (perms: string | string[]) => {
  const required = Array.isArray(perms) ? perms : [perms];
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        const ok = await canAccessPermission(user.username, permission);
        if (ok) {
          next();
          return;
        }
      }
      res.status(403).json({ success: false, error: 'Forbidden' });
    } catch (err) {
      next(err);
    }
  };
};
