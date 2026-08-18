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
  retweeted_by_handle?: string; // requested tweet 為轉推時的轉推者
  like_count?: number | null;
  retweet_count?: number | null;
  view_count?: number | null;
  hashtags?: string[] | null;
}

import { logger } from '../utils/logger.js';
import { isTwitterImageUrl } from '../utils/media-source.js';
import { requireConfiguredUrl } from '../config/urls.js';

const TWITTER_WEB_ORIGIN = requireConfiguredUrl('TWITTER_WEB_ORIGIN');
const TWITTER_IMAGE_ORIGIN = requireConfiguredUrl('TWITTER_IMAGE_ORIGIN');
const TWITTER_VIDEO_ORIGIN = requireConfiguredUrl('TWITTER_VIDEO_ORIGIN');
const TWITTER_ALLOWED_HOSTS = [TWITTER_WEB_ORIGIN, ...String(process.env.TWITTER_LEGACY_ORIGINS || '').split(',')]
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
    try { return new URL(origin).hostname.toLowerCase(); } catch { return ''; }
  })
  .filter(Boolean);
const ZUTOMAYO_ART_STATUS_URL = `${TWITTER_WEB_ORIGIN}/zutomayo_art/status/`;
const X_STATUS_URL = `${TWITTER_WEB_ORIGIN}/i/status/`;
const X_FETCH_TIMEOUT_MS = 8000;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TWITTER_IMAGE_ORIGIN_PATTERN = escapeRegExp(TWITTER_IMAGE_ORIGIN);
const TWITTER_VIDEO_ORIGIN_PATTERN = escapeRegExp(TWITTER_VIDEO_ORIGIN);

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
    if (!TWITTER_ALLOWED_HOSTS.includes(host)) {
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
    if (isTwitterImageUrl(parsed.toString())) {
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
  const html = decodePossiblyEscapedHtml([item.description, item.content].filter(Boolean).join(' '));
  if (!html) return null;
  // 從允許的 Twitter Web origins 中找 status 連結，取第一個（通常是原推）。
  for (const match of html.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    const tweetId = extractTweetId(match[0].replace(/&amp;.*$/i, ''));
    if (tweetId) return tweetId;
  }
  return null;
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
    retweeted_by_handle: sourceTweetId !== requestedTweetId ? author.screenName || undefined : undefined,
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

// Twitter Web 對敏感/年齡限制推文用 BlurredMediaTombstone 取代 ApiMediaEntity，
// 只暴露 blurred_image_url（模糊縮圖），但媒體 ID 是真實的，可構建 orig URL。
// 也涵蓋 <link rel="preload" as="image"> 暴露媒體 ID 的情況。
const buildMediaFromPreloadImages = (html: string, requestedTweetId: string): TwitterMedia[] => {
  const escapedTweetId = requestedTweetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasRequestedTombstone = new RegExp(`TweetResults:${escapedTweetId}(?=[:"])`).test(html)
    && /__typename:"BlurredMediaTombstone"/.test(html);
  if (!hasRequestedTombstone) return [];

  const seen = new Set<string>();
  const urls: string[] = [];

  // 1. 從 RSC payload 的 BlurredMediaTombstone 抓 blurred_image_url
  const blurRegex = new RegExp(`blurred_image_url:"(${TWITTER_IMAGE_ORIGIN_PATTERN}/media/[^"]+)"`, 'g');
  let m: RegExpExecArray | null;
  while ((m = blurRegex.exec(html)) !== null) {
    const rawUrl = m[1].replace(/&amp;/g, '&');
    const mediaIdMatch = rawUrl.match(/\/media\/([^?/]+)/);
    if (!mediaIdMatch) continue;
    const origUrl = `${TWITTER_IMAGE_ORIGIN}/media/${mediaIdMatch[1]}?format=jpg&name=orig`;
    if (seen.has(origUrl)) continue;
    seen.add(origUrl);
    urls.push(origUrl);
  }

  // 2. 從 <link rel="preload" as="image"> 抓媒體 URL
  const preloadRegex = new RegExp(`<link[^>]+rel="preload"[^>]+as="image"[^>]+href="(${TWITTER_IMAGE_ORIGIN_PATTERN}/media/[^"]+)"`, 'g');
  while ((m = preloadRegex.exec(html)) !== null) {
    const rawUrl = m[1].replace(/&amp;/g, '&');
    const mediaIdMatch = rawUrl.match(/\/media\/([^?/]+)/);
    if (!mediaIdMatch) continue;
    const origUrl = `${TWITTER_IMAGE_ORIGIN}/media/${mediaIdMatch[1]}?format=jpg&name=orig`;
    if (seen.has(origUrl)) continue;
    seen.add(origUrl);
    urls.push(origUrl);
  }

  if (urls.length === 0) return [];

  const tweetUrl = buildCanonicalTweetUrl(requestedTweetId);
  return urls.map((url) => ({
    url,
    type: 'image' as const,
    text: undefined,
    user_name: undefined,
    user_screen_name: undefined,
    date: undefined,
    tweet_id: requestedTweetId,
    tweet_url: tweetUrl,
    requested_tweet_id: requestedTweetId,
    like_count: null,
    retweet_count: null,
    view_count: null,
    hashtags: null,
  }));
};

const buildMediaFromHtmlMeta = (html: string, requestedTweetId: string): TwitterMedia[] => {
  const meta = readHtmlMetaTags(html);
  const text = firstMetaValue(meta, 'twitter:description', 'og:description') || '';
  const title = firstMetaValue(meta, 'twitter:title', 'og:title') || '';
  const author = firstMetaValue(meta, 'author', 'twitter:creator', 'article:author') || '';
  const imageUrls = unique([
    ...(meta['og:image'] || []),
    ...(meta['twitter:image'] || []),
  ].map((url) => normalizeMetaMediaUrl(url, 'image'))
    .filter((url): url is string => Boolean(url)
      && !url.includes('rweb/ssr/default')
      && !url.includes('profile_images') // og:image 可能是作者頭像，非推文媒體
    ));
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

// === RSC (React Server Components) payload 解析 ===
// Twitter Web 2024+ 將 SSR 從 __INITIAL_STATE__ JSON 遷移到 RSC payload，
// 格式特色：key 無引號、$R[N]={__ref:"..."} 物件引用、!0/!1 布林縮寫。
// 此函數從 RSC payload 用 regex 抓 media entities，並從 ld+json 補 metadata。

const decodeRscStringLiteral = (raw: string): string => {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
};

const readLdJsonSocialPosting = (html: string): {
  tweetId?: string;
  text?: string;
  userName?: string;
  userScreenName?: string;
  date?: string;
  likeCount?: number;
  retweetCount?: number;
  viewCount?: number;
} | null => {
  const matches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1]);
      if (parsed?.['@type'] !== 'SocialMediaPosting') continue;
      const stats: any[] = parsed.interactionStatistic || [];
      const findStat = (name: string) => stats.find((s) => s.name === name)?.userInteractionCount;
      const viewStat = stats.find((s) => !s.name && typeof s.interactionType === 'string' && s.interactionType.includes('ViewAction'))?.userInteractionCount;
      return {
        tweetId: parsed.identifier,
        text: parsed.articleBody || parsed.headline,
        userName: parsed.author?.name,
        userScreenName: typeof parsed.author?.alternateName === 'string' ? parsed.author.alternateName.replace(/^@/, '') : undefined,
        date: parsed.dateCreated || parsed.datePublished,
        likeCount: findStat('Likes'),
        retweetCount: findStat('Retweets'),
        viewCount: viewStat,
      };
    } catch {
      continue;
    }
  }
  return null;
};

