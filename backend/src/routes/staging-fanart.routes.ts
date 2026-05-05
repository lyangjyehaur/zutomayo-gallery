import { Router } from 'express';
import { getStagingFanarts, approveStagingFanart, rejectStagingFanart, getProgress, triggerCrawler, restoreStagingFanart, batchRestoreStagingFanarts } from '../controllers/staging-fanart.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requirePermission } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/progress', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), asyncHandler(getProgress));
router.post('/trigger', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), asyncHandler(triggerCrawler));
router.get('/', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), asyncHandler(getStagingFanarts));
router.post('/batch-restore', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), asyncHandler(batchRestoreStagingFanarts));
router.post('/:id/approve', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), asyncHandler(approveStagingFanart));
router.post('/:id/reject', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), asyncHandler(rejectStagingFanart));
router.post('/:id/restore', requirePermission(ADMIN_PERMISSIONS.STAGING_FANARTS), asyncHandler(restoreStagingFanart));

export default router;
