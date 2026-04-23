import { Router } from 'express';
import { handleWalineWebhook } from '../controllers/webhook.controller.js';

const router = Router();

router.post('/waline', handleWalineWebhook);

export default router;
