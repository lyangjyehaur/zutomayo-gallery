import { Request, Response } from 'express';
import { SysConfigModel } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { refreshNotificationConfig } from '../services/notification.service.js';
import { refreshErrorNotificationConfig } from '../services/error-events.service.js';
import {
  refreshTelegramConfig,
  initializeTopics,
  getTelegramTopicIds,
  reinitializeTopics,
  type TopicCategory,
} from '../services/telegram-bot.service.js';
import { twitterQueue } from '../services/queue.service.js';
import { refreshQueueConfig } from '../services/queue.service.js';
import { refreshMonitorTargetConfig } from '../services/monitor-target.service.js';
import { TwitterMonitorService } from '../services/twitter-monitor.service.js';

// ── Bark ──

export const getBarkConfig = async (_req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk('bark_config');
  const db = (row?.get('value') as any) || {};

  res.json({
    success: true,
    data: {
      bark_url: db.bark_url || process.env.BARK_URL || '',
      bark_key: db.bark_key || process.env.BARK_KEY || '',
      has_bark_url: !!(db.bark_url || process.env.BARK_URL),
      has_bark_key: !!(db.bark_key || process.env.BARK_KEY),
      from_env: {
        bark_url: !db.bark_url && !!process.env.BARK_URL,
        bark_key: !db.bark_key && !!process.env.BARK_KEY,
      },
    },
  });
};

export const updateBarkConfig = async (req: Request, res: Response) => {
  const { bark_url, bark_key } = req.body;
  const existing = await SysConfigModel.findByPk('bark_config');
  const current = (existing?.get('value') as any) || {};

  await SysConfigModel.upsert({
    key: 'bark_config',
    value: {
      bark_url: bark_url !== undefined ? bark_url : current.bark_url || '',
      bark_key: bark_key !== undefined ? bark_key : current.bark_key || '',
    },
    description: 'Bark 推送通知配置',
  } as any);

  await refreshNotificationConfig();
  logger.info('Bark config updated via admin');
  res.json({ success: true, message: 'Bark 配置已更新' });
};

