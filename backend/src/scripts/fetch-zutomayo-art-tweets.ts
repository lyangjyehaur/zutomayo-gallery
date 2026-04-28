import 'dotenv/config';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { ApifyClient } from 'apify-client';
import { StagingFanartModel, CrawlerStateModel, syncModels } from '../models/index.js';
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

interface SyncProgress {
  total_crawled: number;
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDaysUtc(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(v => parseInt(v, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatUtcDate(dt);
}

export async function runCrawler(searchTerms: string, startDate?: string, endDate?: string, customMaxItems?: number, stateKey: string = 'staging-fanart') {
  if (!APIFY_API_TOKEN) {
    console.warn('[Crawler] 警告: 未設定 APIFY_API_TOKEN 環境變數。');
    console.warn('[Crawler] 請在 .env 檔案中新增憑證資訊。');
    throw new Error('Missing APIFY_API_TOKEN');
  }

  const normalizedSearchTerms = (searchTerms || '').trim();
  if (!normalizedSearchTerms) {
    throw new Error('Missing searchTerms');
  }

  await syncModels();
  
  const client = new ApifyClient({
    token: APIFY_API_TOKEN,
  });

  const [crawlerState] = await CrawlerStateModel.findOrCreate({
    where: { username: stateKey },
    defaults: {
      pagination_token: null,
      total_crawled: 0
    }
  });

  await crawlerState.update({ status: 'crawling', current_run_processed: 0, current_run_total: 0 });

  let progress: SyncProgress = {
    total_crawled: crawlerState.getDataValue('total_crawled') || 0
  };
  
  let sinceDate: string;
  let untilDate: string;

  if (startDate && endDate) {
    sinceDate = startDate;
    untilDate = addDaysUtc(endDate, 1);
  } else {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    sinceDate = formatUtcDate(start);
    untilDate = formatUtcDate(end);
  }

  const maxItems = customMaxItems || 1000;
  const baseTerms = normalizedSearchTerms
    .split(/\s+/)
    .filter(t => t && !t.startsWith('since:') && !t.startsWith('until:'))
    .join(' ');
  const finalQuery = `${baseTerms} since:${sinceDate}_00:00:00_UTC until:${untilDate}_00:00:00_UTC`;

  try {
    console.log(`[Crawler] 正在透過 Apify 獲取推文... (${sinceDate} ~ ${untilDate})`);
    
    const input = {
      searchTerms: [finalQuery],
      maxItems: maxItems
    };

    const run = await client.actor("kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest").call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    const crawlerDir = path.join(process.cwd(), 'crawler');
    if (!fs.existsSync(crawlerDir)) {
      fs.mkdirSync(crawlerDir, { recursive: true });
    }
    const backupFilePath = path.join(crawlerDir, `raw-apify-results-${Date.now()}.json`);
    fs.writeFileSync(backupFilePath, JSON.stringify(items, null, 2), 'utf-8');
    console.log(`[Crawler] 已將 Apify 原始結果備份至: ${backupFilePath}`);

    if (!items || items.length === 0) {
      console.log('[Crawler] 此區間沒有找到推文。');
      await crawlerState.update({ status: 'idle' });
      return progress.total_crawled;
    }

    const uniqueItemsMap = new Map();

    for (const item of items) {
      const tweet = item as any;
      let currentTweetId = tweet.id_str || tweet.id || tweet.rest_id;
      if (!currentTweetId) continue;

      let targetTweet = tweet;
      let tweetId = currentTweetId;

      let mediaList = targetTweet.extendedEntities?.media || targetTweet.extended_entities?.media || targetTweet.entities?.media || targetTweet.media || targetTweet.images || targetTweet.videos;

      if (!mediaList || mediaList.length === 0) {
        if (tweet.retweeted_tweet) {
          const rt = tweet.retweeted_tweet;
          const rtMediaList = rt.extendedEntities?.media || rt.extended_entities?.media || rt.entities?.media || rt.media || rt.images || rt.videos;
          if (rtMediaList && rtMediaList.length > 0) {
            targetTweet = rt;
            mediaList = rtMediaList;
            tweetId = rt.id_str || rt.id || rt.rest_id || tweetId;
          }
        }
        
        if (!mediaList || mediaList.length === 0) {
          if (tweet.quoted_tweet) {
            const qt = tweet.quoted_tweet;
            const qtMediaList = qt.extendedEntities?.media || qt.extended_entities?.media || qt.entities?.media || qt.media || qt.images || qt.videos;
            if (qtMediaList && qtMediaList.length > 0) {
              targetTweet = qt;
              mediaList = qtMediaList;
              tweetId = qt.id_str || qt.id || qt.rest_id || tweetId;
            }
          }
        }
      }

      mediaList = mediaList || [];

      if (!uniqueItemsMap.has(tweetId)) {
        uniqueItemsMap.set(tweetId, { tweetId, targetTweet, mediaList });
      }
    }

    const uniqueItems = Array.from(uniqueItemsMap.values());
    console.log(`[Crawler] 取得 ${items.length} 則推文，去重後剩餘 ${uniqueItems.length} 則推文。`);

    await crawlerState.update({ status: 'processing', current_run_total: uniqueItems.length });

    let current_run_processed = 0;

    for (const item of uniqueItems) {
      current_run_processed++;

      try {
        const { tweetId, targetTweet, mediaList } = item as any;
        const originalUrl = targetTweet.url || `https://twitter.com/i/web/status/${tweetId}`;
        const crawledAt = new Date();
        const postDate = targetTweet.created_at ? new Date(targetTweet.created_at) : (targetTweet.createdAt ? new Date(targetTweet.createdAt) : crawledAt);
        const sourceText = targetTweet.full_text || targetTweet.text || '';

        const rawAuthorName =
          targetTweet.user?.name ||
          targetTweet.user_name ||
          targetTweet.author?.name ||
          targetTweet.author?.fullName ||
          targetTweet.name ||
          '';
        const rawAuthorHandle =
          targetTweet.user?.screen_name ||
          targetTweet.user_screen_name ||
          targetTweet.author?.screenName ||
          targetTweet.author?.userName ||
          targetTweet.username ||
          targetTweet.screen_name ||
          targetTweet.handle ||
          '';
        const author_name = rawAuthorName ? String(rawAuthorName).trim() : null;
        const author_handle = rawAuthorHandle ? String(rawAuthorHandle).replace(/^@/, '').trim() : null;
        
        const like_count = targetTweet.likeCount || targetTweet.favorite_count || 0;
        const retweet_count = targetTweet.retweetCount || targetTweet.retweet_count || 0;
        const view_count = targetTweet.viewCount || targetTweet.views || 0;
        
        let hashtags: string[] = [];
        if (targetTweet.entities?.hashtags && Array.isArray(targetTweet.entities.hashtags)) {
          hashtags = targetTweet.entities.hashtags.map((h: any) => h.text || h).filter(Boolean);
        }
        
        let medias: { url: string; type: string; width?: number; height?: number; thumbnail_url?: string }[] = [];

        if (Array.isArray(mediaList)) {
          for (const m of mediaList) {
            if (typeof m === 'string') {
              const type = m.includes('.mp4') || m.includes('video') ? 'video' : 'photo';
              medias.push({ url: m, type });
              continue;
            }

            let url = m.media_url_https || m.media_url || m.url;
            let type = m.type === 'video' || m.type === 'animated_gif' ? 'video' : 'photo';
            const thumbnail_url =
              type === 'video'
                ? (m.media_url_https || m.media_url || m.thumbnail || m.preview_image_url || m.poster || null)
                : null;
            let width = m.original_info?.width || m.sizes?.large?.w;
            let height = m.original_info?.height || m.sizes?.large?.h;
            
            if (type === 'video' && m.video_info?.variants) {
              const variants = m.video_info.variants
                .filter((v: any) => v.content_type === 'video/mp4')
                .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
              if (variants.length > 0) {
                url = variants[0].url;
              }
            } else if (type === 'video' && m.variants) {
               const variants = m.variants
                .filter((v: any) => v.content_type === 'video/mp4')
                .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
              if (variants.length > 0) {
                url = variants[0].url;
              }
            }
            
            if (url && !url.includes('profile_images')) {
              medias.push({ url, type, width, height, thumbnail_url: thumbnail_url || undefined });
            }
          }
        }

      if (medias.length === 0) {
        continue;
      }
      
      for (const media of medias) {
        const mediaUrl = media.url;
        const mediaType = media.type;

        const existing = await StagingFanartModel.findOne({ where: { media_url: mediaUrl } });
        if (existing) {
          console.log(`[Crawler] 推文 ${tweetId} 的媒體已存在，跳過。`);
          continue;
        }

        console.log(`[Crawler] 處理推文 ${tweetId} 的媒體: ${mediaUrl} (暫存至資料庫，不下載至 R2)`);
        
        await StagingFanartModel.create({
          tweet_id: tweetId,
          original_url: originalUrl,
          media_url: mediaUrl,
          thumbnail_url: media.thumbnail_url || null,
          author_name,
          author_handle,
          r2_url: null,
          media_type: mediaType === 'photo' ? 'image' : 'video',
          crawled_at: crawledAt,
          post_date: postDate,
          source_text: sourceText,
          like_count,
          retweet_count,
          view_count,
          media_width: media.width,
          media_height: media.height,
          hashtags,
          status: 'pending',
          source: 'crawler'
        });

        progress.total_crawled++;
        console.log(`[Crawler] 已將推文 ${tweetId} 的二創圖寫入暫存表 (未下載)`);
      }
      } finally {
        if (current_run_processed % 5 === 0 || current_run_processed === uniqueItems.length) {
          await crawlerState.update({ 
            total_crawled: progress.total_crawled,
            current_run_processed 
          });
        }
      }
    }

    const finalUpdate: any = {
      status: 'idle',
      total_crawled: progress.total_crawled,
      current_run_processed
    };
    await crawlerState.update(finalUpdate);

  } catch (err: any) {
    console.error('[Crawler] 獲取推文時發生錯誤:', err);
    await crawlerState.update({ status: 'error' });
  }

  console.log(`[Crawler] 執行完畢。共新增 ${progress.total_crawled} 筆暫存資料。`);
  return progress.total_crawled;
}

const isMain = import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const searchTermsArg = process.argv[2] || 'from:zutomayo_art filter:media include:nativeretweets';
  const startDateArg = process.argv[3];
  const endDateArg = process.argv[4];
  const maxItemsArg = process.argv[5] ? parseInt(process.argv[5], 10) : undefined;

  runCrawler(searchTermsArg, startDateArg, endDateArg, maxItemsArg).catch(err => {
    console.error('[Crawler] 致命錯誤:', err);
    process.exit(1);
  });
}
