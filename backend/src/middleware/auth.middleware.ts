import { Request, Response, NextFunction } from 'express';
import { AdminUserModel } from '../models/index.js';
import { getAdminPermissionCandidates } from '../constants/admin-permissions.js';
import { cachedEnforce, cachedGetRolesForUser } from '../rbac/enforcer.js';

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
  for (const candidate of getAdminPermissionCandidates(permission)) {
    const ok = await cachedEnforce(username, candidate, 'access');
    if (ok) return true;
  }
  return false;
};

/**
 * 認證中間件：驗證 session 中的用戶資訊並檢查用戶是否仍有效
 * 成功時將用戶資訊掛到 req.user，否則返回 401
 */
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

/**
 * 內部認證邏輯（不調用 next），供 requireAdmin/requirePermission 組合使用
 * 返回 AuthedUser 或 null（null 表示已發送 401 響應）
 */
const authenticateUser = async (req: Request, res: Response): Promise<AuthedUser | null> => {
  const userId = (req.session as any)?.userId;
  const username = (req.session as any)?.username;
  if (typeof userId !== 'string' || typeof username !== 'string') {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }

  const user = await AdminUserModel.findOne({ where: { id: userId, username } as any });
  if (!user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }

  const data = user.toJSON() as any;
  if (!data.is_active) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return null;
  }

  const authedUser = { id: String(data.id), username: String(data.username) };
  setReqUser(req, authedUser);
  return authedUser;
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authenticateUser(req, res);
    if (!user) return; // authenticateUser 已發送 401

    const roles = await cachedGetRolesForUser(user.username);
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
    try {
      const user = await authenticateUser(req, res);
      if (!user) return; // authenticateUser 已發送 401

      const roles = await cachedGetRolesForUser(user.username);
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
    try {
      const user = await authenticateUser(req, res);
      if (!user) return; // authenticateUser 已發送 401

      const roles = await cachedGetRolesForUser(user.username);
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