const findRscVideoMp4Url = (html: string, mediaIdStr: string, startIndex: number, mediaUrlHttps?: string): string | null => {
  // 先嘗試 inline video_info（舊格式：video_info:{...variants...}）
  const videoInfoIdx = html.indexOf('video_info:', startIndex);
  if (videoInfoIdx >= 0) {
    let searchFrom = videoInfoIdx + 'video_info:'.length;
    const refMatch = html.slice(searchFrom).match(/^\$R\[\d+\]=/);
    if (refMatch) searchFrom += refMatch[0].length;
    const braceIdx = html.indexOf('{', searchFrom);
    // 只有當 { 緊接在 video_info: 或 $R[N]= 後，且不是 {__ref:...} 引用時，才當作 inline
    if (braceIdx >= 0 && braceIdx <= searchFrom + 5) {
      const peek = html.slice(braceIdx, braceIdx + 12);
      if (!peek.startsWith('{__ref:')) {
        // 括號配對抓出 video_info 物件
        let depth = 0;
        let inStr = false;
        let escaped = false;
        let end = -1;
        for (let i = braceIdx; i < html.length && i < braceIdx + 5000; i++) {
          const ch = html[i];
          if (inStr) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === '"') inStr = false;
            continue;
          }
          if (ch === '"') inStr = true;
          else if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) { end = i; break; }
          }
        }
        if (end >= 0) {
          const block = html.slice(braceIdx, end + 1);
          const variants: Array<{ bitrate: number; url: string }> = [];
          const variantRegex = /bitrate:(\d+)[^}]*?url:"([^"]+)"/g;
          let vm: RegExpExecArray | null;
          while ((vm = variantRegex.exec(block)) !== null) {
            variants.push({ bitrate: parseInt(vm[1], 10), url: vm[2] });
          }
          const urlOnlyRegex = /url:"([^"]+\.mp4[^"]*)"/g;
          let um: RegExpExecArray | null;
          while ((um = urlOnlyRegex.exec(block)) !== null) {
            if (!variants.some((v) => v.url === um![1])) {
              variants.push({ bitrate: 0, url: um[1] });
            }
          }
          if (variants.length > 0) {
            variants.sort((a, b) => b.bitrate - a.bitrate);
            return variants[0].url;
          }
        }
      }
    }
  }

  // 新格式：RSC ref 結構。video_info:$R[N]={__ref:"client:..."}
  // 實際 variant 定義散落在 HTML 各處，但每個 ApiMediaEntityVideoVariant
  // 都有 bitrate + content_type + url 連續出現，且 mp4 url 包含 media id_str
  // （如 TWITTER 影片來源網域的 amplify_video/{MEDIA_ID}/vid/...mp4）。
  // 用 media id_str 全域過濾所有 variant，選最高 bitrate 的 mp4。
  if (!mediaIdStr) return null;
  const variants: Array<{ bitrate: number; url: string }> = [];
  // 抓 bitrate + url 配對（url 限 mp4 且包含 media id）
  const mp4UrlPattern = `${TWITTER_VIDEO_ORIGIN_PATTERN}/[^"]*${escapeRegExp(mediaIdStr)}[^"]*\\.mp4[^"]*`;
  const variantRegex = new RegExp(`bitrate:(\\d+|null)[^}]*?url:"(${mp4UrlPattern})"`, 'g');
  let vm: RegExpExecArray | null;
  while ((vm = variantRegex.exec(html)) !== null) {
    const bitrate = vm[1] === 'null' ? 0 : parseInt(vm[1], 10);
    variants.push({ bitrate, url: vm[2] });
  }
  // 也抓沒有 bitrate 的 mp4 url（fallback）
  const urlOnlyRegex = new RegExp(`url:"(${mp4UrlPattern})"`, 'g');
  let um: RegExpExecArray | null;
  while ((um = urlOnlyRegex.exec(html)) !== null) {
    if (!variants.some((v) => v.url === um![1])) {
      variants.push({ bitrate: 0, url: um[1] });
    }
  }
  if (variants.length > 0) {
    variants.sort((a, b) => b.bitrate - a.bitrate);
    return variants[0].url;
  }

  // animated_gif fallback：gif 的 mp4 url 格式為 tweet_video/{MEDIA_ID}.mp4，
  // 不包含 ApiMediaEntity 的 id_str，需從 media_url_https（tweet_video_thumb/{ID}.jpg）
  // 提取媒體 ID，在 HTML 中找對應的 tweet_video/{ID}.mp4
  if (mediaUrlHttps) {
    const thumbIdMatch = mediaUrlHttps.match(/\/(?:tweet_video_thumb|amplify_video_thumb|media)\/([^?/.]+)/);
    if (thumbIdMatch) {
      const thumbId = thumbIdMatch[1];
      const escapedThumbId = escapeRegExp(thumbId);
      const gifMp4Regex = new RegExp(`url:"(${TWITTER_VIDEO_ORIGIN_PATTERN}/tweet_video/${escapedThumbId}\\.mp4[^"]*)"`, 'g');
      let gm: RegExpExecArray | null;
      while ((gm = gifMp4Regex.exec(html)) !== null) {
        return gm[1];
      }
      const bareMp4Regex = new RegExp(`(${TWITTER_VIDEO_ORIGIN_PATTERN}/tweet_video/${escapedThumbId}\\.mp4[^"\\s]*)`);
      const bareMatch = html.match(bareMp4Regex);
      if (bareMatch) return bareMatch[1];
    }
  }

  return null;
};

