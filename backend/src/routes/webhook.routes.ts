import { Router } from 'express';
import { handleTelegramWebhook, handleWalineWebhook, verifyTelegramWebhook, verifyWalineWebhook } from '../controllers/webhook.controller.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Waline webhook 不支持內建簽名驗證，因此使用路徑 token 方式保護
// 配置 Waline WEBHOOK 時使用公開 API origin 對應的 webhook 路徑。
router.post('/waline/:token?', verifyWalineWebhook, handleWalineWebhook);

// Telegram Bot API setWebhook secret_token is sent back as
// X-Telegram-Bot-Api-Secret-Token.
router.post('/telegram', verifyTelegramWebhook, asyncHandler(handleTelegramWebhook));

export default router;
