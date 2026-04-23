import { Router } from 'express';
import { getUnorganizedFanarts, updateFanartStatus } from '../controllers/fanart.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/unorganized', requireAdmin, getUnorganizedFanarts);
router.post('/:id/status', requireAdmin, updateFanartStatus);

export default router;
