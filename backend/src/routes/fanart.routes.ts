import { Router } from 'express';
import { getUnorganizedFanarts, getDeletedFanarts, getLegacyFanarts, getFanartGallery, getFanartGallerySummary, getFanartsByTag, getFanartTagSummary, updateFanartStatus, assignFanartMedia, syncFanartMedia, removeFanartMediaFromMv } from '../controllers/fanart.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requirePermission } from '../middleware/auth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

const router = Router();

router.get('/gallery', cacheMiddleware(300), getFanartGallery);
router.get('/gallery/summary', cacheMiddleware(300), getFanartGallerySummary);
router.get('/unorganized', requirePermission(ADMIN_PERMISSIONS.FANARTS), getUnorganizedFanarts);
router.get('/deleted', requirePermission(ADMIN_PERMISSIONS.FANARTS), getDeletedFanarts);
router.get('/legacy', requirePermission(ADMIN_PERMISSIONS.FANARTS), getLegacyFanarts);
router.get('/by-tag/:tagId', requirePermission(ADMIN_PERMISSIONS.FANARTS), getFanartsByTag);
router.get('/tag-summary', requirePermission(ADMIN_PERMISSIONS.FANARTS), getFanartTagSummary);
router.post('/:id/status', requirePermission(ADMIN_PERMISSIONS.FANARTS), updateFanartStatus);
router.post('/media/:mediaId/assign', requirePermission(ADMIN_PERMISSIONS.FANARTS), assignFanartMedia);
router.post('/media/:mediaId/sync', requirePermission(ADMIN_PERMISSIONS.FANARTS), syncFanartMedia);
router.post('/media/:mediaId/remove-mv', requirePermission(ADMIN_PERMISSIONS.FANARTS), removeFanartMediaFromMv);

export default router;
