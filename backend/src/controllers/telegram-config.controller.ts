import { Request, Response } from 'express';
import { SysConfigModel } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import {
  refreshTelegramConfig,
  initializeTopics,
  getTelegramTopicIds,
  reinitializeTopics,
  type TopicCategory,
} from '../services/telegram-bot.service.js';

const CONFIG_KEY = 'telegram_config';

type TelegramConfig = {
  bot_token: string;
  chat_id: string;
  webhook_secret: string;
  webhook_url: string;
};

function maskToken(token: string): string {
  if (!token || token.length < 10) return token;
  return token.substring(0, 6) + '...' + token.substring(token.length - 4);
}

// Topic 分類定義（與 service 保持一致）
const TOPIC_LABELS: Record<TopicCategory, string> = {
  official: '官方消息',
  notification: '系統通知',
  fanart: '二創相關',
};

export const getTelegramConfig = async (_req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk(CONFIG_KEY);
  const dbConfig = (row?.get('value') as any) || {};

  const config: TelegramConfig = {
    bot_token: dbConfig.bot_token || process.env.TELEGRAM_BOT_TOKEN || '',
    chat_id: dbConfig.chat_id || process.env.TELEGRAM_CHAT_ID || '',
    webhook_secret: dbConfig.webhook_secret || process.env.TELEGRAM_WEBHOOK_SECRET || '',
    webhook_url: dbConfig.webhook_url || '',
  };

  const fromEnv = {
    bot_token: !dbConfig.bot_token && !!process.env.TELEGRAM_BOT_TOKEN,
    chat_id: !dbConfig.chat_id && !!process.env.TELEGRAM_CHAT_ID,
    webhook_secret: !dbConfig.webhook_secret && !!process.env.TELEGRAM_WEBHOOK_SECRET,
  };

  // 取得 topic 狀態
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
      bot_token: config.bot_token ? maskToken(config.bot_token) : '',
      has_bot_token: !!config.bot_token,
      chat_id: config.chat_id,
      has_chat_id: !!config.chat_id,
      webhook_secret: config.webhook_secret ? maskToken(config.webhook_secret) : '',
      has_webhook_secret: !!config.webhook_secret,
      webhook_url: config.webhook_url,
      from_env: fromEnv,
      topic_status: topicStatus,
      all_topics_initialized: allTopicsInitialized,
    },
  });
};

export const updateTelegramConfig = async (req: Request, res: Response) => {
  const { bot_token, chat_id, webhook_secret, webhook_url } = req.body;

  const existing = await SysConfigModel.findByPk(CONFIG_KEY);
  const current = (existing?.get('value') as any) || {};

  const updated: TelegramConfig = {
    bot_token: bot_token !== undefined ? bot_token : current.bot_token || '',
    chat_id: chat_id !== undefined ? String(chat_id) : current.chat_id || '',
    webhook_secret: webhook_secret !== undefined ? webhook_secret : current.webhook_secret || '',
    webhook_url: webhook_url !== undefined ? webhook_url : current.webhook_url || '',
  };

  await SysConfigModel.upsert({
    key: CONFIG_KEY,
    value: updated,
    description: 'Telegram Bot 審核配置',
  } as any);

  // 重新載入 bot service 的配置
  await refreshTelegramConfig();
  const { refreshWebhookSecret } = await import('./webhook.controller.js');
  await refreshWebhookSecret();

  logger.info('Telegram config updated via admin');

  res.json({
    success: true,
    message: 'Telegram 配置已更新',
  });
};

export const testTelegramBot = async (_req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk(CONFIG_KEY);
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
  const row = await SysConfigModel.findByPk(CONFIG_KEY);
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
  const row = await SysConfigModel.findByPk(CONFIG_KEY);
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

export const getTelegramWebhookInfo = async (_req: Request, res: Response) => {
  const row = await SysConfigModel.findByPk(CONFIG_KEY);
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
  const { webhook_url } = req.body;

  if (!webhook_url || typeof webhook_url !== 'string' || !webhook_url.startsWith('https://')) {
    throw new AppError(400, 'INVALID_WEBHOOK_URL', 'Webhook URL 必須是 https:// 開頭');
  }

  const row = await SysConfigModel.findByPk(CONFIG_KEY);
  const dbConfig = (row?.get('value') as any) || {};
  const botToken = dbConfig.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
  let webhookSecret = dbConfig.webhook_secret || process.env.TELEGRAM_WEBHOOK_SECRET || '';

  if (!botToken) {
    throw new AppError(400, 'TELEGRAM_BOT_NOT_CONFIGURED', '尚未設定 Telegram Bot Token');
  }

  // Telegram secret_token 只允許 A-Z a-z 0-9 _ -，長度 1-256
  if (webhookSecret && !/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
    const crypto = await import('crypto');
    webhookSecret = 'whk_' + crypto.default.randomBytes(16).toString('hex');
    dbConfig.webhook_secret = webhookSecret;
    await SysConfigModel.upsert({ key: CONFIG_KEY, value: dbConfig, description: 'Telegram Bot 審核配置' } as any);
    logger.warn('Telegram webhook_secret contained invalid characters, auto-generated a new one');
  }

  const params: Record<string, string> = { url: webhook_url };
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

    // 儲存 webhook URL 到 config
    await SysConfigModel.upsert({
      key: CONFIG_KEY,
      value: { ...dbConfig, webhook_url },
      description: 'Telegram Bot 審核配置',
    } as any);

    res.json({
      success: true,
      message: 'Webhook 已設定成功',
      data: { webhook_url },
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, 'TELEGRAM_SET_WEBHOOK_ERROR', `設定失敗：${err.message}`);
  }
};
