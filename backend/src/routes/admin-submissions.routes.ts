import { Router } from 'express';
import { approveSubmission, listSubmissions, rejectSubmission } from '../controllers/admin-submissions.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireAdmin, listSubmissions);
router.post('/:id/approve', requireAdmin, approveSubmission);
router.post('/:id/reject', requireAdmin, rejectSubmission);

export default router;

