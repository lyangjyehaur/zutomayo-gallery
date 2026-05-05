import { Router } from 'express';
import { handleWalineWebhook, verifyWalineWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// Waline webhook 不支持內建簽名驗證，因此使用路徑 token 方式保護
// 配置 Waline WEBHOOK 時設為: https://your-domain/api/webhook/waline/<WALINE_WEBHOOK_SECRET>
router.post('/waline/:token?', verifyWalineWebhook, handleWalineWebhook);

export default router;