const readRscMediaOwnerTweetId = (html: string, entityIndex: number): string | null => {
  const prefix = html.slice(Math.max(0, entityIndex - 500), entityIndex);
  const keys = Array.from(prefix.matchAll(/client:([^":,\s]+):media_entities2:\d+/g));
  const encodedTweetKey = keys.at(-1)?.[1];
  if (!encodedTweetKey) return null;

  try {
    const decoded = Buffer.from(encodedTweetKey, 'base64').toString('utf8');
    return decoded.match(/^Tweet:(\d+)$/)?.[1] || null;
  } catch {
    return null;
  }
};

const hasRequestedTweetEvidence = (html: string, requestedTweetId: string): boolean => {
  if (readLdJsonSocialPosting(html)?.tweetId === requestedTweetId) return true;

  const escapedTweetId = requestedTweetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`TweetResults:${escapedTweetId}(?=[:"])`).test(html)) return true;

  for (const match of html.matchAll(/client:([^":,\s]+)(?=[:"])/g)) {
    try {
      if (Buffer.from(match[1], 'base64').toString('utf8') === `Tweet:${requestedTweetId}`) {
        return true;
      }
    } catch {
      // Ignore non-base64 RSC keys.
    }
  }

  return false;
};

const buildMediaFromRscPayload = (
  html: string,
  requestedTweetId: string,
  sourceTweetId = requestedTweetId,
): TwitterMedia[] => {
  // 1. 從 RSC payload 抓所有 ApiMediaEntity
  const mediaRegex = /__typename:"ApiMediaEntity",id_str:"([^"]+)",type:"([^"]+)"[^}]*?media_url_https:"([^"]+)"/g;
  const rawMedia: Array<{
    id_str: string;
    type: string;
    media_url_https: string;
    ownerTweetId: string | null;
    endIndex: number;
  }> = [];
  let m: RegExpExecArray | null;
  while ((m = mediaRegex.exec(html)) !== null) {
    rawMedia.push({
      id_str: m[1],
      type: m[2],
      media_url_https: m[3],
      ownerTweetId: readRscMediaOwnerTweetId(html, m.index),
      endIndex: m.index + m[0].length,
    });
  }
  if (rawMedia.length === 0) return [];

  const hasScopedEntity = rawMedia.some((item) => item.ownerTweetId === sourceTweetId);
  const scopedMedia = hasScopedEntity
    ? rawMedia.filter((item) => item.ownerTweetId === sourceTweetId)
    : rawMedia.filter((item) => item.ownerTweetId === null);
  if (scopedMedia.length === 0) return [];

  // 2. 從 ld+json 抓 metadata
  const ld = readLdJsonSocialPosting(html);

  // 3. 從 RSC payload 抓 full_text + counts
  const fullTextMatch = html.match(/full_text:"((?:[^"\\]|\\.)*)"/);
  const fullText = fullTextMatch ? decodeRscStringLiteral(fullTextMatch[1]) : undefined;
  const favMatch = html.match(/favorite_count:(\d+)/);
  const rtMatch = html.match(/retweet_count:(\d+)/);

  // 4. 組合
  const text = fullText || ld?.text;
  const hashtags = parseHashtagsFromText(text);
  const tweetId = sourceTweetId;
  const common = {
    text: text || undefined,
    user_name: ld?.userName,
    user_screen_name: ld?.userScreenName,
    date: ld?.date,
    tweet_id: tweetId,
    tweet_url: buildCanonicalTweetUrl(tweetId),
    requested_tweet_id: requestedTweetId,
    like_count: favMatch ? Number(favMatch[1]) : (ld?.likeCount ?? null),
    retweet_count: rtMatch ? Number(rtMatch[1]) : (ld?.retweetCount ?? null),
    view_count: ld?.viewCount ?? null,
    hashtags: hashtags.length > 0 ? hashtags : null,
  };

  const media: TwitterMedia[] = [];
  const seenMediaIds = new Set<string>();
  const seenUrls = new Set<string>();
  for (const raw of scopedMedia) {
    if (seenMediaIds.has(raw.id_str)) continue;
    if (raw.type === 'photo') {
      const url = normalizeTwitterImageUrl(raw.media_url_https);
      if (seenUrls.has(url)) continue;
      seenMediaIds.add(raw.id_str);
      seenUrls.add(url);
      media.push({
        url,
        type: 'image',
        ...common,
      });
    } else if (raw.type === 'video' || raw.type === 'animated_gif') {
      const videoUrl = findRscVideoMp4Url(html, raw.id_str, raw.endIndex, raw.media_url_https);
      if (!videoUrl || seenUrls.has(videoUrl)) continue; // 跟 readTweetMedia 一致：抓不到 mp4 就跳過
      seenMediaIds.add(raw.id_str);
      seenUrls.add(videoUrl);
      media.push({
        url: videoUrl,
        type: raw.type === 'animated_gif' ? 'gif' : 'video',
        thumbnail: normalizeTwitterImageUrl(raw.media_url_https),
        ...common,
      });
    }
  }
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
    // Twitter Web 有時只回傳原始推文 ID 字串，不是完整嵌套對象
    if (typeof candidate === 'string' && /^\d{10,}$/.test(candidate)) {
      return { ...tweet, rest_id: candidate };
    }
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

