import { Router } from 'express';
import { handleTelegramWebhook, handleWalineWebhook, verifyTelegramWebhook, verifyWalineWebhook } from '../controllers/webhook.controller.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Waline webhook 不支持內建簽名驗證，因此使用路徑 token 方式保護
// 配置 Waline WEBHOOK 時設為: https://your-domain/api/webhook/waline/<WALINE_WEBHOOK_SECRET>
router.post('/waline/:token?', verifyWalineWebhook, handleWalineWebhook);

// Telegram Bot API setWebhook secret_token is sent back as
// X-Telegram-Bot-Api-Secret-Token.
router.post('/telegram', verifyTelegramWebhook, asyncHandler(handleTelegramWebhook));

export default router;
