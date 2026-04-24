import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getV2MVsAsLegacyJSON, saveLegacyJSONToV2 } from '../services/v2_mapper.js';
import { Fanart } from '../services/pg.service.js';
import { backupImageToR2 } from '../services/r2.service.js';

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'zutomayo-gallery-archive';
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export const rebuildR2 = async (req: any, res: any) => {
  res.json({ message: 'Rebuilding R2 started in background...' });
  
  // 放背景執行
  (async () => {
    try {
      console.log('[R2 Rebuild] Starting...');
      
      // 1. 同步 MVs
      const mvs = await getV2MVsAsLegacyJSON();
      console.log(`[R2 Rebuild] Found ${mvs.length} MVs to rebuild.`);
      for (const mv of mvs) {
        let updated = false;
        const newImages = [];

        if (Array.isArray(mv.images)) {
          for (const imgObj of mv.images) {
            const originalUrl = typeof imgObj === 'string' ? imgObj : (imgObj.original_url || imgObj.url);
            
            if (originalUrl && originalUrl.includes('pbs.twimg.com')) {
              console.log(`[R2 Rebuild] MV image: ${originalUrl}`);
              const r2Url = await backupImageToR2(originalUrl, `mvs/${mv.id}`, {
                forceUpdate: true,
                metadata: {
                  'mv-id': mv.id,
                  'mv-title': Buffer.from(mv.title || 'unknown').toString('base64')
                }
              });
              if (r2Url) {
                if (typeof imgObj === 'string') {
                  newImages.push(r2Url);
                } else {
                  newImages.push({ ...imgObj, url: r2Url, original_url: originalUrl });
                }
                updated = true;
              } else {
                newImages.push(imgObj);
              }
            } else {
              newImages.push(imgObj);
            }
          }
        }

        if (updated) {
          mv.images = newImages as any;
          await saveLegacyJSONToV2([mv]);
          console.log(`[R2 Rebuild] Updated MV ${mv.id}`);
        }
      }

      // 2. 同步 Fanarts
      const fanarts = await Fanart.findAll({ where: { status: 'organized' } });
      for (const row of fanarts) {
        const fa = row.toJSON() as any;
        let updated = false;
        const newMedia = [];

        if (Array.isArray(fa.media)) {
          for (const imgObj of fa.media) {
            const originalUrl = typeof imgObj === 'string' ? imgObj : (imgObj.original_url || imgObj.url);
            
            if (originalUrl && originalUrl.includes('pbs.twimg.com')) {
              console.log(`[R2 Rebuild] Fanart image: ${originalUrl}`);
              const r2Url = await backupImageToR2(originalUrl, 'fanarts', {
                forceUpdate: true,
                metadata: {
                  'fanart-id': fa.id,
                  'author-handle': fa.tweetHandle || 'unknown',
                  'source-tweet': fa.tweetUrl || 'unknown'
                }
              });
              if (r2Url) {
                if (typeof imgObj === 'string') {
                  newMedia.push(r2Url);
                } else {
                  newMedia.push({ ...imgObj, url: r2Url, original_url: originalUrl });
                }
                updated = true;
              } else {
                newMedia.push(imgObj);
              }
            } else if (originalUrl && originalUrl.includes('video.twimg.com')) {
              console.log(`[R2 Rebuild] Fanart video: ${originalUrl}`);
              const r2Url = await backupImageToR2(originalUrl, 'fanarts/videos', {
                forceUpdate: true,
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
                  forceUpdate: true,
                  metadata: { 'fanart-id': fa.id }
                });
                if (thumbRes) r2ThumbnailUrl = thumbRes;
              }

              if (r2Url) {
                if (typeof imgObj === 'string') {
                  newMedia.push(r2Url);
                } else {
                  newMedia.push({ ...imgObj, url: r2Url, original_url: originalUrl, thumbnail: r2ThumbnailUrl, original_thumbnail: originalThumbnail });
                }
                updated = true;
              } else {
                newMedia.push(imgObj);
              }
            } else {
              newMedia.push(imgObj);
            }
          }
        }

        if (updated) {
          await row.update({ media: newMedia });
          console.log(`[R2 Rebuild] Updated Fanart ${fa.id}`);
        }
      }

      console.log('[R2 Rebuild] All DB records updated with new paths and original URLs!');

    } catch (err) {
      console.error('[R2 Rebuild Error]', err);
    }
  })();
};
