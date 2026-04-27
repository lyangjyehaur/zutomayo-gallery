import 'dotenv/config';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ApifyClient } from 'apify-client';
import { StagingFanartModel, CrawlerStateModel, syncModels } from '../models/index.js';
import { uploadBufferToR2 } from '../services/r2.service.js';

// Configuration
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

// Types
interface SyncProgress {
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
  if (!APIFY_API_TOKEN) {
    console.warn('[Crawler] 警告: 未設定 APIFY_API_TOKEN 環境變數。');
    console.warn('[Crawler] 請在 .env 檔案中新增憑證資訊。');
    throw new Error('Missing APIFY_API_TOKEN');
  }

  console.log(`[Crawler] 初始化爬蟲... 目標帳號: @${username}`);
  await syncModels();
  
  const client = new ApifyClient({
    token: APIFY_API_TOKEN,
  });

  // 讀取爬蟲進度 (僅用於記錄總數，因為 Apify 使用 maxItems)
  const [crawlerState] = await CrawlerStateModel.findOrCreate({
    where: { username },
    defaults: {
      pagination_token: null,
      total_crawled: 0
    }
  });

  await crawlerState.update({ status: 'crawling', current_run_processed: 0, current_run_total: 0 });

  let progress: SyncProgress = {
    total_crawled: crawlerState.getDataValue('total_crawled') || 0
  };
  
  console.log(`[Crawler] 讀取到先前的進度紀錄:`, progress);

  try {
    console.log(`[Crawler] 正在透過 Apify 獲取推文...`);
    
    const input = {
      searchTerms: [`from:${username}`],
      maxItems: 7000
    };

    const run = await client.actor("kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest").call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      console.log('[Crawler] 沒有找到更多推文，爬蟲完成。');
      await crawlerState.update({ status: 'idle' });
      return progress.total_crawled;
    }

    console.log(`[Crawler] 取得 ${items.length} 則推文。`);
    await crawlerState.update({ status: 'processing', current_run_total: items.length });

    let current_run_processed = 0;

    for (const item of items) {
      current_run_processed++;

      try {
        const tweet = item as any;
      const tweetId = tweet.id_str || tweet.id || tweet.rest_id;
      if (!tweetId) continue;
      const originalUrl = tweet.url || `https://twitter.com/${username}/status/${tweetId}`;
      const crawledAt = new Date();
      
      let medias: { url: string; type: string }[] = [];

      // 解析 media，apidojo/tweet-scraper 回傳結構接近官方 API
      const mediaList = tweet.extendedEntities?.media || tweet.extended_entities?.media || tweet.entities?.media || [];
      if (Array.isArray(mediaList)) {
        const parsed = mediaList.map((m: any) => {
          let url = m.media_url_https || m.media_url || m.url;
          let type = m.type === 'video' || m.type === 'animated_gif' ? 'video' : 'photo';
          
          if (type === 'video' && m.video_info?.variants) {
            // Find the best quality mp4
            const variants = m.video_info.variants
              .filter((v: any) => v.content_type === 'video/mp4')
              .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
            if (variants.length > 0) {
              url = variants[0].url;
            }
          }
          return { url, type };
        }).filter((m: any) => !!m.url);
        
        medias.push(...parsed);
      }

      if (medias.length === 0) {
        continue;
      }
      
      for (const media of medias) {
        const mediaUrl = media.url;
        const mediaType = media.type;

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
      } finally {
        if (current_run_processed % 5 === 0 || current_run_processed === items.length) {
          await crawlerState.update({ 
            total_crawled: progress.total_crawled,
            current_run_processed 
          });
        }
      }
    }

    // 更新進度紀錄
    await crawlerState.update({
      status: 'idle',
      total_crawled: progress.total_crawled,
      current_run_processed
    });

  } catch (err: any) {
    console.error('[Crawler] 獲取推文時發生錯誤:', err);
    await crawlerState.update({ status: 'error' });
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
