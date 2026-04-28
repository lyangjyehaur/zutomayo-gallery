import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { StagingFanartModel, syncModels } from '../models/index.js';
import { uploadBufferToR2 } from '../services/r2.service.js';

// 需要先從 crawler/ 資料夾找出最新的 raw-apify-results 檔案
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
    const files = fs.readdirSync(crawlerDir).filter(f => f.startsWith('raw-apify-results-') && f.endsWith('.json'));
    if (files.length === 0) {
      console.error(`[Reparse] 找不到任何 raw-apify-results 檔案。`);
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
    const tweetId = tweet.id_str || tweet.id || tweet.rest_id;
    if (!tweetId) continue;
    
    if (uniqueTweetIds.has(tweetId)) {
      skipped_duplicate_tweet++;
      continue;
    }
    uniqueTweetIds.add(tweetId);

    const originalUrl = tweet.url || `https://twitter.com/i/web/status/${tweetId}`;
    
    let medias: { url: string; type: string }[] = [];

    // 嘗試多種可能的 media 路徑
    const mediaList = tweet.extendedEntities?.media || tweet.extended_entities?.media || tweet.entities?.media || tweet.media || tweet.images || tweet.videos || [];
    
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
          medias.push({ url, type });
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
        crawled_at: new Date(),
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
