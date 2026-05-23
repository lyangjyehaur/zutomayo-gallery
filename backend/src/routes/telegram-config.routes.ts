import { Router } from 'express';
import {
  getTelegramConfig,
  updateTelegramConfig,
  testTelegramBot,
  getTelegramWebhookInfo,
  setTelegramWebhook,
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

export default router;
