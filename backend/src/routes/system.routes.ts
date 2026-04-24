import { Router } from 'express';
import { getSystemStatus, toggleMaintenance, getClientGeo } from '../controllers/system.controller.js';
import { syncImagesToR2 } from '../controllers/r2.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Public: Get system status (maintenance mode)
router.get('/status', getSystemStatus);

// Public: Get client geo location info
router.get('/geo', getClientGeo);

// Admin: Toggle maintenance mode
router.put('/maintenance', requireAdmin, toggleMaintenance);

// Admin: Sync existing Twitter images to R2 Bucket
router.post('/r2-sync', requireAdmin, syncImagesToR2);

export default router;
