import 'dotenv/config';
import { Sequelize } from 'sequelize';
import { sequelize as newDb, MediaModel, ArtistMediaModel } from '../models/index.js';

const oldDb = new Sequelize('zutomayo_gallery', 'zutomayo_gallery', 'FBZNYC3HSJExdHX3', {
  host: process.env.DB_HOST || '45.147.26.57',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  dialect: 'postgres',
  logging: false,
});

async function fix() {
  console.log('Fixing thumbnails from V1 DB...');
  const [oldArtists] = await oldDb.query('SELECT * FROM meta_artists');
  
  let updateCount = 0;
  
  for (const old of oldArtists as any[]) {
    if (!old.collaborations) continue;
    
    try {
      const collabs = typeof old.collaborations === 'string' ? JSON.parse(old.collaborations) : old.collaborations;
      for (const item of collabs) {
        if (typeof item === 'object' && item.thumbnail && item.url) {
          const updated = await MediaModel.update(
            { thumbnail_url: item.thumbnail },
            { where: { original_url: item.url, thumbnail_url: null } }
          );
          if (updated[0] > 0) updateCount++;
        }
        
        // 順手修復 mp4 被誤判為 image 的問題
        if (item.url && (item.url.includes('.mp4') || item.url.includes('video.twimg.com'))) {
          await MediaModel.update(
            { media_type: 'video' },
            { where: { original_url: item.url, media_type: 'image' } }
          );
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  console.log(`Updated ${updateCount} media thumbnails!`);
  process.exit(0);
}
fix();
