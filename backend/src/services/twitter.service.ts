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
}

import { logger } from '../utils/logger.js';

const ZUTOMAYO_ART_STATUS_URL = 'https://x.com/zutomayo_art/status/';
const X_STATUS_URL = 'https://x.com/i/status/';

export const normalizeTweetUrl = (tweetUrl: string) => (
  tweetUrl.trim().replace(ZUTOMAYO_ART_STATUS_URL, X_STATUS_URL)
);

export const buildCanonicalTweetUrl = (tweetId: string) => `${X_STATUS_URL}${tweetId}`;

export const extractTweetId = (tweetUrl: string) => (
  normalizeTweetUrl(tweetUrl).match(/\/status\/(\d+)/)?.[1] || null
);

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

export const TwitterService = {
  /**
   * 解析推文網址，獲取真實媒體資源 (圖片、最高畫質 MP4)
   * 使用開源免費的 vxtwitter API，免登入免 Cookie
   * @param tweetUrl 原始推文網址 (例如: https://x.com/zutomayo/status/123456789)
   */
  async extractMediaFromTweet(tweetUrl: string): Promise<TwitterMedia[]> {
    try {
      // 1. 從網址中提取推文 ID
      const tweetId = extractTweetId(tweetUrl);
      if (!tweetId) {
        throw new Error('無效的推文網址格式');
      }

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
            requested_tweet_id: tweetId
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
