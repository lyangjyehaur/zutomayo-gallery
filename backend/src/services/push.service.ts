import webpush from 'web-push';
import { logger } from '../utils/logger.js';
import { errorEventEmitter } from './error-events.service.js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@ztmr.club';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export const PushService = {
  getPublicKey: () => VAPID_PUBLIC_KEY,

  sendNotification: async (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: object) => {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      logger.warn('VAPID keys not configured, skipping push notification');
      return false;
    }

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      logger.info('Push notification sent successfully');
      return true;
    } catch (err: any) {
      const errMsg = `Failed to send push notification: ${err.message || String(err)}`;
      logger.error({ err }, errMsg);
      if (err.statusCode === 410 || err.statusCode === 404) {
        logger.info('Push subscription expired, should be removed');
        return false;
      }
      errorEventEmitter.emitError({
        source: 'cron',
        message: errMsg,
        details: { phase: 'push-notification', endpoint: subscription.endpoint },
      });
      return false;
    }
  },

  sendToUser: async (userId: string, payload: object) => {
    const { PushSubscriptionModel } = await import('../models/push-subscription.model.js');
    const subscriptions = await PushSubscriptionModel.findAll({ where: { user_id: userId } });

    if (subscriptions.length === 0) {
      logger.info({ userId }, 'No push subscriptions found for user');
      return true;
    }

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        PushService.sendNotification(
          { endpoint: (sub as any).endpoint, keys: { p256dh: (sub as any).p256dh, auth: (sub as any).auth } },
          payload,
        )
      )
    );

    const expiredSubs = results
      .map((r, i) => ({ result: r, sub: subscriptions[i] }))
      .filter(({ result }) => result.status === 'fulfilled' && result.value === false)
      .map(({ sub }) => sub);

    for (const sub of expiredSubs) {
      await sub.destroy();
      logger.info({ endpoint: (sub as any).endpoint }, 'Removed expired push subscription');
    }

    return true;
  },
};