const resolveTweetContextFromStates = (requestedTweetId: string, states: unknown[]) => {
  const tweets = collectTweetObjects(states);
  const requestedTweet = tweets.find(
    (tweet) => firstTweetId(tweet.rest_id, tweet.id_str, tweet.id) === requestedTweetId,
  ) || tweets[0];
  if (!requestedTweet) return null;

  const sourceTweet = resolveOriginalTweet(requestedTweet);
  const sourceTweetId = firstTweetId(sourceTweet?.rest_id, sourceTweet?.id_str, sourceTweet?.id) || requestedTweetId;
  const requestedUser = readUserFromTweet(requestedTweet);
  return {
    sourceTweet,
    sourceTweetId,
    retweetedByHandle: sourceTweetId !== requestedTweetId ? requestedUser.screenName : '',
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
  const context = resolveTweetContextFromStates(requestedTweetId, states);
  if (!context) return [];
  const { sourceTweet, sourceTweetId, retweetedByHandle } = context;
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
    retweeted_by_handle: retweetedByHandle || undefined,
    like_count: readCount(legacy?.favorite_count, legacy?.like_count, sourceTweet?.like_count),
    retweet_count: readCount(legacy?.retweet_count, sourceTweet?.retweet_count),
    view_count: readCount(sourceTweet?.views?.count, legacy?.view_count, sourceTweet?.view_count),
    hashtags,
  }));
};

