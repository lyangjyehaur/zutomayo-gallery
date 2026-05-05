import { Router } from 'express';
import { getStagingFanarts, approveStagingFanart, rejectStagingFanart, getProgress, triggerCrawler, restoreStagingFanart, batchRestoreStagingFanarts } from '../controllers/staging-fanart.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/progress', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), getProgress);
router.post('/trigger', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), triggerCrawler);
router.get('/', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), getStagingFanarts);
router.post('/batch-restore', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), batchRestoreStagingFanarts);
router.post('/:id/approve', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), approveStagingFanart);
router.post('/:id/reject', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), rejectStagingFanart);
router.post('/:id/restore', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), restoreStagingFanart);

export default router;