export const testBark = async (_req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk('bark_config');
  const db = (row?.get('value') as any) || {};
  const barkUrl = db.bark_url || process.env.BARK_URL || '';
  const barkKey = db.bark_key || process.env.BARK_KEY || '';

  if (!barkUrl && !barkKey) {
    throw new AppError(400, 'BARK_NOT_CONFIGURED', '尚未設定 Bark URL 或 Key');
  }

  const baseUrl = barkUrl || `https://api.day.app`;
  const deviceKey = barkKey || '';
  // Bark URL: {base}/{device_key}/{title}/{body}
  const title = 'ZUTOMAYO Gallery';
  const body = 'Bark 通知測試成功！';
  const url = `${baseUrl.replace(/\/$/, '')}/${deviceKey}/${encodeURIComponent(title)}/${encodeURIComponent(body)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      // 嘗試解析 Bark 回傳的 JSON 錯誤
      let detail = text;
      try {
        const parsed = JSON.parse(text);
        detail = parsed.message || text;
      } catch {}
      throw new AppError(409, 'BARK_TEST_FAILED', `Bark API 錯誤 (${response.status}): ${detail.substring(0, 200)}`);
    }
    res.json({ success: true, message: '測試推播已發送，請檢查 Bark App' });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, 'BARK_TEST_ERROR', `發送失敗：${err.message}`);
  }
};

// ── Twitter Monitor ──

export const getTwitterMonitorConfig = async (_req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk('twitter_monitor_config');
  const db = (row?.get('value') as any) || {};

  res.json({
    success: true,
    data: {
      rsshub_base_url: db.rsshub_base_url || process.env.TWITTER_RSSHUB_BASE_URL || process.env.RSSHUB_BASE_URL || '',
      monitor_cron: db.monitor_cron || process.env.TWITTER_MONITOR_CRON || '0 * * * *',
      from_env: {
        rsshub_base_url: !db.rsshub_base_url && !!(process.env.TWITTER_RSSHUB_BASE_URL || process.env.RSSHUB_BASE_URL),
        monitor_cron: !db.monitor_cron && !!process.env.TWITTER_MONITOR_CRON,
      },
    },
  });
};

export const updateTwitterMonitorConfig = async (req: Request, res: Response) => {
  const { rsshub_base_url, monitor_cron } = req.body;
  const existing = await SysConfigModel.findByPk('twitter_monitor_config');
  const current = (existing?.get('value') as any) || {};

  await SysConfigModel.upsert({
    key: 'twitter_monitor_config',
    value: {
      rsshub_base_url: rsshub_base_url !== undefined ? rsshub_base_url : current.rsshub_base_url || '',
      monitor_cron: monitor_cron !== undefined ? monitor_cron : current.monitor_cron || '',
    },
    description: 'Twitter RSS 監聽配置',
  } as any);

  logger.info('Twitter monitor config updated via admin');

  // 立即生效：刷新 RSSHub base URL 和 cron schedule
  await Promise.all([
    refreshMonitorTargetConfig(),
    refreshQueueConfig(),
  ]);

  res.json({ success: true, message: 'Twitter 監聽配置已更新' });
};

export const triggerTwitterMonitor = async (_req: Request, res: Response) => {
  if (twitterQueue) {
    // 生產環境：enqueue check-rss job，BullMQ 會拆成 per-feed jobs
    const job = await twitterQueue.add('check-rss', {}, {
      attempts: 1,
      removeOnComplete: 20,
    });
    logger.info({ jobId: job.id }, 'Twitter monitor manually triggered via BullMQ');
    res.json({
      success: true,
      message: '已排入監聽佇列，將在數秒內開始處理',
      data: { jobId: job.id, mode: 'queue' },
    });
  } else {
    // 開發環境（無 Redis）：直接執行
    logger.info('Twitter monitor manually triggered (direct, no Redis)');
    const result = await TwitterMonitorService.checkRss();
    res.json({
      success: true,
      message: `監聽完成，新增 ${result?.processedCount ?? 0} 筆候選`,
      data: { ...result, mode: 'direct' },
    });
  }
};

// ── Error Notification ──

export const getErrorNotificationConfig = async (_req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk('error_notification_config');
  const db = (row?.get('value') as any) || {};

  res.json({
    success: true,
    data: {
      threshold: db.threshold ?? parseInt(process.env.ERROR_NOTIFICATION_THRESHOLD || '10', 10),
      window_ms: db.window_ms ?? parseInt(process.env.ERROR_NOTIFICATION_WINDOW_MS || String(5 * 60 * 1000), 10),
      from_env: {
        threshold: db.threshold === undefined && !!process.env.ERROR_NOTIFICATION_THRESHOLD,
        window_ms: db.window_ms === undefined && !!process.env.ERROR_NOTIFICATION_WINDOW_MS,
      },
    },
  });
};

export const updateErrorNotificationConfig = async (req: Request, res: Response) => {
  const { threshold, window_ms } = req.body;

  if (threshold !== undefined && (typeof threshold !== 'number' || threshold < 1)) {
    throw new AppError(400, 'INVALID_THRESHOLD', '閾值必須是正整數');
  }
  if (window_ms !== undefined && (typeof window_ms !== 'number' || window_ms < 1000)) {
    throw new AppError(400, 'INVALID_WINDOW', '時間窗口必須至少 1000 毫秒');
  }

  const existing = await SysConfigModel.findByPk('error_notification_config');
  const current = (existing?.get('value') as any) || {};

  await SysConfigModel.upsert({
    key: 'error_notification_config',
    value: {
      threshold: threshold !== undefined ? threshold : current.threshold,
      window_ms: window_ms !== undefined ? window_ms : current.window_ms,
    },
    description: '錯誤通知閾值配置',
  } as any);

  await refreshErrorNotificationConfig();
  logger.info('Error notification config updated via admin');
  res.json({ success: true, message: '錯誤通知配置已更新' });
};

// ── Apify ──

export const getApifyConfig = async (_req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk('apify_config');
  const db = (row?.get('value') as any) || {};

  res.json({
    success: true,
    data: {
      api_token: db.api_token ? '••••••••' : '',
      has_api_token: !!(db.api_token || process.env.APIFY_API_TOKEN),
      from_env: {
        api_token: !db.api_token && !!process.env.APIFY_API_TOKEN,
      },
    },
  });
};

export const updateApifyConfig = async (req: Request, res: Response) => {
  const { api_token } = req.body;
  const existing = await SysConfigModel.findByPk('apify_config');
  const current = (existing?.get('value') as any) || {};

  await SysConfigModel.upsert({
    key: 'apify_config',
    value: {
      api_token: api_token !== undefined ? api_token : current.api_token || '',
    },
    description: 'Apify Twitter 爬蟲配置',
  } as any);

  logger.info('Apify config updated via admin');
  res.json({ success: true, message: 'Apify 配置已更新' });
};

// ── Telegram ──

const TG_CONFIG_KEY = 'telegram_config';

type TelegramConfig = {
  bot_token: string;
  chat_id: string;
  webhook_secret: string;
};

function maskToken(token: string): string {
  if (!token || token.length < 10) return token;
  return token.substring(0, 6) + '...' + token.substring(token.length - 4);
}

export const getTelegramConfig = async (_req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk(TG_CONFIG_KEY);
  const dbConfig = (row?.get('value') as any) || {};

  const config: TelegramConfig = {
    bot_token: dbConfig.bot_token || process.env.TELEGRAM_BOT_TOKEN || '',
    chat_id: dbConfig.chat_id || process.env.TELEGRAM_CHAT_ID || '',
    webhook_secret: dbConfig.webhook_secret || process.env.TELEGRAM_WEBHOOK_SECRET || '',
  };

  const fromEnv = {
    bot_token: !dbConfig.bot_token && !!process.env.TELEGRAM_BOT_TOKEN,
    chat_id: !dbConfig.chat_id && !!process.env.TELEGRAM_CHAT_ID,
    webhook_secret: !dbConfig.webhook_secret && !!process.env.TELEGRAM_WEBHOOK_SECRET,
  };

  res.json({
    success: true,
    data: {
      bot_token: config.bot_token || '',
      has_bot_token: !!config.bot_token,
      chat_id: config.chat_id,
      has_chat_id: !!config.chat_id,
      webhook_secret: config.webhook_secret ? maskToken(config.webhook_secret) : '',
      has_webhook_secret: !!config.webhook_secret,
      from_env: fromEnv,
    },
  });
};

export const updateTelegramConfig = async (req: Request, res: Response) => {
  const { bot_token, chat_id, webhook_secret } = req.body;

  const existing = await SysConfigModel.findByPk(TG_CONFIG_KEY);
  const current = (existing?.get('value') as any) || {};

  const updated: TelegramConfig = {
    bot_token: bot_token !== undefined ? bot_token : current.bot_token || '',
    chat_id: chat_id !== undefined ? String(chat_id) : current.chat_id || '',
    webhook_secret: webhook_secret !== undefined ? webhook_secret : current.webhook_secret || '',
  };

  await SysConfigModel.upsert({
    key: TG_CONFIG_KEY,
    value: updated,
    description: 'Telegram Bot 審核配置',
  } as any);

  await refreshTelegramConfig();
  const { refreshWebhookSecret } = await import('./webhook.controller.js');
  await refreshWebhookSecret();

  // 自動註冊 Webhook（如果有 bot token 和 webhook secret）
  const finalBotToken = updated.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
  const webhookBase = process.env.TELEGRAM_WEBHOOK_BASE_URL || 'https://api.ztmr.club';
  if (finalBotToken) {
    try {
      const webhookUrl = `${webhookBase}/api/webhook/telegram`;
      let webhookSecret = updated.webhook_secret || '';

      // Telegram secret_token 只允許 A-Z a-z 0-9 _ -，長度 1-256
      if (webhookSecret && !/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
        const crypto = await import('crypto');
        webhookSecret = 'whk_' + crypto.default.randomBytes(16).toString('hex');
        updated.webhook_secret = webhookSecret;
        await SysConfigModel.upsert({ key: TG_CONFIG_KEY, value: updated, description: 'Telegram Bot 審核配置' } as any);
        logger.warn('Telegram webhook_secret contained invalid characters, auto-generated a new one');
      }

      const params: Record<string, string> = { url: webhookUrl };
      if (webhookSecret) {
        params.secret_token = webhookSecret;
      }
      const response = await fetch(`https://api.telegram.org/bot${finalBotToken}/setWebhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      });
      const result = await response.json() as any;
      if (result.ok) {
        logger.info({ webhookUrl }, 'Telegram webhook auto-registered');
      } else {
        logger.warn({ result }, 'Telegram webhook auto-registration failed');
      }
    } catch (webhookErr) {
      logger.warn({ err: webhookErr }, 'Telegram webhook auto-registration error');
    }
  }

  logger.info('Telegram config updated via admin');

  res.json({
    success: true,
    message: 'Telegram 配置已更新',
  });
};

