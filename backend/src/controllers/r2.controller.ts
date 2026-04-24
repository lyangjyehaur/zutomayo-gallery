import { Request, Response } from 'express';
import { Fanart, MV } from '../services/pg.service.js';
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
            const r2Url = await backupImageToR2(imgUrl, 'fanarts');
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
          } else if (typeof imgUrl === 'string' && imgUrl.includes('r2.dan.tw')) {
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
    const mvs = await MV.findAll();
    for (const row of mvs) {
      const mv = row.toJSON() as any;
      let updated = false;
      const newImages = [];

      if (Array.isArray(mv.images)) {
        for (const imgObj of mv.images) {
          const isString = typeof imgObj === 'string';
          const imgUrl = isString ? imgObj : imgObj.url;
          
          if (imgUrl && imgUrl.includes('pbs.twimg.com')) {
            const r2Url = await backupImageToR2(imgUrl, 'mvs');
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
        await row.update({ images: newImages });
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
