import { Router, Request, Response } from 'express';
import { MediaGroupModel } from '../models/index.js';

import { getMVsFromDB } from '../services/v2_mapper.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { requireConfiguredUrl } from '../config/urls.js';
import { encodeImgproxySourceUrl } from '../utils/imgproxy.js';

const router = Router();
const BASE_URL = requireConfiguredUrl('SITEMAP_BASE_URL');
const SITEMAP_IMGPROXY_URL = requireConfiguredUrl('SITEMAP_IMGPROXY_URL');
const SITEMAP_TWITTER_ASSET_HOST = requireConfiguredUrl('SITEMAP_TWITTER_ASSET_HOST');
const SITEMAP_YOUTUBE_ASSET_HOST = requireConfiguredUrl('SITEMAP_YOUTUBE_ASSET_HOST');
const TWITTER_IMAGE_ORIGIN = requireConfiguredUrl('TWITTER_IMAGE_ORIGIN');
const YOUTUBE_IMAGE_ORIGIN = requireConfiguredUrl('YOUTUBE_IMAGE_ORIGIN');

router.get('/sitemap.xml', asyncHandler(async (req: Request, res: Response) => {
  const [mvs, fanarts] = await Promise.all([
    getMVsFromDB(),
    MediaGroupModel.findAll({ where: { status: 'organized' } })
  ]);

  const urls: string[] = [];
  const langs = ['zh', 'ja', 'en'];

  // 1. 靜態主頁
  langs.forEach(lang => {
    urls.push(`
  <url>
    <loc>${BASE_URL}/${lang}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);
    urls.push(`
  <url>
    <loc>${BASE_URL}/${lang}/illustrators</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);
  });

  // 2. MV 詳細頁 (包含圖片 Sitemap)
  mvs.forEach((row: any) => {
    const mv = row;
    const lastmod = mv.updatedAt 
      ? new Date(mv.updatedAt).toISOString() 
      : (mv.date ? new Date(mv.date).toISOString() : new Date().toISOString());
        
    langs.forEach(lang => {
      let imageTags = '';
      
      // MV 封面 (YouTube Thumbnail)
      if (mv.video_id) {
        const sourceUrl = `${YOUTUBE_IMAGE_ORIGIN}/vi/${mv.video_id}/maxresdefault.jpg`;
        const encodedSourceUrl = encodeImgproxySourceUrl(sourceUrl);
        imageTags += `
    <image:image>
      <image:loc>${SITEMAP_IMGPROXY_URL}/f:webp/w:1280/${encodedSourceUrl}/maxresdefault.jpg</image:loc>
      <image:title>${(mv.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
    </image:image>`;
      }
      
      // MV 內附的推特圖
      if (mv.images && Array.isArray(mv.images)) {
        mv.images.forEach((img: any) => {
          const rawUrl = typeof img === 'string' ? img : img.url;
          let imgUrl = rawUrl;
          if (rawUrl.includes(new URL(TWITTER_IMAGE_ORIGIN).hostname)) {
            imgUrl = rawUrl.replace(TWITTER_IMAGE_ORIGIN, SITEMAP_TWITTER_ASSET_HOST);
          } else if (rawUrl.includes(new URL(YOUTUBE_IMAGE_ORIGIN).hostname)) {
            imgUrl = rawUrl.replace(YOUTUBE_IMAGE_ORIGIN, SITEMAP_YOUTUBE_ASSET_HOST);
          }
          // R2 公開網址直接使用原值，不走 Nginx 反代
          
          imageTags += `
    <image:image>
      <image:loc>${imgUrl.replace(/&/g, '&amp;')}</image:loc>
      <image:title>${(mv.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
    </image:image>`;
        });
      }

      urls.push(`
  <url>
    <loc>${BASE_URL}/${lang}/mv/${mv.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imageTags}
  </url>`);
    });
  });

  // 3. Fanart 頁面圖片 (Fanart 本身沒有獨立 URL，但可以把圖片歸類到 /fanart 頁面底下)
  langs.forEach(lang => {
    let fanartImages = '';
    fanarts.forEach((row: any) => {
      const fa = row.toJSON();
      if (fa.media && Array.isArray(fa.media)) {
        fa.media.forEach((imgObj: any) => {
          const rawUrl = typeof imgObj === 'string' ? imgObj : imgObj.url;
          if (!rawUrl) return;

          let proxyUrl = rawUrl;
          if (rawUrl.includes(new URL(TWITTER_IMAGE_ORIGIN).hostname)) {
            proxyUrl = rawUrl.replace(TWITTER_IMAGE_ORIGIN, SITEMAP_TWITTER_ASSET_HOST);
          } else if (rawUrl.includes(new URL(YOUTUBE_IMAGE_ORIGIN).hostname)) {
            proxyUrl = rawUrl.replace(YOUTUBE_IMAGE_ORIGIN, SITEMAP_YOUTUBE_ASSET_HOST);
          }
          // R2 公開網址直接使用原值，不走 Nginx 反代
          
          fanartImages += `
    <image:image>
      <image:loc>${proxyUrl.replace(/&/g, '&amp;')}</image:loc>
      <image:title>Fanart by ${(fa.tweetAuthor || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
    </image:image>`;
        });
      }
    });
    
    urls.push(`
  <url>
    <loc>${BASE_URL}/${lang}/fanart</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>${fanartImages}
  </url>`);
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('')}
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(sitemap);
}));

export default router;
