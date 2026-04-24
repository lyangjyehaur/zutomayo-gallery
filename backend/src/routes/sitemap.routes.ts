import { Router } from 'express';
import { MV, Fanart } from '../services/pg.service.js';

const router = Router();
const BASE_URL = 'https://gallery.ztmr.club';

router.get('/sitemap.xml', async (req, res) => {
  try {
    const [mvs, fanarts] = await Promise.all([
      MV.findAll(),
      Fanart.findAll({ where: { status: 'organized' } })
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
      urls.push(`
  <url>
    <loc>${BASE_URL}/${lang}/fanart</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);
    });

    // 2. MV 詳細頁 (包含圖片 Sitemap)
    mvs.forEach((row: any) => {
      const mv = row.toJSON();
      const lastmod = mv.updatedAt 
        ? new Date(mv.updatedAt).toISOString() 
        : (mv.date ? new Date(mv.date).toISOString() : new Date().toISOString());
        
      langs.forEach(lang => {
        let imageTags = '';
        
        // MV 封面 (YouTube Thumbnail)
        if (mv.video_id) {
          imageTags += `
    <image:image>
      <image:loc>https://img.ztmr.club/f:webp/w:1280/aHR0cHM6Ly9pLnl0aW1nLmNvbS92aS8${Buffer.from(`https://i.ytimg.com/vi/${mv.video_id}/maxresdefault.jpg`).toString('base64').replace(/=/g, '')}/maxresdefault.jpg</image:loc>
      <image:title>${(mv.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
    </image:image>`;
        }
        
        // MV 內附的推特圖
        if (mv.images && Array.isArray(mv.images)) {
          mv.images.forEach((img: any) => {
            const rawUrl = typeof img === 'string' ? img : img.url;
            const imgUrl = rawUrl.replace('https://pbs.twimg.com', 'https://assets.ztmr.club/ti');
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
        if (fa.images && Array.isArray(fa.images)) {
          fa.images.forEach((imgUrl: string) => {
            const proxyUrl = imgUrl.replace('https://pbs.twimg.com', 'https://assets.ztmr.club/ti');
            fanartImages += `
    <image:image>
      <image:loc>${proxyUrl.replace(/&/g, '&amp;')}</image:loc>
      <image:title>Fanart by ${(fa.tweetAuthor || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
    </image:image>`;
          });
        }
      });
      
      if (fanartImages) {
        urls.push(`
  <url>
    <loc>${BASE_URL}/${lang}/fanart</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>${fanartImages}
  </url>`);
      }
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('[Sitemap] Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router;
