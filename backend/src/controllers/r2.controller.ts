import { Request, Response } from 'express';
import { Fanart } from '../services/pg.service.js';
import { getMVsFromDB, saveMVsToDB } from '../services/v2_mapper.js';
import { backupImageToR2 } from '../services/r2.service.js';

// 防止多個同步任務同時執行
let isSyncing = false;

export const syncImagesToR2 = async (req: Request, res: Response): Promise<void> => {
  if (isSyncing) {
    res.status(409).json({ success: false, message: 'A sync task is already running.' });
    return;
  }

  isSyncing = true;
  res.json({ success: true, message: 'Started R2 image synchronization in the background.' });

  try {
    console.log('[R2 Sync] Starting background synchronization task...');
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    // 1. 同步 Fanarts (僅針對已整理/公開的，且網址為 twitter 的圖片)
    const fanarts = await Fanart.findAll({ where: { status: 'organized' } });
    for (const row of fanarts) {
      const fa = row.toJSON() as any;
      let updated = false;
      const newMedia = [];

      if (Array.isArray(fa.media)) {
        for (const imgObj of fa.media) {
          // 支援舊版字串陣列或是新版物件陣列
          const isString = typeof imgObj === 'string';
          const imgUrl = isString ? imgObj : imgObj.url;
          
          if (imgUrl && imgUrl.includes('pbs.twimg.com')) {
            const r2Url = await backupImageToR2(imgUrl, 'fanarts', {
              metadata: {
                'fanart-id': fa.id,
                'author-handle': fa.tweetHandle || 'unknown',
                'source-tweet': fa.tweetUrl || 'unknown'
              }
            });
            if (r2Url) {
              if (isString) {
                newMedia.push(r2Url);
              } else {
                newMedia.push({ ...imgObj, url: r2Url, original_url: imgUrl });
              }
              if (r2Url !== imgUrl) updated = true;
              successCount++;
            } else {
              newMedia.push(imgObj);
              failCount++;
            }
          } else if (imgUrl && imgUrl.includes('video.twimg.com')) {
            // 同步影片 (MP4) 到 R2
            const r2Url = await backupImageToR2(imgUrl, 'fanarts/videos', {
              metadata: {
                'fanart-id': fa.id,
                'author-handle': fa.tweetHandle || 'unknown',
                'source-tweet': fa.tweetUrl || 'unknown'
              }
            });

            let r2ThumbnailUrl = imgObj.thumbnail;
            const originalThumbnail = imgObj.original_thumbnail || imgObj.thumbnail;
            if (originalThumbnail && originalThumbnail.includes('pbs.twimg.com')) {
              const thumbRes = await backupImageToR2(originalThumbnail, 'fanarts/videos/thumbs', {
                metadata: { 'fanart-id': fa.id }
              });
              if (thumbRes) r2ThumbnailUrl = thumbRes;
            }

            if (r2Url) {
              if (isString) {
                newMedia.push(r2Url);
              } else {
                newMedia.push({ ...imgObj, url: r2Url, original_url: imgUrl, thumbnail: r2ThumbnailUrl, original_thumbnail: originalThumbnail });
              }
              if (r2Url !== imgUrl) updated = true;
              successCount++;
            } else {
              newMedia.push(imgObj);
              failCount++;
            }
          } else if (typeof imgUrl === 'string' && imgUrl.includes('r2.dan.tw')) {
             newMedia.push(imgObj);
             skippedCount++;
          } else {
             newMedia.push(imgObj);
             skippedCount++;
          }
        }
      }

      if (updated) {
        await row.update({ media: newMedia });
        console.log(`[R2 Sync] Updated Fanart ${fa.id} media links to R2.`);
      }
    }

    // 2. 同步 MVs 的推特圖片
    const mvs = await getMVsFromDB();
    for (const mv of mvs) {
      let updated = false;
      const newImages = [];

      if (Array.isArray(mv.images)) {
        for (const imgObj of mv.images) {
          const isString = typeof imgObj === 'string';
          const imgUrl = isString ? imgObj : imgObj.url;
          
          if (imgUrl && imgUrl.includes('pbs.twimg.com')) {
            // 將 MV 圖片分類至其獨立的資料夾
            const r2Url = await backupImageToR2(imgUrl, `mvs/${mv.id}`, {
              metadata: {
                'mv-id': mv.id,
                'mv-title': Buffer.from(mv.title || 'unknown').toString('base64') // 標題可能有非 ASCII 字元，轉 Base64 避免 S3 標頭報錯
              }
            });
            if (r2Url) {
              if (isString) {
                newImages.push(r2Url);
              } else {
                newImages.push({ ...imgObj, url: r2Url, original_url: imgUrl });
              }
              if (r2Url !== imgUrl) updated = true;
              successCount++;
            } else {
              newImages.push(imgObj);
              failCount++;
            }
          } else {
            newImages.push(imgObj);
            skippedCount++;
          }
        }
      }

      if (updated) {
          mv.images = newImages as any;
          await saveMVsToDB([mv]);
        console.log(`[R2 Sync] Updated MV ${mv.id} image links to R2.`);
      }
    }

    console.log(`[R2 Sync] Finished. Success: ${successCount}, Fail: ${failCount}, Skipped: ${skippedCount}`);
  } catch (error) {
    console.error('[R2 Sync] Fatal error during synchronization:', error);
  } finally {
    isSyncing = false;
  }
};
