import fetch from 'node-fetch';
import { errorEventEmitter } from './error-events.service.js';
import { logger } from '../utils/logger.js';

export const NotificationService = {
  sendBarkNotification: async ({
    title,
    body,
    url,
    extraParams,
  }: {
    title: string;
    body: string;
    url?: string;
    extraParams?: string;
  }): Promise<boolean> => {
    const BARK_URL = process.env.BARK_URL || process.env.BARK_KEY;
    if (!BARK_URL) {
      logger.warn('BARK_URL / BARK_KEY not configured, skipping Bark notification');
      return false;
    }

    const encodedTitle = encodeURIComponent(title);
    const encodedBody = encodeURIComponent(body);

    let barkUrl: string;
    if (BARK_URL.startsWith('http')) {
      barkUrl = `${BARK_URL}/${encodedTitle}/${encodedBody}`;
    } else {
      barkUrl = `https://api.day.app/${BARK_URL}/${encodedTitle}/${encodedBody}`;
    }

    if (url) {
      barkUrl += `?url=${encodeURIComponent(url)}`;
    }

    if (extraParams) {
      barkUrl += url ? `&${extraParams}` : `?${extraParams}`;
    }

    logger.info({ barkUrl }, 'Sending Bark notification');

    try {
      const response = await fetch(barkUrl);
      if (response.ok) {
        logger.info('Bark notification sent successfully');
        return true;
      } else {
        const errText = await response.text();
        const errMsg = `Bark API returned ${response.status}: ${errText}`;
        logger.error({ status: response.status, body: errText }, 'Bark API error');
        errorEventEmitter.emitError({
          source: 'cron',
          message: errMsg,
          details: { phase: 'bark-notification', barkUrl },
        });
        return false;
      }
    } catch (err) {
      const errMsg = `Failed to send Bark notification: ${err instanceof Error ? err.message : String(err)}`;
      logger.error({ err }, 'Bark notification fetch failed');
      errorEventEmitter.emitError({
        source: 'cron',
        message: errMsg,
        stack: err instanceof Error ? err.stack : undefined,
        details: { phase: 'bark-notification' },
      });
      return false;
    }
  },

  send: async ({
    type,
    title,
    body,
    url,
  }: {
    type: string;
    title: string;
    body: string;
    url?: string;
  }): Promise<boolean> => {
    const barkResult = await NotificationService.sendBarkNotification({ title, body, url });

    try {
      const { PushSubscriptionModel } = await import('../models/push-subscription.model.js');
      const { PushService } = await import('./push.service.js');
      const subscriptions = await PushSubscriptionModel.findAll();
      const payload = { type, title, body, url };
      await Promise.allSettled(
        subscriptions.map(sub =>
          PushService.sendNotification(
            { endpoint: (sub as any).endpoint, keys: { p256dh: (sub as any).p256dh, auth: (sub as any).auth } },
            payload,
          )
        )
      );
    } catch (err) {
      logger.warn({ err }, 'Failed to send push notifications');
    }

    try {
      const { TelegramBotService } = await import('./telegram-bot.service.js');
      await TelegramBotService.sendReviewNotification({ title, body, url });
    } catch (err) {
      logger.warn({ err }, 'Failed to send Telegram notification');
    }

    return barkResult;
  },
};
