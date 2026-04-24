import { Router } from 'express';
import { getSystemStatus, toggleMaintenance, getClientGeo } from '../controllers/system.controller.js';
import { syncImagesToR2 } from '../controllers/r2.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

const getClientIp = (req: any): string => {
  const raw = (req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip || '') as string;
  const first = raw.includes(',') ? raw.split(',')[0].trim() : raw;
  return first.startsWith('::ffff:') ? first.replace('::ffff:', '') : first;
};

const isPrivateIp = (ip: string): boolean => {
  if (!ip) return false;
  if (ip === '127.0.0.1' || ip === '::1') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  return false;
};

const requireR2SyncAuth = async (req: any, res: any, next: any): Promise<void> => {
  const token = req.headers['x-r2-sync-token'];
  const expected = process.env.R2_SYNC_TOKEN;
  if (typeof token === 'string' && expected && token === expected) {
    const ip = getClientIp(req);
    if (isPrivateIp(ip)) {
      next();
      return;
    }
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  await requireAdmin(req, res, next);
};

// Public: Get system status (maintenance mode)
router.get('/status', getSystemStatus);

// Public: Get client geo location info
router.get('/geo', getClientGeo);

// Admin: Toggle maintenance mode
router.put('/maintenance', requireAdmin, toggleMaintenance);

// Admin: Sync existing Twitter images to R2 Bucket
router.post('/r2-sync', requireR2SyncAuth, syncImagesToR2);

export default router;
