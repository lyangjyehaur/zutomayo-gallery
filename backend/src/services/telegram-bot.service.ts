import TelegramBot from 'node-telegram-bot-api';
import { logger } from '../utils/logger.js';
import { errorEventEmitter } from './error-events.service.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

let bot: TelegramBot | null = null;
export type FanartReviewAction = 'approve' | 'hold' | 'reject';

const FANART_REVIEW_CALLBACK_PREFIX: Record<FanartReviewAction, string> = {
  approve: 'fa:ok',
  hold: 'fa:hold',
  reject: 'fa:no',
};

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
      text += `\n\n<a href="${escapeHtmlAttribute(url)}">開啟審核</a>`;
    }
    return TelegramBotService.sendMessage({ text, imageUrl, parseMode: 'HTML' });
  },

  sendFanartReviewNotification: async ({
    stagingId,
    title,
    body,
    sourceUrl,
    imageUrl
  }: {
    stagingId: string;
    title: string;
    body: string;
    sourceUrl?: string;
    imageUrl?: string;
  }): Promise<boolean> => {
    if (!bot || !TELEGRAM_CHAT_ID) {
      logger.warn('Telegram Bot not configured, skipping fanart review notification');
      return false;
    }

    const escapedTitle = escapeHtml(title);
    const escapedBody = escapeHtml(body);
    let text = `<b>${escapedTitle}</b>\n\n${escapedBody}`;
    if (sourceUrl) {
      text += `\n\n<a href="${escapeHtmlAttribute(sourceUrl)}">開啟原推文</a>`;
    }

    const replyMarkup = {
      inline_keyboard: [[
        { text: '批准', callback_data: buildFanartReviewCallbackData('approve', stagingId) },
        { text: '暫存觀察', callback_data: buildFanartReviewCallbackData('hold', stagingId) },
        { text: '拒絕', callback_data: buildFanartReviewCallbackData('reject', stagingId) },
      ]]
    };

    try {
      if (imageUrl) {
        try {
          await bot.sendPhoto(TELEGRAM_CHAT_ID, imageUrl, {
            caption: text.substring(0, 1024),
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          });
        } catch (err) {
          logger.warn({ err }, 'Failed to send Telegram fanart review photo, falling back to message');
          await bot.sendMessage(TELEGRAM_CHAT_ID, text, {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          });
        }
      } else {
        await bot.sendMessage(TELEGRAM_CHAT_ID, text, {
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        });
      }

      logger.info('Telegram fanart review notification sent successfully');
      return true;
    } catch (err) {
      const errMsg = `Failed to send Telegram fanart review notification: ${err instanceof Error ? err.message : String(err)}`;
      logger.error({ err }, errMsg);
      errorEventEmitter.emitError({
        source: 'cron',
        message: errMsg,
        details: { phase: 'telegram-fanart-review-notification' },
      });
      return false;
    }
  },
};

export function buildFanartReviewCallbackData(action: FanartReviewAction, stagingId: string): string {
  const callbackData = `${FANART_REVIEW_CALLBACK_PREFIX[action]}:${stagingId}`;
  if (Buffer.byteLength(callbackData, 'utf8') > 64) {
    throw new Error('Fanart review callback data exceeds Telegram 64-byte limit');
  }
  return callbackData;
}

export function parseFanartReviewCallbackData(data: unknown): { action: FanartReviewAction; stagingId: string } | null {
  if (typeof data !== 'string') return null;

  const match = data.match(/^fa:(ok|hold|no):(.+)$/);
  if (!match) return null;

  const [, rawAction, stagingId] = match;
  if (!stagingId) return null;

  const action: FanartReviewAction = rawAction === 'ok'
    ? 'approve'
    : rawAction === 'hold'
      ? 'hold'
      : 'reject';

  return { action, stagingId };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttribute(str: string): string {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
