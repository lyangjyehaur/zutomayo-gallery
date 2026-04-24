import 'dotenv/config';
import Database from 'better-sqlite3';
import { sequelize, ArtistModel, AlbumModel, SysConfigModel, MediaModel, ArtistMediaModel } from '../models/index.js';

import { nanoid } from 'nanoid';
const generateShortId = () => nanoid(16);

async function recover() {
  console.log('Connecting to PostgreSQL...');
  await sequelize.authenticate();

  console.log('Connecting to SQLite backup...');
  const db = new Database('./data/database.sqlite', { readonly: true });

  try {
    // 1. Recover meta_artists -> artists
    console.log('Recovering Artists metadata...');
    const oldArtists = db.prepare('SELECT * FROM meta_artists').all() as any[];
    for (const old of oldArtists) {
      // old schema: name (PK), snsId, hideId, displayName, profileUrl, bio, dataId, collaborations, instagram, youtube, pixiv, tiktok, website
      const name = old.name;
      if (!name) continue;

      const artist = await ArtistModel.findOne({ where: { name: name } });
      if (!artist) {
        // Just update existing artists that MV created, but if we have standalone artist, we create it.
        // Or we just upsert.
      }

      await ArtistModel.upsert({
        name: name,
        twitter: old.snsId || '',
        profile_url: old.profileUrl || '',
        bio: old.bio || '',
        instagram: old.instagram || '',
        youtube: old.youtube || '',
        pixiv: old.pixiv || '',
        tiktok: old.tiktok || '',
        website: old.website || ''
      });

      // Recover collaborations (images)
      if (old.collaborations) {
        try {
          const collabs = JSON.parse(old.collaborations);
          if (Array.isArray(collabs)) {
            // Find the artist to get its ID
            const dbArtist = await ArtistModel.findOne({ where: { name: name } });
            if (dbArtist) {
              const artistId = (dbArtist as any).id;
              for (const c of collabs) {
                if (!c.url) continue;
                
                // Try to find if media exists by original_url or url
                let media = await MediaModel.findOne({ where: { original_url: c.url } }) 
                         || await MediaModel.findOne({ where: { url: c.url } });
                
                if (!media) {
                  media = await MediaModel.create({
                    id: generateShortId(),
                    type: 'official',
                    media_type: 'image',
                    url: c.url,
                    original_url: c.url,
                    caption: c.caption || c.title || ''
                  });
                }
                
                await ArtistMediaModel.findOrCreate({
                  where: { artist_id: artistId, media_id: (media as any).id }
                });
              }
            }
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    }
    console.log(`Recovered ${oldArtists.length} artists.`);

    // 2. Recover meta_albums -> albums
    console.log('Recovering Albums metadata...');
    const oldAlbums = db.prepare('SELECT * FROM meta_albums').all() as any[];
    for (const old of oldAlbums) {
      // old schema: name (PK), date, hideDate
      const name = old.name;
      if (!name) continue;

      let releaseDate = null;
      if (old.date) {
        // e.g. "2023-06-07"
        try {
          releaseDate = new Date(old.date.replace(/\//g, '-'));
        } catch (e) {}
      }

      await AlbumModel.upsert({
        name: name,
        release_date: releaseDate,
        hide_date: old.hideDate === 1 || old.hideDate === true || old.hideDate === 'true'
      });
    }
    console.log(`Recovered ${oldAlbums.length} albums.`);

    // 3. Recover meta_settings -> sys_configs
    console.log('Recovering Settings metadata...');
    const oldSettings = db.prepare('SELECT * FROM meta_settings').all() as any[];
    for (const old of oldSettings) {
      // old schema: key, value (JSON string)
      const key = old.key;
      const value = old.value;
      if (!key || !value) continue;

      try {
        let parsedValue = JSON.parse(value);
        if (key === 'announcements' && Array.isArray(parsedValue)) {
          parsedValue = parsedValue.filter(a => typeof a === 'string');
        }
        await SysConfigModel.upsert({
          key: key,
          value: parsedValue
        });
      } catch (e) {
        // if not json
        await SysConfigModel.upsert({
          key: key,
          value: value
        });
      }
    }
    console.log(`Recovered ${oldSettings.length} settings.`);

    console.log('Recovery completed successfully!');
  } catch (error) {
    console.error('Error during recovery:', error);
  } finally {
    db.close();
    process.exit(0);
  }
}

recover();
