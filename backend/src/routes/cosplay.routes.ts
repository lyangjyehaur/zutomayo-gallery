import { Router } from 'express';
import { getUnorganizedFanarts, getDeletedFanarts, getLegacyFanarts, getFanartGallery, getFanartGallerySummary, getFanartsByTag, getFanartTagSummary, updateFanartStatus, assignFanartMedia, syncFanartMedia, removeFanartMediaFromMv } from '../controllers/fanart.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requirePermission } from '../middleware/auth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/gallery', cacheMiddleware(300), asyncHandler(getFanartGallery));
router.get('/gallery/summary', cacheMiddleware(300), asyncHandler(getFanartGallerySummary));
router.get('/unorganized', requirePermission(ADMIN_PERMISSIONS.COSPLAY), asyncHandler(getUnorganizedFanarts));
router.get('/deleted', requirePermission(ADMIN_PERMISSIONS.COSPLAY), asyncHandler(getDeletedFanarts));
router.get('/legacy', requirePermission(ADMIN_PERMISSIONS.COSPLAY), asyncHandler(getLegacyFanarts));
router.get('/by-tag/:tagId', requirePermission(ADMIN_PERMISSIONS.COSPLAY), asyncHandler(getFanartsByTag));
router.get('/tag-summary', requirePermission(ADMIN_PERMISSIONS.COSPLAY), asyncHandler(getFanartTagSummary));
router.post('/:id/status', requirePermission(ADMIN_PERMISSIONS.COSPLAY), asyncHandler(updateFanartStatus));
router.post('/media/:mediaId/assign', requirePermission(ADMIN_PERMISSIONS.COSPLAY), asyncHandler(assignFanartMedia));
router.post('/media/:mediaId/sync', requirePermission(ADMIN_PERMISSIONS.COSPLAY), asyncHandler(syncFanartMedia));
router.post('/media/:mediaId/remove-mv', requirePermission(ADMIN_PERMISSIONS.COSPLAY), asyncHandler(removeFanartMediaFromMv));

export default router;
