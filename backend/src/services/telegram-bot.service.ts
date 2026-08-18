import TelegramBot from 'node-telegram-bot-api';
import { Op } from 'sequelize';
import { ArtistModel, SysConfigModel } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { errorEventEmitter } from './error-events.service.js';
import {
  deserializeArtistTopicIds,
  serializeArtistTopicIds,
  type ArtistTopicEntry,
  type ArtistTopicIds,
} from './telegram-topic-cache.js';

const CONFIG_KEY = 'telegram_config';
const TELEGRAM_PHOTO_CAPTION_LIMIT = 1024;

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
export type TopicCategory = 'notification' | 'fanart' | 'fallback';
export type { ArtistTopicEntry, ArtistTopicIds };

// Topic 配置：每個分類對應的 topic 名稱和顏色
const TOPIC_DEFINITIONS: Record<TopicCategory, { name: string; iconColor: number }> = {
  notification: { name: '系統通知', iconColor: 0xFFD700 },  // 金色
  fanart: { name: '二創相關', iconColor: 0xFF69B4 },        // 粉色
  fallback: { name: '未分類', iconColor: 0x808080 },        // 灰色
};

// topic ID 緩存
let cachedTopicIds: Record<TopicCategory, number | null> = {
  notification: null,
  fanart: null,
  fallback: null,
};
let cachedArtistTopicIds = new Map<string, ArtistTopicEntry>();

function initBot(token: string) {
  if (!token) {
    bot = null;
    return;
  }
  try {
    const baseApiUrl = String(process.env.TELEGRAM_API_BASE_URL || '').replace(/\/+$/, '');
    if (!baseApiUrl) throw new Error('TELEGRAM_API_BASE_URL is required');
    bot = new TelegramBot(token, { polling: false, baseApiUrl });
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
        fallback: dbConfig.topic_ids.fallback || null,
      };
    }
    cachedArtistTopicIds = deserializeArtistTopicIds(dbConfig.artist_topic_ids || {});

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

  if (cachedTopicIds.notification && cachedTopicIds.fanart && cachedTopicIds.fallback) {
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
    dbConfig.artist_topic_ids = serializeArtistTopicIds(cachedArtistTopicIds);

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
  return serializeArtistTopicIds(cachedArtistTopicIds);
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
}): Promise<{ id: string; name: string; twitter?: string | null } | null> {
  const normalizedHandle = normalizeTwitterHandle(artistHandle);
  const normalizedName = (artistName || '').trim();
  if (!normalizedHandle && !normalizedName) return null;

  // 1. 精確匹配 handle（最可靠）
  if (normalizedHandle) {
    const artist = await ArtistModel.findOne({ where: { twitter: { [Op.iLike]: normalizedHandle } } as any });
    if (artist) {
      return {
        id: String(artist.get('id')),
        name: String(artist.get('name') || '').trim(),
        twitter: artist.get('twitter') as string | null | undefined,
      };
    }
  }

  // 2. 精確匹配名稱
  if (normalizedName) {
    const artist = await ArtistModel.findOne({ where: { name: { [Op.iLike]: normalizedName } } as any });
    if (artist) {
      return {
        id: String(artist.get('id')),
        name: String(artist.get('name') || '').trim(),
        twitter: artist.get('twitter') as string | null | undefined,
      };
    }
  }

  return null;
}

let findArtistForTopicImpl = findArtistForTopic;

async function ensureArtistTopic(artistId: string, artistName: string): Promise<number | undefined> {
  const topicKey = artistId.trim();
  const topicName = artistName.trim();
  if (!topicKey || !topicName) return undefined;

  const cached = cachedArtistTopicIds.get(topicKey);
  if (cached) return cached.thread_id;

  if (!bot || !cachedChatId) return undefined;
  const chatId = parseInt(cachedChatId, 10);
  if (isNaN(chatId)) return undefined;

  try {
    const topic = await bot.createForumTopic(chatId, topicName, {
      icon_color: 0x6FB1E4,
    }) as any;
    const threadId = topic.message_thread_id;
    if (typeof threadId !== 'number') return undefined;

    cachedArtistTopicIds.set(topicKey, { name: topicName, thread_id: threadId });
    await saveTopicIds();
    logger.info({ artistId: topicKey, artistName: topicName, threadId }, 'Created Telegram artist topic');
    return threadId;
  } catch (err) {
    logger.warn({ err, artistName: topicName }, 'Failed to create Telegram artist topic');
    return undefined;
  }
}

let ensureArtistTopicImpl = ensureArtistTopic;

async function renameArtistTopic(artistId: string, newName: string): Promise<boolean> {
  const topicKey = artistId.trim();
  const topicName = newName.trim();
  if (!topicKey || !topicName) return false;

  const cached = cachedArtistTopicIds.get(topicKey);
  if (!cached) return false;
  if (cached.name === topicName) return true;

  if (!bot || !cachedChatId) return false;
  const chatId = parseInt(cachedChatId, 10);
  if (isNaN(chatId)) return false;

  try {
    await bot.editForumTopic(chatId, cached.thread_id, { name: topicName });
    cached.name = topicName;
    cachedArtistTopicIds.set(topicKey, cached);
    await saveTopicIds();
    logger.info({ artistId: topicKey, newName: topicName, threadId: cached.thread_id }, 'Renamed Telegram artist topic');
    return true;
  } catch (err) {
    logger.warn({ err, artistId: topicKey, newName: topicName }, 'Failed to rename Telegram artist topic');
    return false;
  }
}

