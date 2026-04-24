import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getMVsFromDB, saveMVsToDB } from '../services/v2_mapper.js';
import { MediaGroupModel, MediaModel } from '../models/index.js';
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
      const mvs = await getMVsFromDB();
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
          await saveMVsToDB([mv]);
          console.log(`[R2 Rebuild] Updated MV ${mv.id}`);
        }
      }

      // 2. 同步 Fanarts
      const fanarts = await MediaGroupModel.findAll({ where: { status: 'organized' }, include: [{ model: MediaModel, as: 'images' }] });
      for (const faGroup of fanarts) {
        const data = faGroup.toJSON() as any;
        if (!data.images) continue;
        
        for (const media of data.images) {
          if (!media.original_url || !(media.original_url.includes('pbs.twimg.com') || media.original_url.includes('video.twimg.com'))) {
            continue;
          }
          
          try {
            const typePath = media.media_type === 'video' ? 'videos' : 'images';
            const r2Url = await backupImageToR2(media.original_url, `fanarts/${typePath}`, {
              forceUpdate: true,
              metadata: {
                'fanart-id': data.id,
                'author-handle': data.author_handle || 'unknown',
                'source-tweet': data.source_url || 'unknown'
              }
            });
            
            if (r2Url) {
              await MediaModel.update({ url: r2Url }, { where: { id: media.id } });
              
              // Backup thumbnail if video
              if (media.media_type === 'video' && media.thumbnail_url && media.thumbnail_url.includes('pbs.twimg.com')) {
                const r2ThumbUrl = await backupImageToR2(media.thumbnail_url, `fanarts/videos/thumbs`, {
                  forceUpdate: true,
                  metadata: { 'fanart-id': data.id }
                });
                if (r2ThumbUrl) {
                  await MediaModel.update({ thumbnail_url: r2ThumbUrl }, { where: { id: media.id } });
                }
              }
            }
          } catch (e: any) {
            console.error(`[R2 Rebuild Error] FanArt ${data.id} - ${media.original_url}:`, e.message);
          }
        }
      }

      console.log('[R2 Rebuild] All DB records updated with new paths and original URLs!');

    } catch (err) {
      console.error('[R2 Rebuild Error]', err);
    }
  })();
};
