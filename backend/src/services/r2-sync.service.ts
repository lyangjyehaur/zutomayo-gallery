import { MediaGroupModel, MediaModel } from '../models/index.js';
import { getMVsFromDB, saveMVsToDB } from './v2_mapper.js';
import { backupImageToR2 } from './r2.service.js';

export type R2SyncResult = {
  successCount: number;
  failCount: number;
  skippedCount: number;
};

export const runR2Sync = async (): Promise<R2SyncResult> => {
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

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
            'source-tweet': data.source_url || 'unknown',
          },
        });

        if (r2Url) {
          await MediaModel.update({ url: r2Url }, { where: { id: media.id } });
          successCount++;

          if (media.media_type === 'video' && media.thumbnail_url && media.thumbnail_url.includes('pbs.twimg.com')) {
            const r2ThumbUrl = await backupImageToR2(media.thumbnail_url, `fanarts/videos/thumbs`, {
              metadata: { 'fanart-id': data.id },
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

  const mvs = await getMVsFromDB();
  for (const mv of mvs) {
    let updated = false;
    const newImages = [];

    if (Array.isArray(mv.images)) {
      for (const imgObj of mv.images) {
        const isString = typeof imgObj === 'string';
        const imgUrl = isString ? imgObj : imgObj.url;

        if (imgUrl && imgUrl.includes('pbs.twimg.com')) {
          const r2Url = await backupImageToR2(imgUrl, `mvs/${mv.id}`, {
            metadata: {
              'mv-id': mv.id,
              'mv-title': Buffer.from(mv.title || 'unknown').toString('base64'),
            },
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

  return { successCount, failCount, skippedCount };
};