export async function syncArtistTopicName(artistId: string, newName: string): Promise<boolean> {
  return renameArtistTopic(artistId, newName);
}

async function getTopicIdForFanartReview({
  contentType,
  artistName,
  artistHandle,
  separateTopic,
  label,
}: {
  contentType?: string;
  artistName?: string;
  artistHandle?: string;
  separateTopic?: boolean;
  label?: string;
}): Promise<number | undefined> {
  if (separateTopic) {
    try {
      const normalizedHandle = normalizeTwitterHandle(artistHandle);
      const topicName = (label || artistName || artistHandle || '').trim();
      const topicKey = normalizedHandle ? `handle:${normalizedHandle}` : `name:${topicName}`;
      if (topicName) {
        const topicId = await ensureArtistTopicImpl(topicKey, topicName);
        if (topicId) return topicId;
      }
    } catch (err) {
      logger.warn({ err, artistName, artistHandle }, 'Failed to resolve Telegram separate topic; falling back to fallback topic');
    }
    // separateTopic=true 但找不到畫師 → fallback topic（不混進 fanart）
    return cachedTopicIds.fallback || undefined;
  }

  if (contentType !== 'official') {
    return cachedTopicIds.fanart || undefined;
  }

  try {
    const artist = await findArtistForTopicImpl({ artistName, artistHandle });
    if (!artist?.id || !artist.name) return cachedTopicIds.fallback || undefined;

    const artistTopicId = await ensureArtistTopicImpl(artist.id, artist.name);
    return artistTopicId || cachedTopicIds.fallback || undefined;
  } catch (err) {
    logger.warn({ err, artistName, artistHandle }, 'Failed to resolve Telegram official artist topic; falling back to fallback topic');
    return cachedTopicIds.fallback || undefined;
  }
}

export function __testSetTelegramTopicState(overrides?: {
  topicIds?: Partial<Record<TopicCategory, number | null>>;
  artistTopicIds?: ArtistTopicIds;
  findArtistForTopic?: typeof findArtistForTopic;
  ensureArtistTopic?: typeof ensureArtistTopic;
}): void {
  cachedTopicIds = {
    notification: null,
    fanart: null,
    fallback: null,
    ...(overrides?.topicIds || {}),
  };
  cachedArtistTopicIds = deserializeArtistTopicIds(overrides?.artistTopicIds || {});
  findArtistForTopicImpl = overrides?.findArtistForTopic || findArtistForTopic;
  ensureArtistTopicImpl = overrides?.ensureArtistTopic || ensureArtistTopic;
}

export const __testResolveTopicIdForFanartReview = getTopicIdForFanartReview;

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
    separateTopic,
    label,
  }: {
    stagingId: string;
    title: string;
    body: string;
    sourceUrl?: string;
    imageUrl?: string;
    contentType?: string;
    artistName?: string;
    artistHandle?: string;
    separateTopic?: boolean;
    label?: string;
  }): Promise<boolean> => {
    if (!bot || !cachedChatId) {
      logger.warn('Telegram Bot not configured, skipping fanart review notification');
      return false;
    }

    const text = buildFanartReviewMessage(title, body, sourceUrl);
    const photoCaption = buildFanartReviewPhotoCaption(title, body, sourceUrl);

    const replyMarkup = {
      inline_keyboard: [[
        { text: '批准', callback_data: buildFanartReviewCallbackData('approve', stagingId) },
        { text: '暫存觀察', callback_data: buildFanartReviewCallbackData('hold', stagingId) },
        { text: '拒絕', callback_data: buildFanartReviewCallbackData('reject', stagingId) },
      ]]
    };

    const threadId = await getTopicIdForFanartReview({ contentType, artistName, artistHandle, separateTopic, label });

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
            caption: photoCaption,
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
    cachedTopicIds = { notification: null, fanart: null, fallback: null };
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

export function buildFanartReviewPhotoCaption(title: string, body: string, sourceUrl?: string): string {
  const fullMessage = buildFanartReviewMessage(title, body, sourceUrl);
  if (fullMessage.length <= TELEGRAM_PHOTO_CAPTION_LIMIT) return fullMessage;

  const escapedTitle = escapeHtmlToLength(title, 256);
  const prefix = `<b>${escapedTitle}</b>\n\n`;
  const suffix = '…';
  const bodyLimit = Math.max(0, TELEGRAM_PHOTO_CAPTION_LIMIT - prefix.length - suffix.length);
  return `${prefix}${escapeHtmlToLength(body, bodyLimit)}${suffix}`;
}

function buildFanartReviewMessage(title: string, body: string, sourceUrl?: string): string {
  let text = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`;
  if (sourceUrl) {
    text += `\n\n<a href="${escapeHtmlAttribute(sourceUrl)}">開啟原推文</a>`;
  }
  return text;
}

function escapeHtmlToLength(value: string, maxLength: number): string {
  let escaped = '';
  for (const character of value) {
    const next = escapeHtml(character);
    if (escaped.length + next.length > maxLength) break;
    escaped += next;
  }
  return escaped;
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
