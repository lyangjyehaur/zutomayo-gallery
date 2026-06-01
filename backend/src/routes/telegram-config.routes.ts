import { Router } from 'express';
import {
  getTelegramConfig,
  updateTelegramConfig,
  testTelegramBot,
  getTelegramWebhookInfo,
  setTelegramWebhook,
  getTopicStatus,
  initTopics,
  reinitTopics,
} from '../controllers/telegram-config.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requirePermission } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.use(requirePermission(ADMIN_PERMISSIONS.SYSTEM_CONFIG));
router.get('/', asyncHandler(getTelegramConfig));
router.put('/', asyncHandler(updateTelegramConfig));
router.post('/test', asyncHandler(testTelegramBot));
router.get('/webhook-info', asyncHandler(getTelegramWebhookInfo));
router.post('/set-webhook', asyncHandler(setTelegramWebhook));

// Topic 管理
router.get('/topics', asyncHandler(getTopicStatus));
router.post('/topics/init', asyncHandler(initTopics));
router.post('/topics/reinit', asyncHandler(reinitTopics));

export default router;
