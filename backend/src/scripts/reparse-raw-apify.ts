import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { StagingFanartModel, syncModels } from '../models/index.js';
import { uploadBufferToR2 } from '../services/r2.service.js';

// 需要先從 crawler/ 資料夾找出最新的 raw-apify-results 或 dataset_twitter 檔案
const crawlerDir = path.join(process.cwd(), 'crawler');

async function fetchMediaToBuffer(url: string): Promise<{ buffer: Buffer; contentType: string; ext: string } | null> {
  let fetchUrl = url;
  if (fetchUrl.includes('pbs.twimg.com')) {
    fetchUrl = fetchUrl.replace(/&name=[a-z0-9]+/i, '');
    fetchUrl = fetchUrl.replace(/\?name=[a-z0-9]+/i, '?');
    fetchUrl = fetchUrl.includes('?') ? `${fetchUrl}&name=orig` : `${fetchUrl}?name=orig`;
    fetchUrl = fetchUrl.replace('?&', '?');
  }

  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
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
    return null;
  }
}

export async function reparseRawApify(filename?: string) {
  await syncModels();
  
  if (!fs.existsSync(crawlerDir)) {
    console.error(`[Reparse] 找不到 crawler 目錄: ${crawlerDir}`);
    return;
  }

  let targetFile = filename;
  if (!targetFile) {
    const files = fs.readdirSync(crawlerDir).filter(f => 
      (f.startsWith('raw-apify-results-') || f.startsWith('dataset_twitter-')) && f.endsWith('.json')
    );
    if (files.length === 0) {
      console.error(`[Reparse] 找不到任何 raw-apify-results 或 dataset_twitter 檔案。`);
      return;
    }
    // 找出最新的檔案
    files.sort((a, b) => fs.statSync(path.join(crawlerDir, b)).mtimeMs - fs.statSync(path.join(crawlerDir, a)).mtimeMs);
    targetFile = path.join(crawlerDir, files[0]);
  } else {
    targetFile = path.join(crawlerDir, targetFile);
  }

  console.log(`[Reparse] 正在讀取並重新解析原始資料: ${targetFile}`);
  const rawData = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
  console.log(`[Reparse] 共讀取到 ${rawData.length} 筆項目。`);

  let processed = 0;
  let skipped_duplicate_tweet = 0;
  let skipped_duplicate_media = 0;
  let skipped_no_media = 0;
  
  // 為了計算真實的唯一推文數量
  const uniqueTweetIds = new Set();

  for (const item of rawData) {
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

    if (uniqueTweetIds.has(tweetId)) {
      skipped_duplicate_tweet++;
      continue;
    }
    uniqueTweetIds.add(tweetId);

    const originalUrl = targetTweet.url || `https://twitter.com/i/web/status/${tweetId}`;
    const crawledAt = new Date();
    const postDate = targetTweet.created_at ? new Date(targetTweet.created_at) : (targetTweet.createdAt ? new Date(targetTweet.createdAt) : crawledAt);
    const sourceText = targetTweet.full_text || targetTweet.text || '';

    // 提取互動數據
    const like_count = targetTweet.likeCount || targetTweet.favorite_count || 0;
    const retweet_count = targetTweet.retweetCount || targetTweet.retweet_count || 0;
    const view_count = targetTweet.viewCount || targetTweet.views || 0;
    
    // 提取標籤
    let hashtags: string[] = [];
    if (targetTweet.entities?.hashtags && Array.isArray(targetTweet.entities.hashtags)) {
      hashtags = targetTweet.entities.hashtags.map((h: any) => h.text || h).filter(Boolean);
    }
    
    let medias: { url: string; type: string; width?: number; height?: number }[] = [];
    
    if (Array.isArray(mediaList)) {
      for (const m of mediaList) {
        // Apify / Kaitoeasyapi 可能直接給字串 (若是 tweet.images)
        if (typeof m === 'string') {
          const type = m.includes('.mp4') || m.includes('video') ? 'video' : 'photo';
          medias.push({ url: m, type });
          continue;
        }

        let url = m.media_url_https || m.media_url || m.url;
        let type = m.type === 'video' || m.type === 'animated_gif' ? 'video' : 'photo';
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
        
        if (url && !url.includes('profile_images')) { // 排除大頭貼
          medias.push({ url, type, width, height });
        }
      }
    }

    if (medias.length === 0) {
      skipped_no_media++;
      continue;
    }
    
    for (const media of medias) {
      const mediaUrl = media.url;
      const mediaType = media.type;

      const existing = await StagingFanartModel.findOne({ where: { media_url: mediaUrl } });
      if (existing) {
        skipped_duplicate_media++;
        continue;
      }

      console.log(`[Reparse] 發現新媒體 [${mediaType}] 推文 ${tweetId}: ${mediaUrl}`);
      
      const fetchedMedia = await fetchMediaToBuffer(mediaUrl);
      if (!fetchedMedia) {
        console.error(`[Reparse] 無法下載媒體，跳過: ${mediaUrl}`);
        continue;
      }

      const hash = crypto.createHash('md5').update(mediaUrl).digest('hex');
      const fileName = `crawler/${hash}.${fetchedMedia.ext}`;
      
      const r2Url = await uploadBufferToR2(
        fetchedMedia.buffer,
        fileName,
        fetchedMedia.contentType,
        {
          metadata: {
            'original-url': mediaUrl,
            'tweet-id': tweetId,
            source: 'reparse'
          }
        }
      );

      if (!r2Url) {
        console.error(`[Reparse] 無法上傳至 R2，跳過: ${mediaUrl}`);
        continue;
      }

      await StagingFanartModel.create({
        tweet_id: tweetId,
        original_url: originalUrl,
        media_url: mediaUrl,
        r2_url: r2Url,
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
        source: 'reparse'
      });

      processed++;
      console.log(`[Reparse] 已儲存至暫存表 (R2: ${r2Url})`);
    }
  }

  console.log(`[Reparse] 解析完成！`);
  console.log(`- 原始資料總筆數: ${rawData.length}`);
  console.log(`- 實際唯一推文數: ${uniqueTweetIds.size}`);
  console.log(`- 因重複推文跳過: ${skipped_duplicate_tweet}`);
  console.log(`- 因無媒體跳過: ${skipped_no_media}`);
  console.log(`- 因媒體已存在 DB 跳過: ${skipped_duplicate_media}`);
  console.log(`- 成功重新解析並新增: ${processed}`);
}

const isMain = import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const fileArg = process.argv[2];
  reparseRawApify(fileArg).catch(console.error);
}
