export interface TwitterMedia {
  url: string;        // 真實的直連網址 (圖片或 mp4)
  type: string;       // 'image', 'video', 'gif'
  thumbnail?: string; // 如果是影片，這裡會有預覽圖網址
  text?: string;      // 推文原文
  user_name?: string; // 推主名字
  user_screen_name?: string; // 推主用戶名 (@後的字串)
  date?: string;      // 發布時間
  tweet_id?: string;  // 真正含有媒體的推文 ID（轉推時為原推文 ID）
  tweet_url?: string; // 真正含有媒體的推文網址
  requested_tweet_id?: string; // 輸入網址上的推文 ID
  like_count?: number | null;
  retweet_count?: number | null;
  view_count?: number | null;
  hashtags?: string[] | null;
}

import { logger } from '../utils/logger.js';

const ZUTOMAYO_ART_STATUS_URL = 'https://x.com/zutomayo_art/status/';
const X_STATUS_URL = 'https://x.com/i/status/';
const X_FETCH_TIMEOUT_MS = 8000;

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'statusText' | 'text'>>;

export interface RssTweetItem {
  title?: string;
  link?: string;
  description?: string;
  content?: string;
  contentSnippet?: string;
  creator?: string;
  author?: string;
  categories?: string[];
  pubDate?: string;
  isoDate?: string;
}

export interface TwitterExtractOptions {
  fetch?: FetchLike;
}

export const normalizeTweetUrl = (tweetUrl: string) => (
  tweetUrl.trim().replace(ZUTOMAYO_ART_STATUS_URL, X_STATUS_URL)
);

export const buildCanonicalTweetUrl = (tweetId: string) => `${X_STATUS_URL}${tweetId}`;

const parseTweetUrl = (tweetUrl: string): URL | null => {
  const normalized = normalizeTweetUrl(tweetUrl);
  const urlText = /^[a-z][a-z\d+.-]*:\/\//i.test(normalized) ? normalized : `https://${normalized}`;

  try {
    const url = new URL(urlText);
    const host = url.hostname.toLowerCase();
    if (!['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com'].includes(host)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
};

export const extractTweetId = (tweetUrl: string) => {
  const url = parseTweetUrl(tweetUrl);
  if (!url) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  const statusIndex = parts.lastIndexOf('status');
  const id = statusIndex >= 0 ? parts[statusIndex + 1] : null;
  return id && /^\d+$/.test(id) ? id : null;
};

const readTweetId = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  return null;
};

const firstTweetId = (...values: unknown[]): string | null => {
  for (const value of values) {
    const id = typeof value === 'string' && value.includes('/status/')
      ? extractTweetId(value)
      : readTweetId(value);
    if (id) return id;
  }
  return null;
};

const readCount = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      if (/^\d+$/.test(normalized)) return Number(normalized);
    }
  }
  return null;
};

