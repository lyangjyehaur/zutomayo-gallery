import { Router } from 'express';
import { getUnorganizedFanarts, getDeletedFanarts, getLegacyFanarts, getFanartGallery, getFanartGallerySummary, getFanartsByTag, getFanartTagSummary, updateFanartStatus, assignFanartMedia, syncFanartMedia, removeFanartMediaFromMv } from '../controllers/fanart.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

const router = Router();

router.get('/gallery', cacheMiddleware(300), getFanartGallery);
router.get('/gallery/summary', cacheMiddleware(300), getFanartGallerySummary);
router.get('/unorganized', requireAdmin, getUnorganizedFanarts);
router.get('/deleted', requireAdmin, getDeletedFanarts);
router.get('/legacy', requireAdmin, getLegacyFanarts);
router.get('/by-tag/:tagId', requireAdmin, getFanartsByTag);
router.get('/tag-summary', requireAdmin, getFanartTagSummary);
router.post('/:id/status', requireAdmin, updateFanartStatus);
router.post('/media/:mediaId/assign', requireAdmin, assignFanartMedia);
router.post('/media/:mediaId/sync', requireAdmin, syncFanartMedia);
router.post('/media/:mediaId/remove-mv', requireAdmin, removeFanartMediaFromMv);

export default router;
