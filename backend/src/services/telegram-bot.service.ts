import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../utils/logger.js';
import { errorEventEmitter } from './error-events.service.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

let bot: TelegramBot | null = null;

if (TELEGRAM_BOT_TOKEN) {
  try {
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
    logger.info('Telegram Bot initialized');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Telegram Bot');
  }
}

export const TelegramBotService = {
  sendMessage: async ({ text, imageUrl, parseMode }: { text: string; imageUrl?: string; parseMode?: string }): Promise<boolean> => {
    if (!bot || !TELEGRAM_CHAT_ID) {
      logger.warn('Telegram Bot not configured, skipping notification');
      return false;
    }

    try {
      if (imageUrl) {
        await bot.sendPhoto(TELEGRAM_CHAT_ID, imageUrl, {
          caption: text.substring(0, 1024),
          parse_mode: parseMode as any || 'HTML',
        });
      } else {
        await bot.sendMessage(TELEGRAM_CHAT_ID, text, {
          parse_mode: parseMode as any || 'HTML',
        });
      }
      logger.info('Telegram notification sent successfully');
      return true;
    } catch (err) {
      const errMsg = `Failed to send Telegram notification: ${err instanceof Error ? err.message : String(err)}`;
      logger.error({ err }, errMsg);
      errorEventEmitter.emitError({
        source: 'cron',
        message: errMsg,
        details: { phase: 'telegram-notification' },
      });
      return false;
    }
  },

  sendReviewNotification: async ({ title, body, url, imageUrl }: { title: string; body: string; url?: string; imageUrl?: string }): Promise<boolean> => {
    let text = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`;
    if (url) {
      text += `\n\n<a href="${url}">開啟審核</a>`;
    }
    return TelegramBotService.sendMessage({ text, imageUrl, parseMode: 'HTML' });
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
