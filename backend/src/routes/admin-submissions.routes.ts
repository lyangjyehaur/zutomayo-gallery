import { Router } from 'express';
import { approveSubmission, listSubmissions, rejectSubmission } from '../controllers/admin-submissions.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requirePermission } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', requirePermission(ADMIN_PERMISSIONS.SUBMISSIONS), asyncHandler(listSubmissions));
router.post('/:id/approve', requirePermission(ADMIN_PERMISSIONS.SUBMISSIONS), asyncHandler(approveSubmission));
router.post('/:id/reject', requirePermission(ADMIN_PERMISSIONS.SUBMISSIONS), asyncHandler(rejectSubmission));

export default router;
