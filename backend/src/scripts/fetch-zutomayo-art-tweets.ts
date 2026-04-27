import 'dotenv/config';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { TwitterApi } from 'twitter-api-v2';
import { StagingFanartModel, CrawlerStateModel, syncModels } from '../models/index.js';
import { uploadBufferToR2 } from '../services/r2.service.js';

// Configuration
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

// Types
interface SyncProgress {
  pagination_token?: string;
  total_crawled: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchMediaToBuffer(url: string): Promise<{ buffer: Buffer; contentType: string; ext: string } | null> {
  let fetchUrl = url;
  // 對 Twitter 圖片要求原始最高畫質
  if (fetchUrl.includes('pbs.twimg.com')) {
    fetchUrl = fetchUrl.replace(/&name=[a-z0-9]+/i, '');
    fetchUrl = fetchUrl.replace(/\?name=[a-z0-9]+/i, '?');
    fetchUrl = fetchUrl.includes('?') ? `${fetchUrl}&name=orig` : `${fetchUrl}?name=orig`;
    fetchUrl = fetchUrl.replace('?&', '?');
  }

  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) {
      console.error(`Failed to fetch media: ${fetchUrl}, status: ${res.status}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let contentType = res.headers.get('content-type') || 'application/octet-stream';
    const extMatch = url.match(/\.(jpg|jpeg|png|gif|webp|avif|mp4|m4v|mov|m3u8)/i);
    let ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    if (url.includes('format=png')) ext = 'png';
    if (url.includes('format=webp')) ext = 'webp';
    if (url.includes('format=mp4')) ext = 'mp4';
    
    return { buffer, contentType, ext };
  } catch (err) {
    console.error(`Error fetching media: ${fetchUrl}`, err);
    return null;
  }
}

export async function runCrawler(username: string = 'zutomayo_art') {
  if (!TWITTER_BEARER_TOKEN) {
    console.warn('[Crawler] 警告: 未設定 TWITTER_BEARER_TOKEN 環境變數，無法使用 twitter-api-v2。');
    console.warn('[Crawler] 請在 .env 檔案中新增 TWITTER_BEARER_TOKEN。');
    throw new Error('Missing TWITTER_BEARER_TOKEN');
  }

  console.log(`[Crawler] 初始化爬蟲... 目標帳號: @${username}`);
  await syncModels();
  
  const twitterClient = new TwitterApi(TWITTER_BEARER_TOKEN);
  const roClient = twitterClient.readOnly;
  
  // 取得使用者 ID
  let userId: string;
  try {
    const user = await roClient.v2.userByUsername(username);
    if (!user.data) {
      throw new Error(`[Crawler] 找不到使用者 @${username}。`);
    }
    userId = user.data.id;
    console.log(`[Crawler] 找到使用者 @${username} (ID: ${userId})`);
  } catch (err) {
    console.error('[Crawler] 獲取使用者資訊失敗:', err);
    throw err;
  }

  // 讀取爬蟲進度 (用於接續上次的進度)
  const [crawlerState] = await CrawlerStateModel.findOrCreate({
    where: { username },
    defaults: {
      pagination_token: null,
      total_crawled: 0
    }
  });

  let progress: SyncProgress = {
    total_crawled: crawlerState.getDataValue('total_crawled') || 0,
    pagination_token: crawlerState.getDataValue('pagination_token') || undefined
  };
  
  console.log(`[Crawler] 讀取到先前的進度紀錄:`, progress);

  let hasNextPage = true;
  let currentToken = progress.pagination_token;

  while (hasNextPage) {
    try {
      console.log(`[Crawler] 正在獲取推文... Pagination Token: ${currentToken || 'none'}`);
      
      const response = await roClient.v2.userTimeline(userId, {
        max_results: 100, // API 單次最大限制
        pagination_token: currentToken,
        expansions: ['attachments.media_keys'],
        'tweet.fields': ['created_at', 'attachments'],
        'media.fields': ['url', 'type', 'variants'],
      });

      const tweets = response.tweets;
      const includes = response.includes;

      if (!tweets || tweets.length === 0) {
        console.log('[Crawler] 沒有找到更多推文，爬蟲完成。');
        break;
      }

      console.log(`[Crawler] 本批次取得 ${tweets.length} 則推文。`);

      for (const tweet of tweets) {
        const tweetId = tweet.id;
        const originalUrl = `https://twitter.com/${username}/status/${tweetId}`;
        const crawledAt = new Date();
        
        // 取得媒體 key，若無媒體則跳過
        const mediaKeys = tweet.attachments?.media_keys || [];
        if (mediaKeys.length === 0) {
          continue;
        }

        const medias = includes?.media?.filter(m => mediaKeys.includes(m.media_key)) || [];
        
        for (const media of medias) {
          let mediaUrl = media.url;
          let mediaType = media.type; // 'photo', 'video', 'animated_gif'

          if (mediaType === 'video' || mediaType === 'animated_gif') {
            // 找出最高畫質的 mp4
            const variants = media.variants?.filter(v => v.content_type === 'video/mp4') || [];
            if (variants.length > 0) {
              variants.sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0));
              mediaUrl = variants[0].url;
            } else if (media.url) {
              mediaUrl = media.url;
            } else {
              continue; // 無法取得影片網址
            }
          }

          if (!mediaUrl) continue;

          // 檢查資料庫是否已存在相同網址的紀錄 (避免重複處理同個圖片)
          const existing = await StagingFanartModel.findOne({ where: { media_url: mediaUrl } });
          if (existing) {
            console.log(`[Crawler] 推文 ${tweetId} 的媒體已存在，跳過。`);
            continue;
          }

          console.log(`[Crawler] 處理推文 ${tweetId} 的媒體: ${mediaUrl}`);
          
          // 下載媒體轉為 Buffer
          const fetchedMedia = await fetchMediaToBuffer(mediaUrl);
          if (!fetchedMedia) {
            console.error(`[Crawler] 無法下載媒體，跳過該推文 ${tweetId} 的此媒體。`);
            continue;
          }

          const hash = crypto.createHash('md5').update(mediaUrl).digest('hex');
          const fileName = `crawler/${hash}.${fetchedMedia.ext}`;
          
          // 呼叫 r2.service 上傳至 R2
          const r2Url = await uploadBufferToR2(
            fetchedMedia.buffer,
            fileName,
            fetchedMedia.contentType,
            {
              metadata: {
                'original-url': mediaUrl,
                'tweet-id': tweetId,
                source: 'crawler'
              }
            }
          );

          if (!r2Url) {
            console.error(`[Crawler] 無法將推文 ${tweetId} 的媒體上傳至 R2，跳過。`);
            continue;
          }

          // 寫入暫存表
          await StagingFanartModel.create({
            tweet_id: tweetId,
            original_url: originalUrl,
            media_url: mediaUrl,
            r2_url: r2Url,
            media_type: mediaType === 'photo' ? 'image' : 'video',
            crawled_at: crawledAt,
            status: 'pending',
            source: 'crawler'
          });

          progress.total_crawled++;
          console.log(`[Crawler] 已將推文 ${tweetId} 的二創圖寫入暫存表 (R2: ${r2Url})`);
        }
      }

      // 更新進度紀錄，準備獲取下一頁
      currentToken = response.meta.next_token;
      progress.pagination_token = currentToken;
      
      await crawlerState.update({
        pagination_token: currentToken || null,
        total_crawled: progress.total_crawled
      });

      if (!currentToken) {
        console.log('[Crawler] 沒有更多分頁，爬蟲完成。');
        hasNextPage = false;
      } else {
        // 避免觸發 API Rate Limit，休息一下
        console.log(`[Crawler] 本批次完成，等待 3 秒...`);
        await sleep(3000);
      }

    } catch (err: any) {
      console.error('[Crawler] 獲取推文時發生錯誤:', err);
      // 處理 Rate Limit (429 Too Many Requests)
      if (err.code === 429) {
        console.log('[Crawler] 達到 API 速率限制 (Rate Limit)，等待 5 分鐘後重試...');
        await sleep(5 * 60 * 1000); // 等待 5 分鐘
      } else {
        console.log('[Crawler] 發生非預期錯誤，爬蟲中斷，下次可自動接續進度。');
        break;
      }
    }
  }

  console.log(`[Crawler] 執行完畢。共新增 ${progress.total_crawled} 筆暫存資料。`);
  return progress.total_crawled;
}

const isMain = import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const usernameArg = process.argv[2] || 'zutomayo_art';
  runCrawler(usernameArg).catch(err => {
    console.error('[Crawler] 致命錯誤:', err);
    process.exit(1);
  });
}
