import { Router } from 'express';
import { getStagingFanarts, approveStagingFanart, rejectStagingFanart, getProgress, triggerCrawler, restoreStagingFanart, batchRestoreStagingFanarts } from '../controllers/staging-fanart.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/progress', requireAdmin, getProgress);
router.post('/trigger', requireAdmin, triggerCrawler);
router.get('/', requireAdmin, getStagingFanarts);
router.post('/batch-restore', requireAdmin, batchRestoreStagingFanarts);
router.post('/:id/approve', requireAdmin, approveStagingFanart);
router.post('/:id/reject', requireAdmin, rejectStagingFanart);
router.post('/:id/restore', requireAdmin, restoreStagingFanart);

export default router;
