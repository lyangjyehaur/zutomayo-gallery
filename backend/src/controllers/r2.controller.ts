import { Request, Response } from 'express';
import { MediaGroupModel, MediaModel } from '../models/index.js';
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
    const fanarts = await MediaGroupModel.findAll({ where: { status: 'organized' }, include: [{ model: MediaModel, as: 'images' }] });
    for (const faGroup of fanarts) {
      const data = faGroup.toJSON() as any;
      if (!data.images) continue;
      
      for (const media of data.images) {
        if (!media.url || !(media.url.includes('pbs.twimg.com') || media.url.includes('video.twimg.com'))) {
          skippedCount++;
          continue;
        }
        
        try {
          const typePath = media.media_type === 'video' ? 'videos' : 'images';
          const r2Url = await backupImageToR2(media.url, `fanarts/${typePath}`, {
            metadata: {
              'fanart-id': data.id,
              'author-handle': data.author_handle || 'unknown',
              'source-tweet': data.source_url || 'unknown'
            }
          });
          
          if (r2Url) {
            await MediaModel.update({ url: r2Url }, { where: { id: media.id } });
            successCount++;
            
            // Backup thumbnail if video
            if (media.media_type === 'video' && media.thumbnail_url && media.thumbnail_url.includes('pbs.twimg.com')) {
              const r2ThumbUrl = await backupImageToR2(media.thumbnail_url, `fanarts/videos/thumbs`, {
                metadata: { 'fanart-id': data.id }
              });
              if (r2ThumbUrl) {
                await MediaModel.update({ thumbnail_url: r2ThumbUrl }, { where: { id: media.id } });
              }
            }
          } else {
            failCount++;
          }
        } catch (e: any) {
          failCount++;
          console.error(`FanArt ${data.id} - ${media.url}: ${e.message}`);
        }
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
