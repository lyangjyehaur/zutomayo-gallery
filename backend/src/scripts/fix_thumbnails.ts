import 'dotenv/config';
import { Sequelize } from 'sequelize';
import { sequelize as newDb, MediaModel, ArtistMediaModel } from '../models/index.js';

const OLD_DB_NAME = process.env.OLD_DB_NAME || process.env.DB_NAME || 'zutomayo_gallery';
const OLD_DB_USER = process.env.OLD_DB_USER || process.env.DB_USER || 'zutomayo_gallery';
const OLD_DB_PASS = process.env.OLD_DB_PASS || process.env.DB_PASS || '';
const OLD_DB_HOST = process.env.OLD_DB_HOST || process.env.DB_HOST || '127.0.0.1';
const OLD_DB_PORT = parseInt(process.env.OLD_DB_PORT || process.env.DB_PORT || '5432', 10);

if (!OLD_DB_PASS) {
  throw new Error('Missing OLD_DB_PASS (or DB_PASS) for fix_thumbnails script');
}

const oldDb = new Sequelize(OLD_DB_NAME, OLD_DB_USER, OLD_DB_PASS, {
  host: OLD_DB_HOST,
  port: OLD_DB_PORT,
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
