import { Request, Response } from 'express';
import { SysConfigModel } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { refreshTelegramConfig } from '../services/telegram-bot.service.js';

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
