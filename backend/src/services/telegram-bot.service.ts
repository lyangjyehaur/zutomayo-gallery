import TelegramBot from 'node-telegram-bot-api';
import { Op } from 'sequelize';
import { ArtistModel, SysConfigModel } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { errorEventEmitter } from './error-events.service.js';

const CONFIG_KEY = 'telegram_config';

// 動態配置：DB 優先，env fallback
let cachedBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
let cachedChatId = process.env.TELEGRAM_CHAT_ID || '';

let bot: TelegramBot | null = null;
export type FanartReviewAction = 'approve' | 'hold' | 'reject';

const FANART_REVIEW_CALLBACK_PREFIX: Record<FanartReviewAction, string> = {
  approve: 'fa:ok',
  hold: 'fa:hold',
  reject: 'fa:no',
};

// Topic 分類定義
export type TopicCategory = 'notification' | 'fanart';
export type ArtistTopicIds = Record<string, number>;

// Topic 配置：每個分類對應的 topic 名稱和顏色
const TOPIC_DEFINITIONS: Record<TopicCategory, { name: string; iconColor: number }> = {
  notification: { name: '系統通知', iconColor: 0xFFD700 },  // 金色
  fanart: { name: '二創相關', iconColor: 0xFF69B4 },        // 粉色
};

// topic ID 緩存
let cachedTopicIds: Record<TopicCategory, number | null> = {
  notification: null,
  fanart: null,
};
let cachedArtistTopicIds = new Map<string, number>();

function initBot(token: string) {
  if (!token) {
    bot = null;
    return;
  }
  try {
    bot = new TelegramBot(token, { polling: false });
    logger.info('Telegram Bot initialized');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Telegram Bot');
    bot = null;
  }
}

// 啟動時從 env 初始化，然後異步從 DB 載入（如有）
initBot(cachedBotToken);
refreshTelegramConfig().catch(() => {});
import('../controllers/webhook.controller.js').then(m => m.refreshWebhookSecret()).catch(() => {});

/**
 * 從 DB 重新載入 Telegram 配置（admin 頁面更新後呼叫）
 */
