import 'dotenv/config';
import { sequelize as oldDb } from '../services/pg.service.js';
import { sequelize as newDb, ArtistModel, AlbumModel, SysConfigModel, MediaModel, ArtistMediaModel } from '../models/index.js';
import { nanoid } from 'nanoid';
const generateShortId = () => nanoid(16);

async function recover() {
  console.log('Recovering Artists metadata from production V1 DB...');
  const [oldArtists] = await oldDb.query('SELECT * FROM meta_artists');
  for (const old of oldArtists as any[]) {
    const name = old.name;
    if (!name) continue;
    let artist = await ArtistModel.findOne({ where: { name: name } });
    if (!artist) {
      artist = await ArtistModel.create({
        id: generateShortId(),
        name: name,
        twitter: old.snsId || null,
        hide_twitter: old.hideId === 'true' || old.hideId === true,
        display_name: old.displayName || null,
        profile_url: old.profileUrl || null,
        bio: old.bio || null,
        instagram: old.instagram || null,
        youtube: old.youtube || null,
        pixiv: old.pixiv || null,
        tiktok: old.tiktok || null,
        website: old.website || null
      });
    } else {
      await artist.update({
        twitter: old.snsId || artist.get('twitter'),
        hide_twitter: old.hideId === 'true' || old.hideId === true ? true : artist.get('hide_twitter'),
        display_name: old.displayName || artist.get('display_name'),
        profile_url: old.profileUrl || artist.get('profile_url'),
        bio: old.bio || artist.get('bio'),
        instagram: old.instagram || artist.get('instagram'),
        youtube: old.youtube || artist.get('youtube'),
        pixiv: old.pixiv || artist.get('pixiv'),
        tiktok: old.tiktok || artist.get('tiktok'),
        website: old.website || artist.get('website')
      });
    }

    if (old.collaborations) {
      try {
        const collabs = typeof old.collaborations === 'string' ? JSON.parse(old.collaborations) : old.collaborations;
        for (const item of collabs) {
          const url = typeof item === 'string' ? item : item.url;
          if (!url) continue;
          let media = await MediaModel.findOne({ where: { original_url: url } })
                   || await MediaModel.findOne({ where: { url: url } });
          if (!media) {
            media = await MediaModel.create({
              id: generateShortId(),
              type: 'official',
              media_type: 'image',
              url: url,
              original_url: url
            });
          }
          await ArtistMediaModel.findOrCreate({
            where: { artist_id: (artist as any).id, media_id: (media as any).id }
          });
        }
      } catch (e) {
        console.error('Failed to parse collaborations for', name, e);
      }
    }
  }

  console.log('Recovering Albums metadata...');
  const [oldAlbums] = await oldDb.query('SELECT * FROM meta_albums');
  for (const old of oldAlbums as any[]) {
    const name = old.name;
    if (!name) continue;
    let album = await AlbumModel.findOne({ where: { name: name } });
    if (!album) {
      await AlbumModel.create({
        id: generateShortId(),
        name: name,
        release_date: old.date ? new Date(old.date) : null,
        hide_date: old.hideDate === 'true' || old.hideDate === true
      });
    } else {
      await album.update({
        release_date: old.date ? new Date(old.date) : album.get('release_date'),
        hide_date: old.hideDate === 'true' || old.hideDate === true ? true : album.get('hide_date')
      });
    }
  }

  console.log('Recovering Settings metadata...');
  const [oldSettings] = await oldDb.query('SELECT * FROM meta_settings');
  for (const old of oldSettings as any[]) {
    const key = old.key;
    if (!key) continue;
    const value = typeof old.value === 'string' && (old.value.startsWith('{') || old.value.startsWith('[')) ? JSON.parse(old.value) : old.value;
    let setting = await SysConfigModel.findOne({ where: { key: key } });
    if (!setting) {
      await SysConfigModel.create({ key, value });
    } else {
      await setting.update({ value });
    }
  }

  console.log('Metadata recovery completed successfully!');
  process.exit(0);
}
recover();