export const testTelegramBot = async (_req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk(TG_CONFIG_KEY);
  const dbConfig = (row?.get('value') as any) || {};

  const botToken = dbConfig.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = dbConfig.chat_id || process.env.TELEGRAM_CHAT_ID || '';

  if (!botToken) {
    throw new AppError(400, 'TELEGRAM_BOT_NOT_CONFIGURED', '尚未設定 Telegram Bot Token');
  }
  if (!chatId) {
    throw new AppError(400, 'TELEGRAM_CHAT_NOT_CONFIGURED', '尚未設定 Telegram Chat ID');
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '🔔 <b>ZUTOMAYO Gallery</b>\n\nTelegram Bot 連線測試成功！',
        parse_mode: 'HTML',
      }),
    });

    const result = await response.json() as any;

    if (!result.ok) {
      throw new AppError(409, 'TELEGRAM_TEST_FAILED', `Telegram API 錯誤：${result.description || '未知錯誤'}`);
    }

    res.json({
      success: true,
      message: '測試訊息已發送，請檢查 Telegram',
      data: {
        message_id: result.result?.message_id,
        chat_id: chatId,
      },
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, 'TELEGRAM_TEST_ERROR', `發送失敗：${err.message}`);
  }
};

export const getTelegramWebhookInfo = async (_req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk(TG_CONFIG_KEY);
  const dbConfig = (row?.get('value') as any) || {};
  const botToken = dbConfig.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';

  if (!botToken) {
    throw new AppError(400, 'TELEGRAM_BOT_NOT_CONFIGURED', '尚未設定 Telegram Bot Token');
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const result = await response.json() as any;

    if (!result.ok) {
      throw new AppError(409, 'TELEGRAM_WEBHOOK_INFO_FAILED', `Telegram API 錯誤：${result.description || '未知錯誤'}`);
    }

    res.json({
      success: true,
      data: result.result,
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, 'TELEGRAM_WEBHOOK_INFO_ERROR', `查詢失敗：${err.message}`);
  }
};

export const setTelegramWebhook = async (req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk(TG_CONFIG_KEY);
  const dbConfig = (row?.get('value') as any) || {};
  const botToken = dbConfig.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
  const webhookSecret = dbConfig.webhook_secret || process.env.TELEGRAM_WEBHOOK_SECRET || '';
  const webhookBase = process.env.TELEGRAM_WEBHOOK_BASE_URL || 'https://api.ztmr.club';

  if (!botToken) {
    throw new AppError(400, 'TELEGRAM_BOT_NOT_CONFIGURED', '尚未設定 Telegram Bot Token');
  }

  const webhookUrl = `${webhookBase}/api/webhook/telegram`;
  const params: Record<string, string> = { url: webhookUrl };
  if (webhookSecret) {
    params.secret_token = webhookSecret;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    });

    const result = await response.json() as any;

    if (!result.ok) {
      throw new AppError(409, 'TELEGRAM_SET_WEBHOOK_FAILED', `Telegram API 錯誤：${result.description || '未知錯誤'}`);
    }

    res.json({
      success: true,
      message: 'Webhook 已重新註冊',
      data: { webhook_url: webhookUrl },
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, 'TELEGRAM_SET_WEBHOOK_ERROR', `設定失敗：${err.message}`);
  }
};

