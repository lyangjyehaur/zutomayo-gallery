import { Router } from 'express';
import { getSystemStatus, toggleMaintenance, getClientGeo, getDictionaries, updateDictionaries, clearRedisApiCache } from '../controllers/system.controller.js';
import { syncImagesToR2 } from '../controllers/r2.controller.js';
import { rebuildR2 } from '../controllers/r2_rebuild.js';
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

// Admin: Get dictionaries
router.get('/dicts', getDictionaries);

// Admin: Update dictionaries
router.post('/dicts', requireAdmin, updateDictionaries);

router.post('/cache/clear', requireAdmin, clearRedisApiCache);

// Admin: Sync existing Twitter images to R2 Bucket
router.post('/r2-sync', requireR2SyncAuth, syncImagesToR2);

router.post('/r2-rebuild', requireR2SyncAuth, rebuildR2);

// Public: Get signed image proxy URL and redirect
router.get('/image/proxy', (req, res) => {
  const { url, mode, filename } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }
  
  const salt = process.env.IMGPROXY_SALT;
  const key = process.env.IMGPROXY_KEY;
  const imgProxyDomain = (process.env.IMGPROXY_URL || 'https://img.ztmr.club').replace(/\/$/, '');
  
  const safeBase64 = (str: string) => Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const base64Url = safeBase64(url);
  
  let paramsArr: string[] = [];
  if (mode === 'raw') {
    paramsArr.push('raw:1', 'return_attachment:1');
    if (filename && typeof filename === 'string') {
      // 當使用 raw:1 時，imgproxy 不會處理圖片，也不會自動推斷並補上副檔名。
      // 因此必須將完整帶有副檔名的檔名 (.jpg) 傳給 imgproxy，否則下載下來的檔案會沒有副檔名，導致系統無法識別為圖片。
      paramsArr.push(`filename:${safeBase64(filename)}:1`);
    }
  } else if (mode === 'full') {
    paramsArr.push('w:1002', 'f:webp');
  } else if (mode === 'small') {
    paramsArr.push('w:602', 'f:webp');
  } else if (mode === 'thumb_general') {
    paramsArr.push('w:402', 'f:webp'); // General gallery thumb
  } else {
    // 瀑布流小圖，預設 mode === 'thumb' (for Apple Music)
    paramsArr.push('w:302', 'f:webp');
  }

  const path = `/${paramsArr.join('/')}/${base64Url}`;
  
  if (!salt || !key) {
    return res.status(500).json({ error: 'Server configuration error: Missing IMGPROXY_SALT or IMGPROXY_KEY. Insecure mode is disabled.' });
  }

  import('crypto').then((crypto) => {
    const hmac = crypto.createHmac('sha256', Buffer.from(key, 'hex'));
    const saltBuf = Buffer.from(salt, 'hex');
    hmac.update(saltBuf);
    hmac.update(path);
    const signature = hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    res.redirect(302, `${imgProxyDomain}/${signature}${path}`);
  }).catch(err => {
    res.status(500).json({ error: 'crypto error' });
  });
});

export default router;
