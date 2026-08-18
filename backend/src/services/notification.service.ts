import fetch from 'node-fetch';
import { SysConfigModel } from '../models/index.js';
import { errorEventEmitter } from './error-events.service.js';
import { logger } from '../utils/logger.js';
import { getUrlOriginForLog } from '../utils/sensitive-url.js';

// 動態配置：DB 優先，env fallback
let cachedBarkUrl = process.env.BARK_URL || '';
let cachedBarkKey = process.env.BARK_KEY || '';

// 啟動時異步從 DB 載入
refreshNotificationConfig().catch(() => {});

export async function refreshNotificationConfig(): Promise<void> {
  try {
    const row = await SysConfigModel.findByPk('bark_config');
    const db = (row?.get('value') as any) || {};
    cachedBarkUrl = db.bark_url || process.env.BARK_URL || '';
    cachedBarkKey = db.bark_key || process.env.BARK_KEY || '';
  } catch (err) {
    logger.warn({ err }, 'Failed to refresh notification config from DB, using cached values');
  }
}

const NOTIFICATION_TYPE_TO_PREF: Record<string, string> = {
  'new-fanart': 'staging',
  'crawler-complete': 'crawler',
  'new-submission': 'submission',
  'error-threshold': 'error',
};

const getBarkLogContext = (barkUrl: string): { barkOrigin?: string; barkConfigured: boolean } => {
  const barkOrigin = getUrlOriginForLog(barkUrl);
  return { ...(barkOrigin ? { barkOrigin } : {}), barkConfigured: Boolean(barkUrl) };
};

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
    if (!cachedBarkUrl && !cachedBarkKey) {
      logger.warn('BARK_URL / BARK_KEY not configured, skipping Bark notification');
      return false;
    }

    const encodedTitle = encodeURIComponent(title);
    const encodedBody = encodeURIComponent(body);

    // Bark URL 格式: {base_url}/{device_key}/{title}/{body}
    const baseUrl = cachedBarkUrl || process.env.BARK_API_BASE_URL || '';
    if (!baseUrl) {
      logger.warn('BARK_API_BASE_URL not configured, skipping Bark notification');
      return false;
    }
    const deviceKey = cachedBarkKey || '';
    let barkUrl = `${baseUrl.replace(/\/$/, '')}${deviceKey ? `/${deviceKey}` : ''}/${encodedTitle}/${encodedBody}`;

    if (url) {
      barkUrl += `?url=${encodeURIComponent(url)}`;
    }

    if (extraParams) {
      barkUrl += url ? `&${extraParams}` : `?${extraParams}`;
    }

    const barkLogContext = getBarkLogContext(barkUrl);
    logger.info(barkLogContext, 'Sending Bark notification');

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
          details: { phase: 'bark-notification', ...barkLogContext },
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
      const { AdminUserModel } = await import('../models/index.js');
      const subscriptions = await PushSubscriptionModel.findAll();
      const prefKey = NOTIFICATION_TYPE_TO_PREF[type];
      const payload = { type, title, body, url };

      const filteredSubs = prefKey
        ? await filterSubsByPref(subscriptions, prefKey, AdminUserModel)
        : subscriptions;

      await Promise.allSettled(
        filteredSubs.map(sub =>
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
      await TelegramBotService.sendReviewNotification({ title, body, url, notificationType: type });
    } catch (err) {
      logger.warn({ err }, 'Failed to send Telegram notification');
    }

    return barkResult;
  },
};

async function filterSubsByPref(
  subscriptions: any[],
  prefKey: string,
  AdminUserModel: any,
): Promise<any[]> {
  const userIds = [...new Set(subscriptions.map(s => (s as any).user_id))];
  if (userIds.length === 0) return subscriptions;

  const users = await AdminUserModel.findAll({ where: { id: userIds } });
  const userPrefMap = new Map<string, any>();
  for (const u of users) {
    userPrefMap.set((u as any).id, (u.toJSON() as any).notification_preferences);
  }

  return subscriptions.filter(sub => {
    const prefs = userPrefMap.get((sub as any).user_id);
    if (!prefs) return true;
    return prefs[prefKey] !== false;
  });
}
