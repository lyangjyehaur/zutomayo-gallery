import { Router } from 'express';
import {
  getBarkConfig, updateBarkConfig, testBark,
  getTwitterMonitorConfig, updateTwitterMonitorConfig,
  getErrorNotificationConfig, updateErrorNotificationConfig,
  getApifyConfig, updateApifyConfig,
  getAllNotificationSettings,
} from '../controllers/notification-config.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requirePermission } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.use(requirePermission(ADMIN_PERMISSIONS.SYSTEM_CONFIG));

// Batch
router.get('/', asyncHandler(getAllNotificationSettings));

// Bark
router.get('/bark', asyncHandler(getBarkConfig));
router.put('/bark', asyncHandler(updateBarkConfig));
router.post('/bark/test', asyncHandler(testBark));

// Twitter Monitor
router.get('/twitter', asyncHandler(getTwitterMonitorConfig));
router.put('/twitter', asyncHandler(updateTwitterMonitorConfig));

// Error Notification
router.get('/error', asyncHandler(getErrorNotificationConfig));
router.put('/error', asyncHandler(updateErrorNotificationConfig));

// Apify
router.get('/apify', asyncHandler(getApifyConfig));
router.put('/apify', asyncHandler(updateApifyConfig));

export default router;
