import { Request, Response } from 'express';

export const ADMIN_PERMISSION_CODES = [
  'admin:system:users',
  'admin:system:roles',
  'admin:system:menus',
  'admin:mvs',
  'admin:artists',
  'admin:albums',
  'admin:fanarts',
  'admin:staging-fanarts',
] as const;

export const listAdminPermissions = async (_req: Request, res: Response) => {
  res.json({ success: true, data: ADMIN_PERMISSION_CODES });
};

