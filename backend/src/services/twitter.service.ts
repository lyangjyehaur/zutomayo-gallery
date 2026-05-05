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
const MAX_TWEET_REDIRECTS = 8;
const TWEET_REDIRECT_TIMEOUT_MS = 8000;

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

const firstTweetId = (...values: unknown[]) => {
  for (const value of values) {
    const id = typeof value === 'string' && value.includes('/status/')
      ? extractTweetId(value)
      : readTweetId(value);
    if (id) return id;
  }
  return null;
};

const resolveSourceTweetId = (data: any, fallbackTweetId: string) => (
  firstTweetId(
    data?.retweeted_status?.id_str,
    data?.retweeted_status?.id,
    data?.retweeted_status?.rest_id,
    data?.retweeted_status?.tweetID,
    data?.retweeted_status?.tweetURL,
    data?.retweeted_tweet?.id_str,
    data?.retweeted_tweet?.id,
    data?.retweeted_tweet?.rest_id,
    data?.retweeted_tweet?.tweetID,
    data?.retweeted_tweet?.tweetURL,
    data?.retweetedTweet?.id_str,
    data?.retweetedTweet?.id,
    data?.retweetedTweet?.rest_id,
    data?.retweetedTweet?.tweetID,
    data?.retweetedTweet?.tweetURL,
    data?.tweet?.retweeted_status?.id_str,
    data?.tweet?.retweeted_status?.id,
    data?.tweet?.retweeted_status?.rest_id,
    data?.tweet?.retweeted_status?.tweetID,
    data?.tweet?.retweeted_status?.tweetURL,
    data?.tweetID,
    data?.tweet_id,
    data?.tweetURL,
    data?.url,
    data?.id_str,
    data?.id,
    data?.rest_id,
  ) || fallbackTweetId
);

const resolveSourceTweetData = (data: any) => (
  data?.retweeted_status ||
  data?.retweeted_tweet ||
  data?.retweetedTweet ||
  data?.tweet?.retweeted_status ||
  data
);

const resolveRedirectedTweetUrl = async (tweetUrl: string) => {
  const requestedTweetId = extractTweetId(tweetUrl);
  if (!requestedTweetId) return null;

  let currentUrl = buildCanonicalTweetUrl(requestedTweetId);
  let latestTweetId: string | null = requestedTweetId;

  for (let i = 0; i < MAX_TWEET_REDIRECTS; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TWEET_REDIRECT_TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'accept': 'text/html,application/xhtml+xml',
          'user-agent': 'Mozilla/5.0 (compatible; zutomayo-gallery/1.0)',
        },
      });

      try {
        await response.body?.cancel();
      } catch {
        // no-op: some runtimes may not expose a cancellable body
      }

      const location = response.headers.get('location');
      if (!location) break;

      const nextUrl = new URL(location, currentUrl).toString();
      const nextTweetId = extractTweetId(nextUrl);
      if (nextTweetId) latestTweetId = nextTweetId;
      if (nextUrl === currentUrl) break;
      currentUrl = nextUrl;
    } catch (error) {
      logger.warn({ err: error, tweetUrl }, '推文跳轉解析失敗，改用輸入網址 ID');
      break;
    } finally {
      clearTimeout(timeout);
    }
  }

  return latestTweetId ? buildCanonicalTweetUrl(latestTweetId) : null;
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
    ...parseHashtagsFromText(sourceData?.text || data?.text),
  ];
  const uniqueTags = Array.from(new Set(tags));
  return uniqueTags.length > 0 ? uniqueTags : null;
};

export const TwitterService = {
  /**
   * 解析推文網址，獲取真實媒體資源 (圖片、最高畫質 MP4)
   * 使用開源免費的 vxtwitter API，免登入免 Cookie
   * @param tweetUrl 原始推文網址 (例如: https://x.com/zutomayo/status/123456789)
   */
  async extractMediaFromTweet(tweetUrl: string): Promise<TwitterMedia[]> {
    try {
      // 1. 從網址中提取推文 ID
      const requestedTweetId = extractTweetId(tweetUrl);
      if (!requestedTweetId) {
        throw new Error('無效的推文網址格式');
      }

      const redirectedTweetUrl = await resolveRedirectedTweetUrl(tweetUrl);
      const tweetId = extractTweetId(redirectedTweetUrl || '') || requestedTweetId;

      // 2. 呼叫 vxtwitter 的免費開源 API
      const apiUrl = `https://api.vxtwitter.com/Twitter/status/${tweetId}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`無法獲取推文資料: ${response.statusText}`);
      }

      const data = await response.json();
      const sourceData = resolveSourceTweetData(data);
      const sourceTweetId = resolveSourceTweetId(data, tweetId);
      const sourceTweetUrl = buildCanonicalTweetUrl(sourceTweetId);
      const likeCount = readCount(
        sourceData?.like_count,
        sourceData?.likeCount,
        sourceData?.favorite_count,
        sourceData?.favoriteCount,
        sourceData?.likes,
        data?.like_count,
        data?.likeCount,
        data?.favorite_count,
        data?.favoriteCount,
        data?.likes,
      );
      const retweetCount = readCount(
        sourceData?.retweet_count,
        sourceData?.retweetCount,
        sourceData?.retweets,
        sourceData?.reposts,
        data?.retweet_count,
        data?.retweetCount,
        data?.retweets,
        data?.reposts,
      );
      const viewCount = readCount(
        sourceData?.view_count,
        sourceData?.viewCount,
        sourceData?.views,
        data?.view_count,
        data?.viewCount,
        data?.views,
      );
      const hashtags = readHashtags(sourceData, data);
      
      // 3. 整理並返回媒體資料
      const mediaList: TwitterMedia[] = [];
      const mediaExtended = sourceData?.media_extended || data.media_extended;
      
      if (mediaExtended && mediaExtended.length > 0) {
        mediaExtended.forEach((media: any) => {
          if (!media.url) return;
          mediaList.push({
            url: media.url, 
            type: media.type, // 'image', 'video', 'gif'
            thumbnail: media.thumbnail_url || undefined,
            text: sourceData?.text || data.text,
            user_name: sourceData?.user_name || sourceData?.user?.name || data.user_name,
            user_screen_name: sourceData?.user_screen_name || sourceData?.user?.screen_name || data.user_screen_name,
            date: sourceData?.date || sourceData?.created_at || data.date,
            tweet_id: sourceTweetId,
            tweet_url: sourceTweetUrl,
            requested_tweet_id: requestedTweetId,
            like_count: likeCount,
            retweet_count: retweetCount,
            view_count: viewCount,
            hashtags
          });
        });
      }

      return mediaList;

    } catch (error) {
      logger.error({ err: error }, '推文解析失敗');
      throw error;
    }
  }
};
