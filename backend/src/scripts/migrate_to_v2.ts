import 'dotenv/config';
import { sequelize as oldDb, MV, Fanart } from '../services/pg.service.js';
import {
  sequelize as newDb,
  MVModel,
  ImageModel,
  ArtistModel,
  AlbumModel,
  KeywordModel,
  FanartMetadataModel,
  MVImageModel,
  ArtistImageModel,
  MVArtistModel,
  MVAlbumModel,
  MVKeywordModel,
  syncModels
} from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

async function migrate() {
  console.log('Starting database migration to V2...');

  // 1. Ensure new tables exist
  await syncModels();

  // Maps to prevent duplicating records
  const artistMap = new Map();
  const albumMap = new Map();
  const keywordMap = new Map();
  const imageMap = new Map(); // key: url, value: image_id

  const getOrCreateArtist = async (name: any) => {
    if (!name) return null;
    const cleanName = String(name).trim();
    if (!artistMap.has(cleanName)) {
      const artist = await ArtistModel.create({ name: cleanName });
      artistMap.set(cleanName, artist.get('id'));
    }
    return artistMap.get(cleanName);
  };

  const getOrCreateAlbum = async (name: any) => {
    if (!name) return null;
    const cleanName = String(name).trim();
    if (!albumMap.has(cleanName)) {
      const album = await AlbumModel.create({ name: cleanName });
      albumMap.set(cleanName, album.get('id'));
    }
    return albumMap.get(cleanName);
  };

  const getOrCreateKeyword = async (name: any) => {
    if (!name) return null;
    const cleanName = String(name).trim();
    if (!keywordMap.has(cleanName)) {
      const [keyword] = await KeywordModel.findOrCreate({ where: { name: cleanName } });
      keywordMap.set(cleanName, keyword.get('id'));
    }
    return keywordMap.get(cleanName);
  };

  try {
    // 2. Migrate MVs
    const mvs = await MV.findAll();
    console.log(`Found ${mvs.length} MVs to migrate.`);

    for (const row of mvs) {
      const mv: any = row.toJSON();
      
      // Insert MV base info
      await MVModel.upsert({
        id: mv.id,
        title: mv.title,
        year: mv.year,
        date: mv.date,
        youtube: mv.youtube,
        bilibili: mv.bilibili,
        description: mv.description,
      });

      // Migrate Artists
      const artists = Array.isArray(mv.artist) ? mv.artist : (mv.artist ? mv.artist.split(',') : []);
      for (const artistName of artists) {
        const artistId = await getOrCreateArtist(artistName);
        if (artistId) {
          await MVArtistModel.findOrCreate({ where: { mv_id: mv.id, artist_id: artistId, role: 'unknown' } });
        }
      }

      // Migrate Albums
      const albums = Array.isArray(mv.album) ? mv.album : (mv.album ? mv.album.split(',') : []);
      for (const albumName of albums) {
        const albumId = await getOrCreateAlbum(albumName);
        if (albumId) {
          await MVAlbumModel.findOrCreate({ where: { mv_id: mv.id, album_id: albumId, track_number: 0 } });
        }
      }

      // Migrate Keywords
      const keywords = Array.isArray(mv.keywords) ? mv.keywords : (mv.keywords ? mv.keywords.split(',') : []);
      for (const keywordName of keywords) {
        const keywordId = await getOrCreateKeyword(keywordName);
        if (keywordId) {
          await MVKeywordModel.findOrCreate({ where: { mv_id: mv.id, keyword_id: keywordId } });
        }
      }

      // Migrate Cover Images
      if (Array.isArray(mv.coverImages)) {
        for (let i = 0; i < mv.coverImages.length; i++) {
          const url = mv.coverImages[i];
          if (!url) continue;

          let imageId = imageMap.get(url);
          if (!imageId) {
            imageId = uuidv4();
            await ImageModel.create({
              id: imageId,
              type: 'cover',
              url: url,
              original_url: url,
            });
            imageMap.set(url, imageId);
          }
          await MVImageModel.findOrCreate({ where: { mv_id: mv.id, image_id: imageId, usage: 'cover', order_index: i } });
        }
      }

      // Migrate MV Gallery Images / Fanarts stored in MV
      if (Array.isArray(mv.images)) {
        for (let i = 0; i < mv.images.length; i++) {
          const img = mv.images[i];
          const url = typeof img === 'string' ? img : img.url;
          if (!url) continue;

          let imageId = imageMap.get(url);
          const isFanart = typeof img !== 'string' && img.type === 'fanart';
          const imgType = isFanart ? 'fanart' : 'official';

          if (!imageId) {
            imageId = uuidv4();
            await ImageModel.create({
              id: imageId,
              type: imgType,
              url: url,
              original_url: typeof img === 'string' ? url : (img.original_url || url),
              thumbnail_url: typeof img === 'string' ? null : img.thumbnail,
              caption: typeof img === 'string' ? null : img.caption,
            });
            imageMap.set(url, imageId);

            // If it's fanart, also try to save metadata if available
            if (isFanart) {
              await FanartMetadataModel.findOrCreate({
                where: { image_id: imageId },
                defaults: {
                  tweet_url: img.tweetUrl,
                  tweet_text: img.tweetText,
                  tweet_author: img.tweetAuthor,
                  tweet_handle: img.tweetHandle,
                  tweet_date: img.tweetDate ? new Date(img.tweetDate) : new Date(),
                  status: 'organized'
                }
              });
            }
          }

          await MVImageModel.findOrCreate({ where: { mv_id: mv.id, image_id: imageId, usage: 'gallery', order_index: i } });
        }
      }
    }

    // 3. Migrate standalone Fanarts
    const fanarts = await Fanart.findAll();
    console.log(`Found ${fanarts.length} standalone Fanarts to migrate.`);
    for (const row of fanarts) {
      const fa: any = row.toJSON();
      if (!Array.isArray(fa.media)) continue;

      for (const media of fa.media) {
        const url = typeof media === 'string' ? media : media.url;
        if (!url) continue;

        let imageId = imageMap.get(url);
        if (!imageId) {
          imageId = uuidv4();
          await ImageModel.create({
            id: imageId,
            type: 'fanart',
            url: url,
            original_url: typeof media === 'string' ? url : (media.original_url || url),
            thumbnail_url: typeof media === 'string' ? null : media.thumbnail,
          });
          imageMap.set(url, imageId);
        }

        await FanartMetadataModel.upsert({
          image_id: imageId,
          tweet_url: fa.tweetUrl,
          tweet_text: fa.tweetText,
          tweet_author: fa.tweetAuthor,
          tweet_handle: fa.tweetHandle,
          tweet_date: fa.tweetDate,
          status: fa.status
        });
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();