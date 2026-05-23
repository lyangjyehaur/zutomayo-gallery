import { Router } from 'express';
import {
  getBarkConfig, updateBarkConfig, testBark,
  getTwitterMonitorConfig, updateTwitterMonitorConfig, triggerTwitterMonitor,
  getErrorNotificationConfig, updateErrorNotificationConfig,
  getApifyConfig, updateApifyConfig,
  getAllSystemConfig,
  getTelegramConfig, updateTelegramConfig,
  testTelegramBot, getTelegramWebhookInfo, setTelegramWebhook,
} from '../controllers/notification-config.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requirePermission } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.use(requirePermission(ADMIN_PERMISSIONS.SYSTEM_CONFIG));

// Batch (all config)
router.get('/', asyncHandler(getAllSystemConfig));

// Telegram
router.get('/telegram', asyncHandler(getTelegramConfig));
router.put('/telegram', asyncHandler(updateTelegramConfig));
router.post('/telegram/test', asyncHandler(testTelegramBot));
router.get('/telegram/webhook-info', asyncHandler(getTelegramWebhookInfo));
router.post('/telegram/set-webhook', asyncHandler(setTelegramWebhook));

// Bark
router.get('/bark', asyncHandler(getBarkConfig));
router.put('/bark', asyncHandler(updateBarkConfig));
router.post('/bark/test', asyncHandler(testBark));

// Twitter Monitor
router.get('/twitter', asyncHandler(getTwitterMonitorConfig));
router.put('/twitter', asyncHandler(updateTwitterMonitorConfig));
router.post('/twitter/trigger', asyncHandler(triggerTwitterMonitor));

// Error Notification
router.get('/error', asyncHandler(getErrorNotificationConfig));
router.put('/error', asyncHandler(updateErrorNotificationConfig));

// Apify
router.get('/apify', asyncHandler(getApifyConfig));
router.put('/apify', asyncHandler(updateApifyConfig));

export default router;