const enrichFallbackMediaFromTweetState = (fallbackMedia: TwitterMedia[], requestedTweetId: string, states: unknown[]): TwitterMedia[] => {
  if (fallbackMedia.length === 0) return fallbackMedia;
  const context = resolveTweetContextFromStates(requestedTweetId, states);
  if (!context) return fallbackMedia;
  const { sourceTweet, sourceTweetId, retweetedByHandle } = context;
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
    retweeted_by_handle: retweetedByHandle || media.retweeted_by_handle,
    like_count: readCount(legacy?.favorite_count, legacy?.like_count, sourceTweet?.like_count) ?? media.like_count,
    retweet_count: readCount(legacy?.retweet_count, sourceTweet?.retweet_count) ?? media.retweet_count,
    view_count: readCount(sourceTweet?.views?.count, legacy?.view_count, sourceTweet?.view_count) ?? media.view_count,
    hashtags: hashtags || media.hashtags,
  }));
};

const fetchXTweetHtml = async (tweetId: string, fetchFn: FetchLike, originalUrl?: string): Promise<string | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), X_FETCH_TIMEOUT_MS);
  // Twitter Web 對 i/status/{id} 格式（無用戶名）的未登入存取較嚴格，
  // 部分推文會返回真 404；優先用使用者提供的原始 URL（帶用戶名）。
  const targetUrl = originalUrl || buildCanonicalTweetUrl(tweetId);
  try {
    const response = await fetchFn(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
        // 用真實瀏覽器 UA，bot UA 更容易被 Twitter Web 擋
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      },
    });
    // Twitter Web 偶爾以非 2xx 回傳仍含推文資料的 SSR HTML。只有與 requested
    // tweet ID 綁定的結構化證據才能放行；頁面大小與 preload 都不能證明身份。
    const text = await response.text();
    if (!response.ok && !hasRequestedTweetEvidence(text, tweetId)) return null;
    return text;
  } catch (error) {
    logger.warn({ err: error, tweetId }, 'Twitter Web 推文補強失敗，改用 RSS item');
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const TwitterService = {
  /**
   * 從 RSSHub item 解析媒體資料。Twitter Web 補強失敗時也會走這條 fallback。
   */
  async extractMediaFromRssItem(item: RssTweetItem, _options: TwitterExtractOptions = {}): Promise<TwitterMedia[]> {
    const requestedTweetId = extractTweetId(item.link || '');
    if (!requestedTweetId) throw new Error('RSS item 缺少有效推文網址');
    return buildMediaFromRssItem(item, requestedTweetId);
  },

  /**
   * RSS-first 解析推文媒體，並以 Twitter Web HTML/JSON 狀態補強 RT 原推資訊。
   */
  async extractMediaFromTweet(tweetUrl: string, rssItem?: RssTweetItem, options: TwitterExtractOptions = {}): Promise<TwitterMedia[]> {
    const requestedTweetId = extractTweetId(tweetUrl);
    if (!requestedTweetId) throw new Error('無效的推文網址格式');

    // 嘗試從 RSS 內容解析原推 ID（轉推去重用）
    const rssOriginalId = rssItem ? extractOriginalTweetIdFromRss(rssItem) : null;
    const effectiveSourceId = rssOriginalId || requestedTweetId;
    const fallbackMedia = rssItem ? buildMediaFromRssItem(rssItem, requestedTweetId, effectiveSourceId) : [];
    const fetchFn = options.fetch || fetch;
    const html = await fetchXTweetHtml(requestedTweetId, fetchFn, tweetUrl);
    if (!html) return fallbackMedia;

    const states = parseJsonStatesFromHtml(html);
    const enrichedMedia = buildMediaFromTweetState(requestedTweetId, states);
    if (enrichedMedia.length > 0) return enrichedMedia;

    const enrichedFallbackMedia = enrichFallbackMediaFromTweetState(fallbackMedia, requestedTweetId, states);
    if (enrichedFallbackMedia.length > 0) return enrichedFallbackMedia;

    // Twitter Web 2024+ 遷移到 RSC payload，__INITIAL_STATE__ JSON 不再可用
    const rscMedia = buildMediaFromRscPayload(html, requestedTweetId, effectiveSourceId);
    if (rscMedia.length > 0) return rscMedia;

    // Twitter Web 對敏感/限制推文的 SSR 不回傳 ApiMediaEntity，但在 <link rel="preload"> 暴露媒體 ID
    const preloadMedia = buildMediaFromPreloadImages(html, requestedTweetId);
    if (preloadMedia.length > 0) return preloadMedia;

    return buildMediaFromHtmlMeta(html, requestedTweetId);
  },
};
