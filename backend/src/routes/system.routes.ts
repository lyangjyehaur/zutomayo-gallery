import { Router } from 'express';
import { getSystemStatus, toggleMaintenance } from '../controllers/system.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Public: Get system status (maintenance mode)
router.get('/status', getSystemStatus);

// Admin: Toggle maintenance mode
router.put('/maintenance', requireAdmin, toggleMaintenance);

export default router;