const normalizeHashtags = (hashtags: unknown): string[] => {
  if (!Array.isArray(hashtags)) return [];
  return hashtags
    .map((tag: any) => {
      if (typeof tag === 'string') return tag;
      return tag?.text || tag?.tag || tag?.name || '';
    })
    .map((tag) => String(tag).replace(/^#/, '').trim())
    .filter(Boolean);
};

const parseHashtagsFromText = (text: unknown): string[] => {
  if (typeof text !== 'string') return [];
  return Array.from(text.matchAll(/(?:^|\s)#([^\s#]+)/gu))
    .map((match) => match[1].replace(/[。、，,.!?！？:：;；)）\]】]+$/u, '').trim())
    .filter(Boolean);
};

const readHashtags = (sourceData: any, data: any): string[] | null => {
  const tags = [
    ...normalizeHashtags(sourceData?.hashtags),
    ...normalizeHashtags(sourceData?.entities?.hashtags),
    ...normalizeHashtags(data?.hashtags),
    ...normalizeHashtags(data?.entities?.hashtags),
    ...parseHashtagsFromText(sourceData?.full_text || sourceData?.text || data?.full_text || data?.text),
  ];
  const uniqueTags = Array.from(new Set(tags));
  return uniqueTags.length > 0 ? uniqueTags : null;
};

const decodeHtmlEntitiesOnce = (value: string): string => (
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
);

const decodePossiblyEscapedHtml = (value: string): string => {
  let decoded = value;
  for (let i = 0; i < 3; i++) {
    const next = decodeHtmlEntitiesOnce(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
};

const readAttributes = (tag: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    attrs[match[1].toLowerCase()] = decodePossiblyEscapedHtml(match[2] || match[3] || match[4] || '');
  }
  return attrs;
};

const normalizeTwitterImageUrl = (url: string): string => {
  try {
    const parsed = new URL(decodePossiblyEscapedHtml(url));
    if (parsed.hostname === 'pbs.twimg.com') {
      parsed.searchParams.set('name', 'orig');
      return parsed.toString();
    }
    return parsed.toString();
  } catch {
    return decodePossiblyEscapedHtml(url);
  }
};

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const parseRssAuthor = (item: RssTweetItem) => {
  const source = item.creator || item.author || item.title || '';
  const match = source.match(/^\s*(.*?)\s*\(@([A-Za-z0-9_]+)\)/);
  if (match) return { name: match[1].trim(), screenName: match[2].trim() };
  const handle = source.match(/@([A-Za-z0-9_]+)/)?.[1] || '';
  const name = source.replace(/\(@?[A-Za-z0-9_]+\)/, '').trim();
  return { name: name || source.trim(), screenName: handle };
};

const stripHtml = (value: string): string => (
  decodePossiblyEscapedHtml(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const parseRssText = (item: RssTweetItem) => {
  const rawText = item.contentSnippet || stripHtml(item.description || item.content || item.title || '');
  const author = parseRssAuthor(item);
  const prefix = author.screenName
    ? new RegExp(`^\\s*${author.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(@${author.screenName}\\):\\s*`)
    : null;
  return prefix ? rawText.replace(prefix, '').trim() : rawText;
};

const parseRssHashtags = (item: RssTweetItem, text: string): string[] | null => {
  const tags = [
    ...(Array.isArray(item.categories) ? item.categories : []),
    ...parseHashtagsFromText(item.title),
    ...parseHashtagsFromText(item.description),
    ...parseHashtagsFromText(text),
  ].map((tag) => String(tag).replace(/^#/, '').trim()).filter(Boolean);
  const deduped = unique(tags);
  return deduped.length > 0 ? deduped : null;
};

const readRssDate = (item: RssTweetItem): string | undefined => {
  const value = item.isoDate || item.pubDate;
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

const extractRssMediaElements = (item: RssTweetItem) => {
  const html = decodePossiblyEscapedHtml([item.description, item.content].filter(Boolean).join(' '));
  const media: Array<Pick<TwitterMedia, 'url' | 'type' | 'thumbnail'>> = [];
  const seen = new Set<string>();
  const push = (entry: Pick<TwitterMedia, 'url' | 'type' | 'thumbnail'>) => {
    if (!entry.url || seen.has(entry.url)) return;
    seen.add(entry.url);
    media.push(entry);
  };

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = readAttributes(match[0]);
    const src = attrs.src || attrs['data-src'];
    if (src) push({ url: normalizeTwitterImageUrl(src), type: 'image' });
  }

  for (const match of html.matchAll(/<video\b[\s\S]*?<\/video>|<video\b[^>]*>/gi)) {
    const attrs = readAttributes(match[0]);
    let src = attrs.src || '';
    const sourceMatch = match[0].match(/<source\b[^>]*>/i);
    if (!src && sourceMatch) src = readAttributes(sourceMatch[0]).src || '';
    const thumbnail = attrs.poster || attrs.thumbnail || attrs['data-poster'];
    if (src) {
      push({
        url: decodePossiblyEscapedHtml(src),
        type: src.includes('.mp4') ? 'video' : 'gif',
        thumbnail: thumbnail ? normalizeTwitterImageUrl(thumbnail) : undefined,
      });
    } else if (thumbnail) {
      push({ url: normalizeTwitterImageUrl(thumbnail), type: 'image' });
    }
  }

  return media;
};

/**
 * 嘗試從 RSS 內容中提取原推 ID（用於轉推去重）。
 * 轉推的 RSS description/content 通常包含原推連結。
 */
const extractOriginalTweetIdFromRss = (item: RssTweetItem): string | null => {
  const html = [item.description, item.content].filter(Boolean).join(' ');
  if (!html) return null;
  // 從 HTML 中找 Twitter status 連結，取第一個（通常是原推）
  const linkMatch = html.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i);
  return linkMatch ? linkMatch[1] : null;
};

const buildMediaFromRssItem = (item: RssTweetItem, requestedTweetId: string, sourceTweetId = requestedTweetId): TwitterMedia[] => {
  const text = parseRssText(item);
  const author = parseRssAuthor(item);
  const tweetUrl = buildCanonicalTweetUrl(sourceTweetId);
  const date = readRssDate(item);
  const hashtags = parseRssHashtags(item, text);
  return extractRssMediaElements(item).map((media) => ({
    ...media,
    text,
    user_name: author.name,
    user_screen_name: author.screenName,
    date,
    tweet_id: sourceTweetId,
    tweet_url: tweetUrl,
    requested_tweet_id: requestedTweetId,
    like_count: null,
    retweet_count: null,
    view_count: null,
    hashtags,
  }));
};

const readHtmlMetaTags = (html: string): Record<string, string[]> => {
  const meta: Record<string, string[]> = {};
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = readAttributes(match[0]);
    const key = (attrs.property || attrs.name || '').toLowerCase();
    const content = attrs.content;
    if (!key || !content) continue;
    meta[key] = [...(meta[key] || []), content];
  }
  return meta;
};

const firstMetaValue = (meta: Record<string, string[]>, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = meta[key.toLowerCase()]?.find((item) => item.trim());
    if (value) return value;
  }
  return undefined;
};

const normalizeMetaMediaUrl = (url: string, type: string): string => (
  type === 'image' ? normalizeTwitterImageUrl(url) : decodePossiblyEscapedHtml(url)
);

const buildMediaFromHtmlMeta = (html: string, requestedTweetId: string): TwitterMedia[] => {
  const meta = readHtmlMetaTags(html);
  const text = firstMetaValue(meta, 'twitter:description', 'og:description') || '';
  const title = firstMetaValue(meta, 'twitter:title', 'og:title') || '';
  const author = firstMetaValue(meta, 'author', 'twitter:creator', 'article:author') || '';
  const imageUrls = unique([
    ...(meta['og:image'] || []),
    ...(meta['twitter:image'] || []),
  ].map((url) => normalizeMetaMediaUrl(url, 'image')).filter(Boolean));
  const videoUrls = unique([
    ...(meta['og:video'] || []),
    ...(meta['twitter:player:stream'] || []),
  ].map((url) => normalizeMetaMediaUrl(url, 'video')).filter(Boolean));
  const tweetUrl = buildCanonicalTweetUrl(requestedTweetId);
  const hashtags = parseHashtagsFromText(text || title);
  const common = {
    text: text || title || undefined,
    user_name: author || undefined,
    tweet_id: requestedTweetId,
    tweet_url: tweetUrl,
    requested_tweet_id: requestedTweetId,
    like_count: null,
    retweet_count: null,
    view_count: null,
    hashtags: hashtags.length > 0 ? hashtags : null,
  };
  const seen = new Set<string>();
  const media: TwitterMedia[] = [];
  const push = (entry: Pick<TwitterMedia, 'url' | 'type' | 'thumbnail'>) => {
    if (!entry.url || seen.has(entry.url)) return;
    seen.add(entry.url);
    media.push({ ...entry, ...common });
  };

  imageUrls.forEach((url) => push({ url, type: 'image' }));
  videoUrls.forEach((url) => push({
    url,
    type: url.includes('.mp4') ? 'video' : 'gif',
    thumbnail: imageUrls[0],
  }));

  return media;
};

const extractBalancedJson = (text: string, start: number): string | null => {
  const firstBrace = text.indexOf('{', start);
  if (firstBrace < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(firstBrace, i + 1);
    }
  }
  return null;
};

const parseJsonStatesFromHtml = (html: string): unknown[] => {
  const states: unknown[] = [];
  const starts = [
    ...Array.from(html.matchAll(/window\.__INITIAL_STATE__\s*=/g)).map((match) => match.index || 0),
    ...Array.from(html.matchAll(/<script[^>]+type=["']application\/json["'][^>]*>/gi)).map((match) => (match.index || 0) + match[0].length),
  ];
  for (const start of starts) {
    const json = extractBalancedJson(html, start);
    if (!json) continue;
    try {
      states.push(JSON.parse(json));
    } catch {
      // Ignore unrelated script JSON.
    }
  }
  return states;
};

const isObject = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === 'object');

const walkObjects = (value: unknown, visitor: (obj: Record<string, any>) => void, seen = new Set<object>()) => {
  if (!isObject(value) || seen.has(value)) return;
  seen.add(value);
  visitor(value);
  if (Array.isArray(value)) {
    value.forEach((item) => walkObjects(item, visitor, seen));
    return;
  }
  Object.values(value).forEach((item) => walkObjects(item, visitor, seen));
};

const collectTweetObjects = (states: unknown[]): any[] => {
  const tweets: any[] = [];
  for (const state of states) {
    walkObjects(state, (obj) => {
      const id = firstTweetId(obj.rest_id, obj.id_str, obj.id, obj.tweet_id, obj.tweetID);
      if (!id) return;
      if (obj.legacy || obj.core || obj.extended_entities || obj.entities || obj.media_extended) tweets.push(obj);
    });
  }
  const seen = new Set<string>();
  return tweets.filter((tweet) => {
    const key = `${firstTweetId(tweet.rest_id, tweet.id_str, tweet.id, tweet.tweet_id, tweet.tweetID)}:${tweet.legacy?.full_text || tweet.full_text || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const findNestedTweet = (value: unknown): any | null => {
  let found: any | null = null;
  walkObjects(value, (obj) => {
    if (found) return;
    const id = firstTweetId(obj.rest_id, obj.id_str, obj.id, obj.tweet_id, obj.tweetID);
    if (id && (obj.legacy || obj.core || obj.extended_entities || obj.entities || obj.media_extended)) found = obj;
  });
  return found;
};

const resolveOriginalTweet = (tweet: any): any => {
  const candidates = [
    tweet?.legacy?.retweeted_status_result?.result,
    tweet?.retweeted_status_result?.result,
    tweet?.retweeted_status,
    tweet?.retweeted_tweet,
    tweet?.retweetedTweet,
  ];
  for (const candidate of candidates) {
    const nested = findNestedTweet(candidate);
    if (nested) return nested;
  }
  return tweet;
};

const readUserFromTweet = (tweet: any) => {
  const user = tweet?.core?.user_results?.result || tweet?.user_results?.result || tweet?.user || {};
  const legacy = user?.legacy || user;
  return {
    name: legacy?.name || tweet?.user_name || '',
    screenName: legacy?.screen_name || legacy?.screenName || tweet?.user_screen_name || '',
  };
};

const normalizeTwitterCreatedAt = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

const chooseBestVideoVariant = (variants: any[]): string | null => {
  const mp4 = variants
    .filter((variant) => typeof variant?.url === 'string' && variant.url.includes('.mp4'))
    .sort((a, b) => (readCount(b?.bitrate) ?? 0) - (readCount(a?.bitrate) ?? 0));
  return mp4[0]?.url || null;
};

const readTweetMedia = (tweet: any): Array<Pick<TwitterMedia, 'url' | 'type' | 'thumbnail'>> => {
  const legacy = tweet?.legacy || tweet;
  const rawMedia = [
    ...(Array.isArray(legacy?.extended_entities?.media) ? legacy.extended_entities.media : []),
    ...(Array.isArray(legacy?.entities?.media) ? legacy.entities.media : []),
    ...(Array.isArray(tweet?.extended_entities?.media) ? tweet.extended_entities.media : []),
    ...(Array.isArray(tweet?.media_extended) ? tweet.media_extended : []),
  ];
  const seen = new Set<string>();
  const media: Array<Pick<TwitterMedia, 'url' | 'type' | 'thumbnail'>> = [];
  for (const item of rawMedia) {
    const itemType = item?.type || item?.media_type;
    let url = item?.media_url_https || item?.media_url || item?.url;
    let type = itemType === 'photo' ? 'image' : itemType;
    if (itemType === 'video' || itemType === 'animated_gif') {
      url = chooseBestVideoVariant(item?.video_info?.variants || []) || item?.media_url_https || item?.media_url || item?.url;
      type = itemType === 'animated_gif' ? 'gif' : 'video';
    }
    if (!url || seen.has(url)) continue;
    seen.add(url);
    media.push({
      url: type === 'image' ? normalizeTwitterImageUrl(url) : decodePossiblyEscapedHtml(url),
      type: type || 'image',
      thumbnail: item?.media_url_https ? normalizeTwitterImageUrl(item.media_url_https) : undefined,
    });
  }
  return media;
};

const buildMediaFromTweetState = (requestedTweetId: string, states: unknown[]): TwitterMedia[] => {
  const sourceTweet = resolveSourceTweetFromStates(requestedTweetId, states);
  if (!sourceTweet) return [];
  const sourceTweetId = firstTweetId(sourceTweet?.rest_id, sourceTweet?.id_str, sourceTweet?.id) || requestedTweetId;
  const media = readTweetMedia(sourceTweet);
  if (media.length === 0) return [];
  const legacy = sourceTweet?.legacy || sourceTweet;
  const user = readUserFromTweet(sourceTweet);
  const hashtags = readHashtags(legacy, sourceTweet);
  return media.map((item) => ({
    ...item,
    text: legacy?.full_text || legacy?.text || sourceTweet?.text,
    user_name: user.name,
    user_screen_name: user.screenName,
    date: normalizeTwitterCreatedAt(legacy?.created_at || sourceTweet?.created_at),
    tweet_id: sourceTweetId,
    tweet_url: buildCanonicalTweetUrl(sourceTweetId),
    requested_tweet_id: requestedTweetId,
    like_count: readCount(legacy?.favorite_count, legacy?.like_count, sourceTweet?.like_count),
    retweet_count: readCount(legacy?.retweet_count, sourceTweet?.retweet_count),
    view_count: readCount(sourceTweet?.views?.count, legacy?.view_count, sourceTweet?.view_count),
    hashtags,
  }));
};

const resolveSourceTweetFromStates = (requestedTweetId: string, states: unknown[]): any | null => {
  const tweets = collectTweetObjects(states);
  const requestedTweet = tweets.find((tweet) => firstTweetId(tweet.rest_id, tweet.id_str, tweet.id) === requestedTweetId) || tweets[0];
  return requestedTweet ? resolveOriginalTweet(requestedTweet) : null;
};

const enrichFallbackMediaFromTweetState = (fallbackMedia: TwitterMedia[], requestedTweetId: string, states: unknown[]): TwitterMedia[] => {
  if (fallbackMedia.length === 0) return fallbackMedia;
  const sourceTweet = resolveSourceTweetFromStates(requestedTweetId, states);
  if (!sourceTweet) return fallbackMedia;
  const sourceTweetId = firstTweetId(sourceTweet?.rest_id, sourceTweet?.id_str, sourceTweet?.id) || requestedTweetId;
  const legacy = sourceTweet?.legacy || sourceTweet;
  const user = readUserFromTweet(sourceTweet);
  const hashtags = readHashtags(legacy, sourceTweet);
  return fallbackMedia.map((media) => ({
    ...media,
    text: legacy?.full_text || legacy?.text || sourceTweet?.text || media.text,
    user_name: user.name || media.user_name,
    user_screen_name: user.screenName || media.user_screen_name,
    date: normalizeTwitterCreatedAt(legacy?.created_at || sourceTweet?.created_at) || media.date,
    tweet_id: sourceTweetId,
    tweet_url: buildCanonicalTweetUrl(sourceTweetId),
    requested_tweet_id: requestedTweetId,
    like_count: readCount(legacy?.favorite_count, legacy?.like_count, sourceTweet?.like_count) ?? media.like_count,
    retweet_count: readCount(legacy?.retweet_count, sourceTweet?.retweet_count) ?? media.retweet_count,
    view_count: readCount(sourceTweet?.views?.count, legacy?.view_count, sourceTweet?.view_count) ?? media.view_count,
    hashtags: hashtags || media.hashtags,
  }));
};

const fetchXTweetHtml = async (tweetId: string, fetchFn: FetchLike): Promise<string | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), X_FETCH_TIMEOUT_MS);
  try {
    const response = await fetchFn(buildCanonicalTweetUrl(tweetId), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'Mozilla/5.0 (compatible; zutomayo-gallery/1.0)',
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    logger.warn({ err: error, tweetId }, 'x.com 推文補強失敗，改用 RSS item');
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const TwitterService = {
  /**
   * 從 RSSHub item 解析媒體資料。x.com 補強失敗時也會走這條 fallback。
   */
  async extractMediaFromRssItem(item: RssTweetItem, _options: TwitterExtractOptions = {}): Promise<TwitterMedia[]> {
    const requestedTweetId = extractTweetId(item.link || '');
    if (!requestedTweetId) throw new Error('RSS item 缺少有效推文網址');
    return buildMediaFromRssItem(item, requestedTweetId);
  },

  /**
   * RSS-first 解析推文媒體，並以 x.com HTML/JSON 狀態補強 RT 原推資訊。
   */
  async extractMediaFromTweet(tweetUrl: string, rssItem?: RssTweetItem, options: TwitterExtractOptions = {}): Promise<TwitterMedia[]> {
    const requestedTweetId = extractTweetId(tweetUrl);
    if (!requestedTweetId) throw new Error('無效的推文網址格式');

    // 嘗試從 RSS 內容解析原推 ID（轉推去重用）
    const rssOriginalId = rssItem ? extractOriginalTweetIdFromRss(rssItem) : null;
    const effectiveSourceId = rssOriginalId || requestedTweetId;
    const fallbackMedia = rssItem ? buildMediaFromRssItem(rssItem, requestedTweetId, effectiveSourceId) : [];
    const fetchFn = options.fetch || fetch;
    const html = await fetchXTweetHtml(requestedTweetId, fetchFn);
    if (!html) return fallbackMedia;

    const states = parseJsonStatesFromHtml(html);
    const enrichedMedia = buildMediaFromTweetState(requestedTweetId, states);
    if (enrichedMedia.length > 0) return enrichedMedia;

    const enrichedFallbackMedia = enrichFallbackMediaFromTweetState(fallbackMedia, requestedTweetId, states);
    if (enrichedFallbackMedia.length > 0) return enrichedFallbackMedia;

    return buildMediaFromHtmlMeta(html, requestedTweetId);
  },
};
