import { Router } from 'express';
import {
  createDictionary,
  deleteDictionary,
  getClientGeo,
  getDictionaries,
  getSystemStatus,
  patchDictionary,
  saveGeoRaw,
  toggleMaintenance,
  updateDictionaries,
  clearRedisApiCache,
  listErrorLogs,
  resolveErrorLog,
  batchResolveErrorLogs,
  createSpeedSurvey,
} from '../controllers/system.controller.js';
import { assignOrphanMediaGroup, listOrphanMedia, unassignOrphanMediaGroup } from '../controllers/media-orphans.controller.js';
import { getMediaGroup, listMediaGroups, listRepairMediaGroups, mergeMediaGroups, syncMediaRelations, unassignMediaGroup, updateMediaGroup, previewReparseTwitter, applyReparseTwitter } from '../controllers/media-groups.controller.js';
import { createAnnouncement, deleteAnnouncement, listAnnouncements, updateAnnouncement, updateAnnouncementOrder } from '../controllers/announcements.controller.js';
import { syncImagesToR2 } from '../controllers/r2.controller.js';
import { rebuildR2 } from '../controllers/r2_rebuild.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requireAnyPermission, requirePermission } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { errorEventEmitter } from '../services/error-events.service.js';

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

const requireR2SyncAuth = (permissionCode: string) => {
  const requirePerm = requirePermission(permissionCode);
  return asyncHandler(async (req: any, res: any, next: any): Promise<void> => {
    const token = req.headers['x-r2-sync-token'];
    const expected = process.env.R2_SYNC_TOKEN;
    if (typeof token === 'string' && expected && token === expected) {
      const ip = getClientIp(req);
      if (isPrivateIp(ip)) {
        next();
        return;
      }
      res.status(403).json({ success: false, message: '您沒有權限執行此操作' });
      return;
    }
    await requirePerm(req, res, next);
  });
};

// Public: Get system status (maintenance mode)
router.get('/status', asyncHandler(getSystemStatus));

// Public: Get client geo location info
router.get('/geo', asyncHandler(getClientGeo));

router.post('/geo/raw', asyncHandler(saveGeoRaw));

// Admin: Toggle maintenance mode
router.put('/maintenance', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MAINTENANCE), asyncHandler(toggleMaintenance));

// Admin: Get dictionaries
router.get('/dicts', asyncHandler(getDictionaries));

// Admin: Update dictionaries
router.post('/dicts', requirePermission(ADMIN_PERMISSIONS.SYSTEM_DICTS), asyncHandler(updateDictionaries));
router.post('/dicts/create', requirePermission(ADMIN_PERMISSIONS.SYSTEM_DICTS), asyncHandler(createDictionary));
router.patch('/dicts/:id', requirePermission(ADMIN_PERMISSIONS.SYSTEM_DICTS), asyncHandler(patchDictionary));
router.delete('/dicts/:id', requirePermission(ADMIN_PERMISSIONS.SYSTEM_DICTS), asyncHandler(deleteDictionary));

router.post('/cache/clear', requirePermission(ADMIN_PERMISSIONS.SYSTEM_CACHE), asyncHandler(clearRedisApiCache));

router.get('/errors', requirePermission(ADMIN_PERMISSIONS.SYSTEM_CACHE), asyncHandler(listErrorLogs));
router.patch('/errors/:id/resolve', requirePermission(ADMIN_PERMISSIONS.SYSTEM_CACHE), asyncHandler(resolveErrorLog));
router.post('/errors/batch-resolve', requirePermission(ADMIN_PERMISSIONS.SYSTEM_CACHE), asyncHandler(batchResolveErrorLogs));

const requireMediaToolPermission = requireAnyPermission([
  ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS,
  ADMIN_PERMISSIONS.SYSTEM_MEDIA_ORPHANS,
]);

router.get('/media/orphans', requireMediaToolPermission, asyncHandler(listOrphanMedia));
router.post('/media/orphans/:mediaId/assign', requireMediaToolPermission, asyncHandler(assignOrphanMediaGroup));
router.post('/media/orphans/:mediaId/unassign', requireMediaToolPermission, asyncHandler(unassignOrphanMediaGroup));

router.get('/media/groups', requireMediaToolPermission, asyncHandler(listMediaGroups));
router.get('/media/groups/repair', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS), asyncHandler(listRepairMediaGroups));
router.post('/media/groups/reparse-twitter/preview', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS), asyncHandler(previewReparseTwitter));
router.post('/media/groups/reparse-twitter/apply', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS), asyncHandler(applyReparseTwitter));
router.get('/media/groups/:id', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS), asyncHandler(getMediaGroup));
router.put('/media/groups/:id', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS), asyncHandler(updateMediaGroup));
router.post('/media/groups/:id/merge', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS), asyncHandler(mergeMediaGroups));
router.post('/media/groups/:id/unassign', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS), asyncHandler(unassignMediaGroup));
router.post('/media/:mediaId/relations/sync', requirePermission(ADMIN_PERMISSIONS.SYSTEM_MEDIA_GROUPS), asyncHandler(syncMediaRelations));

router.get('/announcements', requirePermission(ADMIN_PERMISSIONS.SYSTEM_ANNOUNCEMENTS), asyncHandler(listAnnouncements));
router.post('/announcements', requirePermission(ADMIN_PERMISSIONS.SYSTEM_ANNOUNCEMENTS), asyncHandler(createAnnouncement));
router.put('/announcements/order', requirePermission(ADMIN_PERMISSIONS.SYSTEM_ANNOUNCEMENTS), asyncHandler(updateAnnouncementOrder));
router.put('/announcements/:id', requirePermission(ADMIN_PERMISSIONS.SYSTEM_ANNOUNCEMENTS), asyncHandler(updateAnnouncement));
router.delete('/announcements/:id', requirePermission(ADMIN_PERMISSIONS.SYSTEM_ANNOUNCEMENTS), asyncHandler(deleteAnnouncement));

// Admin: Sync existing Twitter images to R2 Bucket
router.post('/r2-sync', requireR2SyncAuth(ADMIN_PERMISSIONS.SYSTEM_R2), asyncHandler(syncImagesToR2));

router.post('/r2-rebuild', requireR2SyncAuth(ADMIN_PERMISSIONS.SYSTEM_R2), asyncHandler(rebuildR2));

// Public: Submit speed survey
router.post('/survey', asyncHandler(createSpeedSurvey));

// Public: Get signed image proxy URL and redirect
router.get('/image/proxy', (req, res) => {
  const { url, mode, filename } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: '請提供圖片網址' });
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
    return res.status(500).json({ error: '圖片處理服務設定不完整' });
  }

  import('crypto').then((crypto) => {
    const hmac = crypto.createHmac('sha256', Buffer.from(key, 'hex'));
    const saltBuf = Buffer.from(salt, 'hex');
    hmac.update(saltBuf);
    hmac.update(path);
    const signature = hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    res.redirect(302, `${imgProxyDomain}/${signature}${path}`);
  }).catch(err => {
    errorEventEmitter.emitError({
      source: 'request',
      message: `Image proxy crypto error: ${err instanceof Error ? err.message : String(err)}`,
      stack: err instanceof Error ? err.stack : undefined,
      statusCode: 500,
      method: 'GET',
      url: req.originalUrl,
    });
    res.status(500).json({ error: 'crypto error' });
  });
});

export default router;