export async function refreshTelegramConfig(): Promise<void> {
  try {
    const row = await SysConfigModel.findByPk(CONFIG_KEY);
    const dbConfig = (row?.get('value') as any) || {};

    const newToken = dbConfig.bot_token || process.env.TELEGRAM_BOT_TOKEN || '';
    const newChatId = dbConfig.chat_id || process.env.TELEGRAM_CHAT_ID || '';

    const tokenChanged = newToken !== cachedBotToken;

    cachedBotToken = newToken;
    cachedChatId = newChatId;

    // 載入 topic IDs
    if (dbConfig.topic_ids) {
      cachedTopicIds = {
        notification: dbConfig.topic_ids.notification || null,
        fanart: dbConfig.topic_ids.fanart || null,
      };
    }
    cachedArtistTopicIds = new Map(
      Object.entries((dbConfig.artist_topic_ids || {}) as ArtistTopicIds)
        .filter((entry): entry is [string, number] => typeof entry[0] === 'string' && typeof entry[1] === 'number')
    );

    if (tokenChanged) {
      initBot(cachedBotToken);
      logger.info('Telegram Bot re-initialized with new token');
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to refresh Telegram config from DB, using cached values');
  }
}

/**
 * 初始化靜態 topics（如果尚未建立）
 * 需要在 bot 啟動且 chat_id 有設定時呼叫
 */
export async function initializeTopics(): Promise<void> {
  if (!bot || !cachedChatId) {
    logger.warn('Telegram Bot not configured, skipping topic initialization');
    return;
  }

  const chatId = parseInt(cachedChatId, 10);
  if (isNaN(chatId)) {
    logger.warn('Invalid Telegram Chat ID, skipping topic initialization');
    return;
  }

  if (cachedTopicIds.notification && cachedTopicIds.fanart) {
    logger.info('All static Telegram topics already initialized');
    return;
  }

  logger.info('Initializing static Telegram topics...');

  for (const [category, definition] of Object.entries(TOPIC_DEFINITIONS)) {
    const cat = category as TopicCategory;
    if (cachedTopicIds[cat]) {
      logger.info(`Topic '${cat}' already exists (thread_id: ${cachedTopicIds[cat]})`);
      continue;
    }

    try {
      // Telegram Bot API 9.4+ returns ForumTopic object, but type def says boolean
      const topic = await bot.createForumTopic(chatId, definition.name, {
        icon_color: definition.iconColor,
      }) as any;
      const threadId = topic.message_thread_id;
      cachedTopicIds[cat] = threadId;
      logger.info(`Created static topic '${cat}' (name: ${definition.name}, thread_id: ${threadId})`);
    } catch (err: any) {
      const errorText = String(err?.message || err).toLowerCase();
      if (errorText.includes('topic_name_duplicate') || errorText.includes('already')) {
        logger.info(`Topic '${cat}' already exists but thread_id unknown (will be mapped from incoming messages)`);
      } else if (errorText.includes('not a forum') || errorText.includes('forums_disabled')) {
        logger.warn(
          `Cannot create topic '${cat}': Topics mode is not enabled. ` +
          `The user must open the DM with this bot in Telegram, tap the bot name ` +
          `at the top, and enable 'Topics' in chat settings.`
        );
      } else {
        logger.warn({ err }, `Failed to create topic '${cat}'`);
      }
    }
  }

  // 持久化 topic IDs 到 DB
  await saveTopicIds();
}

/**
 * 保存 topic IDs 到 DB
 */
async function saveTopicIds(): Promise<void> {
  try {
    const row = await SysConfigModel.findByPk(CONFIG_KEY);
    const dbConfig = (row?.get('value') as any) || {};

    dbConfig.topic_ids = cachedTopicIds;
    dbConfig.artist_topic_ids = Object.fromEntries(cachedArtistTopicIds);

    await SysConfigModel.upsert({
      key: CONFIG_KEY,
      value: dbConfig,
    });

    logger.info('Topic IDs saved to database');
  } catch (err) {
    logger.warn({ err }, 'Failed to save topic IDs to database');
  }
}

/**
 * 取得當前 Telegram Bot 實例（供 webhook controller 使用）
 */
export function getTelegramBot(): TelegramBot | null {
  return bot;
}

export function getTelegramChatId(): string {
  return cachedChatId;
}

export function getTelegramTopicIds(): Record<TopicCategory, number | null> {
  return { ...cachedTopicIds };
}

export function getTelegramArtistTopicIds(): ArtistTopicIds {
  return Object.fromEntries(cachedArtistTopicIds);
}

/**
 * 根據通知類型取得對應的 topic ID
 */
function getTopicIdForNotificationType(type?: string): number | undefined {
  if (!type) return undefined;

  // 根據 type 映射到 category
  const typeToCategory: Record<string, TopicCategory> = {
    'new-submission': 'fanart',
    'crawler-complete': 'fanart',
    'new-fanart': 'fanart',
    'error-threshold': 'notification',
  };

  const category = typeToCategory[type];
  if (!category) return undefined;

  return cachedTopicIds[category] || undefined;
}

function normalizeTwitterHandle(handle?: string): string {
  return (handle || '').trim().replace(/^@/, '');
}

async function findArtistForTopic({
  artistName,
  artistHandle,
}: {
  artistName?: string;
  artistHandle?: string;
}): Promise<{ name: string; twitter?: string | null } | null> {
  const normalizedHandle = normalizeTwitterHandle(artistHandle);
  const normalizedName = (artistName || '').trim();
  if (!normalizedHandle && !normalizedName) return null;

  const conditions: any[] = [];
  if (normalizedHandle) conditions.push({ twitter: { [Op.iLike]: normalizedHandle } });
  if (normalizedName) conditions.push({ name: { [Op.iLike]: normalizedName } });

  const artist = await ArtistModel.findOne({ where: { [Op.or]: conditions } as any });
  if (!artist) return null;

  return {
    name: String(artist.get('name') || '').trim(),
    twitter: artist.get('twitter') as string | null | undefined,
  };
}

async function ensureArtistTopic(artistName: string): Promise<number | undefined> {
  const topicName = artistName.trim();
  if (!topicName) return undefined;

  const cached = cachedArtistTopicIds.get(topicName);
  if (cached) return cached;

  if (!bot || !cachedChatId) return undefined;
  const chatId = parseInt(cachedChatId, 10);
  if (isNaN(chatId)) return undefined;

  try {
    const topic = await bot.createForumTopic(chatId, topicName, {
      icon_color: 0x6FB1E4,
    }) as any;
    const threadId = topic.message_thread_id;
    if (typeof threadId !== 'number') return undefined;

    cachedArtistTopicIds.set(topicName, threadId);
    await saveTopicIds();
    logger.info({ artistName: topicName, threadId }, 'Created Telegram artist topic');
    return threadId;
  } catch (err) {
    logger.warn({ err, artistName: topicName }, 'Failed to create Telegram artist topic; falling back to fanart topic');
    return undefined;
  }
}

async function getTopicIdForFanartReview({
  contentType,
  artistName,
  artistHandle,
}: {
  contentType?: string;
  artistName?: string;
  artistHandle?: string;
}): Promise<number | undefined> {
  if (contentType !== 'official') {
    return cachedTopicIds.fanart || undefined;
  }

  try {
    const artist = await findArtistForTopic({ artistName, artistHandle });
    if (!artist?.name) return cachedTopicIds.fanart || undefined;

    const artistTopicId = await ensureArtistTopic(artist.name);
    return artistTopicId || cachedTopicIds.fanart || undefined;
  } catch (err) {
    logger.warn({ err, artistName, artistHandle }, 'Failed to resolve Telegram artist topic; falling back to fanart topic');
    return cachedTopicIds.fanart || undefined;
  }
}

/**
 * 重新建立 topics（admin 手動觸發）- 導出版本
 */
export async function reinitializeTopics(): Promise<Record<TopicCategory, number | null>> {
  return TelegramBotService.reinitializeTopics();
}

export const TelegramBotService = {
  sendMessage: async ({
    text,
    imageUrl,
    parseMode,
    messageThreadId,
    notificationType,
  }: {
    text: string;
    imageUrl?: string;
    parseMode?: string;
    messageThreadId?: number;
    notificationType?: string;
  }): Promise<boolean> => {
    if (!bot || !cachedChatId) {
      logger.warn('Telegram Bot not configured, skipping notification');
      return false;
    }

    // 優先使用明確指定的 messageThreadId，其次根據 notificationType 查找
    const threadId = messageThreadId || getTopicIdForNotificationType(notificationType);

    try {
      const options: any = {
        parse_mode: parseMode as any || 'HTML',
      };
      if (threadId) {
        options.message_thread_id = threadId;
      }

      if (imageUrl) {
        await bot.sendPhoto(cachedChatId, imageUrl, {
          caption: text.substring(0, 1024),
          ...options,
        });
      } else {
        await bot.sendMessage(cachedChatId, text, options);
      }
      logger.info({ topic: threadId || 'general' }, 'Telegram notification sent successfully');
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

  sendReviewNotification: async ({
    title,
    body,
    url,
    imageUrl,
    notificationType,
  }: {
    title: string;
    body: string;
    url?: string;
    imageUrl?: string;
    notificationType?: string;
  }): Promise<boolean> => {
    let text = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`;
    if (url) {
      text += `\n\n<a href="${escapeHtmlAttribute(url)}">開啟審核</a>`;
    }
    return TelegramBotService.sendMessage({ text, imageUrl, parseMode: 'HTML', notificationType });
  },

  sendFanartReviewNotification: async ({
    stagingId,
    title,
    body,
    sourceUrl,
    imageUrl,
    contentType,
    artistName,
    artistHandle,
  }: {
    stagingId: string;
    title: string;
    body: string;
    sourceUrl?: string;
    imageUrl?: string;
    contentType?: string;
    artistName?: string;
    artistHandle?: string;
  }): Promise<boolean> => {
    if (!bot || !cachedChatId) {
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

    const threadId = await getTopicIdForFanartReview({ contentType, artistName, artistHandle });

    try {
      const options: any = {
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      };
      if (threadId) {
        options.message_thread_id = threadId;
      }

      if (imageUrl) {
        try {
          await bot.sendPhoto(cachedChatId, imageUrl, {
            caption: text.substring(0, 1024),
            ...options,
          });
        } catch (err) {
          logger.warn({ err }, 'Failed to send Telegram fanart review photo, falling back to message');
          await bot.sendMessage(cachedChatId, text, options);
        }
      } else {
        await bot.sendMessage(cachedChatId, text, options);
      }

      logger.info({ topic: threadId || 'general' }, 'Telegram fanart review notification sent successfully');
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

  /**
   * 重新建立 topics（admin 手動觸發）
   */
  reinitializeTopics: async (): Promise<Record<TopicCategory, number | null>> => {
    // 清除靜態 topic 緩存，強制重建。畫師 topics 會按需建立。
    cachedTopicIds = { notification: null, fanart: null };
    await initializeTopics();
    return getTelegramTopicIds();
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
