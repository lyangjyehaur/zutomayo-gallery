import { Request, Response } from 'express';
import { ADMIN_PERMISSION_CODES } from '../../constants/admin-permissions.js';

export const listAdminPermissions = async (_req: Request, res: Response) => {
  res.json({ success: true, data: ADMIN_PERMISSION_CODES });
};
