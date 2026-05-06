import { Router, Request, Response } from 'express';
import { PushSubscriptionModel } from '../models/push-subscription.model.js';
import { PushService } from '../services/push.service.js';
import { nanoid } from 'nanoid';

const router = Router();

router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    const existing = await PushSubscriptionModel.findOne({ where: { endpoint } });
    if (existing) {
      (existing as any).p256dh = keys.p256dh;
      (existing as any).auth = keys.auth;
      (existing as any).user_id = userId;
      await existing.save();
      res.json({ success: true });
      return;
    }

    await PushSubscriptionModel.create({
      id: nanoid(16),
      user_id: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to subscribe' });
  }
});

router.delete('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { endpoint } = req.body;
    if (!endpoint) {
      res.status(400).json({ success: false, message: 'Missing endpoint' });
      return;
    }

    await PushSubscriptionModel.destroy({ where: { endpoint, user_id: userId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to unsubscribe' });
  }
});

router.get('/public-key', (_req: Request, res: Response) => {
  const publicKey = PushService.getPublicKey();
  if (!publicKey) {
    res.status(404).json({ success: false, message: 'VAPID not configured' });
    return;
  }
  res.json({ success: true, publicKey });
});

export default router;
