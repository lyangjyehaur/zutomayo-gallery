import { Router } from 'express';
import { getUnorganizedFanarts, updateFanartStatus, assignFanartMedia, removeFanartMediaFromMv } from '../controllers/fanart.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/unorganized', requireAdmin, getUnorganizedFanarts);
router.post('/:id/status', requireAdmin, updateFanartStatus);
router.post('/media/:mediaId/assign', requireAdmin, assignFanartMedia);
router.post('/media/:mediaId/remove-mv', requireAdmin, removeFanartMediaFromMv);

export default router;