// ── Batch: get all system config (telegram + notifications) ──

export const getAllSystemConfig = async (_req: Request, res: Response) => {
  const [tgRow, barkRow, twitterRow, errorRow, apifyRow] = await Promise.all([
    SysConfigModel.findByPk(TG_CONFIG_KEY),
    SysConfigModel.findByPk('bark_config'),
    SysConfigModel.findByPk('twitter_monitor_config'),
    SysConfigModel.findByPk('error_notification_config'),
    SysConfigModel.findByPk('apify_config'),
  ]);

  const tg = (tgRow?.get('value') as any) || {};
  const bark = (barkRow?.get('value') as any) || {};
  const twitter = (twitterRow?.get('value') as any) || {};
  const error = (errorRow?.get('value') as any) || {};
  const apify = (apifyRow?.get('value') as any) || {};

  const tgToken = tg.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';

  res.json({
    success: true,
    data: {
      telegram: {
        bot_token: tgToken || '',
        has_bot_token: !!tgToken,
        chat_id: tg.chat_id || process.env.TELEGRAM_CHAT_ID || '',
        has_chat_id: !!(tg.chat_id || process.env.TELEGRAM_CHAT_ID),
        webhook_secret: (tg.webhook_secret || process.env.TELEGRAM_WEBHOOK_SECRET || '') ? '••••••••' : '',
        has_webhook_secret: !!(tg.webhook_secret || process.env.TELEGRAM_WEBHOOK_SECRET),
        from_env: {
          bot_token: !tg.bot_token && !!process.env.TELEGRAM_BOT_TOKEN,
          chat_id: !tg.chat_id && !!process.env.TELEGRAM_CHAT_ID,
          webhook_secret: !tg.webhook_secret && !!process.env.TELEGRAM_WEBHOOK_SECRET,
        },
      },
      bark: {
        bark_url: bark.bark_url || process.env.BARK_URL || '',
        bark_key: bark.bark_key || process.env.BARK_KEY || '',
        has_bark_url: !!(bark.bark_url || process.env.BARK_URL),
        has_bark_key: !!(bark.bark_key || process.env.BARK_KEY),
      },
      twitter: {
        rsshub_base_url: twitter.rsshub_base_url || process.env.TWITTER_RSSHUB_BASE_URL || process.env.RSSHUB_BASE_URL || '',
        monitor_cron: twitter.monitor_cron || process.env.TWITTER_MONITOR_CRON || '0 * * * *',
      },
      error: {
        threshold: error.threshold ?? parseInt(process.env.ERROR_NOTIFICATION_THRESHOLD || '10', 10),
        window_ms: error.window_ms ?? parseInt(process.env.ERROR_NOTIFICATION_WINDOW_MS || String(5 * 60 * 1000), 10),
      },
      apify: {
        has_api_token: !!(apify.api_token || process.env.APIFY_API_TOKEN),
        api_token: apify.api_token || process.env.APIFY_API_TOKEN || '',
      },
    },
  });
};

