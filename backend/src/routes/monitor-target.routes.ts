import { Router } from 'express';
import {
  deleteMonitorTarget,
  getMonitorTargetSources,
  getMonitorTargets,
  patchMonitorTarget,
  postMonitorTarget,
  toggleMonitorTarget,
} from '../controllers/monitor-target.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requirePermission } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.use(requirePermission(ADMIN_PERMISSIONS.MONITOR_TARGETS));
router.get('/sources', asyncHandler(getMonitorTargetSources));
router.get('/', asyncHandler(getMonitorTargets));
router.post('/', asyncHandler(postMonitorTarget));
router.patch('/:id', asyncHandler(patchMonitorTarget));
router.patch('/:id/toggle', asyncHandler(toggleMonitorTarget));
router.delete('/:id', asyncHandler(deleteMonitorTarget));

export default router;
