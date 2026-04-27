import { Router } from 'express';
import { getPendingStagingFanarts, approveStagingFanart, rejectStagingFanart, getProgress, triggerCrawler } from '../controllers/staging-fanart.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/progress', requireAdmin, getProgress);
router.post('/trigger', requireAdmin, triggerCrawler);
router.get('/', requireAdmin, getPendingStagingFanarts);
router.post('/:id/approve', requireAdmin, approveStagingFanart);
router.post('/:id/reject', requireAdmin, rejectStagingFanart);

export default router;