// ── Legacy: get all notification settings (without telegram) ──

export const getAllNotificationSettings = async (_req: Request, res: Response) => {
  const [barkRow, twitterRow, errorRow, apifyRow] = await Promise.all([
    SysConfigModel.findByPk('bark_config'),
    SysConfigModel.findByPk('twitter_monitor_config'),
    SysConfigModel.findByPk('error_notification_config'),
    SysConfigModel.findByPk('apify_config'),
  ]);

  const bark = (barkRow?.get('value') as any) || {};
  const twitter = (twitterRow?.get('value') as any) || {};
  const error = (errorRow?.get('value') as any) || {};
  const apify = (apifyRow?.get('value') as any) || {};

  res.json({
    success: true,
    data: {
      bark: {
        bark_url: bark.bark_url || process.env.BARK_URL || '',
        bark_key: bark.bark_key || process.env.BARK_KEY || '',
        has_bark_url: !!(bark.bark_url || process.env.BARK_URL),
        has_bark_key: !!(bark.bark_key || process.env.BARK_KEY),
      },
      twitter: {
        rsshub_base_url: twitter.rsshub_base_url || process.env.TWITTER_RSSHUB_BASE_URL || process.env.RSSHUB_BASE_URL || '',
        monitor_cron: twitter.monitor_cron || process.env.TWITTER_MONITOR_CRON || '0 * * * *',
      },
      error: {
        threshold: error.threshold ?? parseInt(process.env.ERROR_NOTIFICATION_THRESHOLD || '10', 10),
        window_ms: error.window_ms ?? parseInt(process.env.ERROR_NOTIFICATION_WINDOW_MS || String(5 * 60 * 1000), 10),
      },
      apify: {
        has_api_token: !!(apify.api_token || process.env.APIFY_API_TOKEN),
        api_token: apify.api_token || process.env.APIFY_API_TOKEN || '',
      },
    },
  });
};

