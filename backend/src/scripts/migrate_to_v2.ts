import 'dotenv/config';
import { sequelize as oldDb, MV, Fanart } from '../services/pg.service.js';
import {
  sequelize as newDb,
  MVModel,
  MediaModel,
  ArtistModel,
  AlbumModel,
  KeywordModel,
  MediaGroupModel,
  MVMediaModel,
  ArtistMediaModel,
  MVArtistModel,
  MVAlbumModel,
  MVKeywordModel,
  syncModels
} from '../models/index.js';
import { nanoid } from 'nanoid';
const generateShortId = () => nanoid(16);

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
            imageId = generateShortId();
            await MediaModel.create({
              id: imageId,
              type: 'cover',
              media_type: 'image',
              url: url,
              original_url: url,
            });
            imageMap.set(url, imageId);
          }
          await MVMediaModel.findOrCreate({ where: { mv_id: mv.id, media_id: imageId, usage: 'cover', order_index: i } });
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
            imageId = generateShortId();
            let media = await MediaModel.findOne({ where: { original_url: typeof img === 'string' ? url : (img.original_url || url) } })
                     || await MediaModel.findOne({ where: { url: url } });

            if (!media) {
              await MediaModel.create({
                id: imageId,
                type: imgType,
                media_type: 'image',
                url: url,
                original_url: typeof img === 'string' ? url : (img.original_url || url),
                thumbnail_url: typeof img === 'string' ? null : img.thumbnail,
                caption: typeof img === 'string' ? null : img.caption,
                width: typeof img === 'object' ? img.width || null : null,
                height: typeof img === 'object' ? img.height || null : null
              });
            } else {
              imageId = media.get('id');
              if (typeof img === 'object' && (img.width || img.height) && (!media.get('width') || !media.get('height'))) {
                await media.update({
                  width: img.width || media.get('width'),
                  height: img.height || media.get('height')
                });
              }
            }
            imageMap.set(url, imageId);

            // If it's fanart, also try to save metadata if available
            if (isFanart) {
              let groupId = generateShortId();
              const [group] = await MediaGroupModel.findOrCreate({
                where: { source_url: img.tweetUrl || '' },
                defaults: {
                  id: groupId,
                  source_url: img.tweetUrl,
                  source_text: img.tweetText,
                  author_name: img.tweetAuthor,
                  author_handle: img.tweetHandle,
                  post_date: img.tweetDate ? new Date(img.tweetDate) : new Date(),
                  status: 'organized'
                }
              });
              await MediaModel.update({ group_id: (group as any).id }, { where: { id: imageId } });
            }
          }

          await MVMediaModel.findOrCreate({ where: { mv_id: mv.id, media_id: imageId, usage: 'gallery', order_index: i } });
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
          imageId = generateShortId();
          let media = await MediaModel.findOne({ where: { original_url: typeof media === 'string' ? url : (media.original_url || url) } })
                   || await MediaModel.findOne({ where: { url: url } });

          if (!media) {
            await MediaModel.create({
              id: imageId,
              type: 'fanart',
              media_type: 'image',
              url: url,
              original_url: typeof media === 'string' ? url : (media.original_url || url),
              thumbnail_url: typeof media === 'string' ? null : media.thumbnail,
              width: typeof media === 'object' ? media.width || null : null,
              height: typeof media === 'object' ? media.height || null : null
            });
          } else {
            imageId = media.get('id');
            if (typeof media === 'object' && (media.width || media.height) && (!media.get('width') || !media.get('height'))) {
              await media.update({
                width: media.width || media.get('width'),
                height: media.height || media.get('height')
              });
            }
          }
          imageMap.set(url, imageId);
        }

        let groupId = generateShortId();
        const [group] = await MediaGroupModel.findOrCreate({
          where: { source_url: fa.tweetUrl || '' },
          defaults: {
            id: groupId,
            source_url: fa.tweetUrl,
            source_text: fa.tweetText,
            author_name: fa.tweetAuthor,
            author_handle: fa.tweetHandle,
            post_date: fa.tweetDate ? new Date(fa.tweetDate) : new Date(),
            status: fa.status || 'pending'
          }
        });
        await MediaModel.update({ group_id: (group as any).id }, { where: { id: imageId } });

        if (fa.mv_id) {
          await MVMediaModel.findOrCreate({ where: { mv_id: fa.mv_id, media_id: imageId, usage: 'gallery', order_index: 999 } });
        }
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