// ── Topic 管理 ──

const TOPIC_LABELS: Record<TopicCategory, string> = {
  official: '官方消息',
  notification: '系統通知',
  fanart: '二創相關',
};

export const getTopicStatus = async (_req: Request, res: Response) => {
  const topicIds = getTelegramTopicIds();
  const topicStatus: Record<string, { label: string; thread_id: number | null; initialized: boolean }> = {};
  
  for (const [key, label] of Object.entries(TOPIC_LABELS)) {
    const threadId = topicIds[key as TopicCategory];
    topicStatus[key] = {
      label,
      thread_id: threadId,
      initialized: !!threadId,
    };
  }

  const allTopicsInitialized = Object.values(topicStatus).every(t => t.initialized);

  res.json({
    success: true,
    data: {
      topics: topicStatus,
      all_initialized: allTopicsInitialized,
    },
  });
};

export const initTopics = async (_req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk(TG_CONFIG_KEY);
  const dbConfig = (row?.get('value') as any) || {};

  const botToken = dbConfig.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = dbConfig.chat_id || process.env.TELEGRAM_CHAT_ID || '';

  if (!botToken) {
    throw new AppError(400, 'TELEGRAM_BOT_NOT_CONFIGURED', '尚未設定 Telegram Bot Token');
  }
  if (!chatId) {
    throw new AppError(400, 'TELEGRAM_CHAT_NOT_CONFIGURED', '尚未設定 Telegram Chat ID');
  }

  try {
    await initializeTopics();
    const topicIds = getTelegramTopicIds();
    const allInitialized = Object.values(topicIds).every(id => id !== null);

    if (!allInitialized) {
      const failedTopics = Object.entries(topicIds)
        .filter(([_, id]) => id === null)
        .map(([key, _]) => TOPIC_LABELS[key as TopicCategory]);

      res.json({
        success: false,
        message: `部分 topic 建立失敗，請確認已在 Telegram 私聊中開啟 Topics 功能`,
        hint: '在 Telegram 中打開與 bot 的私聊，點擊 bot 名字 → 開啟 Topics',
        data: {
          topics: topicIds,
          failed_topics: failedTopics,
        },
      });
      return;
    }

    res.json({
      success: true,
      message: '所有 Topics 已初始化完成',
      data: { topics: topicIds },
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, 'TELEGRAM_TOPIC_INIT_ERROR', `初始化失敗：${err.message}`);
  }
};

export const reinitTopics = async (_req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk(TG_CONFIG_KEY);
  const dbConfig = (row?.get('value') as any) || {};

  const botToken = dbConfig.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = dbConfig.chat_id || process.env.TELEGRAM_CHAT_ID || '';

  if (!botToken) {
    throw new AppError(400, 'TELEGRAM_BOT_NOT_CONFIGURED', '尚未設定 Telegram Bot Token');
  }
  if (!chatId) {
    throw new AppError(400, 'TELEGRAM_CHAT_NOT_CONFIGURED', '尚未設定 Telegram Chat ID');
  }

  try {
    const topicIds = await reinitializeTopics();
    const allInitialized = Object.values(topicIds).every(id => id !== null);

    if (!allInitialized) {
      const failedTopics = Object.entries(topicIds)
        .filter(([_, id]) => id === null)
        .map(([key, _]) => TOPIC_LABELS[key as TopicCategory]);

      res.json({
        success: false,
        message: `部分 topic 重建失敗，請確認已在 Telegram 私聊中開啟 Topics 功能`,
        hint: '在 Telegram 中打開與 bot 的私聊，點擊 bot 名字 → 開啟 Topics',
        data: {
          topics: topicIds,
          failed_topics: failedTopics,
        },
      });
      return;
    }

    res.json({
      success: true,
      message: '所有 Topics 已重新建立',
      data: { topics: topicIds },
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, 'TELEGRAM_TOPIC_REINIT_ERROR', `重建失敗：${err.message}`);
  }
};
