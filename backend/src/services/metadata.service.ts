import { ArtistModel, AlbumModel, SysConfigModel, SysAnnouncementModel, MediaModel, ArtistMediaModel } from '../models/index.js';
import { sequelize } from '../models/index.js';
import { ArtistMeta } from '../types.js';

export interface AlbumMeta {
  date?: string;
  hideDate?: boolean;
}

export interface MetadataResponse {
  albumMeta: Record<string, AlbumMeta>;
  artistMeta: Record<string, ArtistMeta>;
  announcements?: string[] | Record<string, string[]>;
  [key: string]: any;
}

const defaultMetadata: MetadataResponse = {
  albumMeta: {},
  artistMeta: {},
  announcements: [],
  showAutoAlbumDate: false,
};

let runtimeMetadata: MetadataResponse | null = null;

const normalizeMetadata = (raw: unknown): MetadataResponse => {
  const base: MetadataResponse = JSON.parse(JSON.stringify(defaultMetadata));
  if (!raw || typeof raw !== 'object') return base;

  const r = raw as any;

  if (typeof r.showAutoAlbumDate === 'boolean') {
    base.showAutoAlbumDate = r.showAutoAlbumDate;
  }
  if (Array.isArray(r.announcements)) {
    base.announcements = r.announcements.filter((a: any) => typeof a === 'string');
  } else if (r.announcements && typeof r.announcements === 'object') {
    const obj: Record<string, string[]> = {};
    for (const [lang, arr] of Object.entries(r.announcements)) {
      if (Array.isArray(arr)) {
        obj[lang] = arr.filter((a: any) => typeof a === 'string');
      }
    }
    base.announcements = obj;
  }

  const trySetAlbumMeta = (src: any) => {
    if (!src || typeof src !== 'object') return;
    for (const [k, v] of Object.entries(src)) {
      if (!k) continue;
      if (typeof v === 'string') {
        base.albumMeta[k] = { date: v };
        continue;
      }
      if (!v || typeof v !== 'object') continue;
      // 支援新版 date/hideDate 或舊版 year/hideYear
      const date = typeof (v as any).date === 'string' ? (v as any).date : typeof (v as any).year === 'string' ? (v as any).year : undefined;
      const hideDate = typeof (v as any).hideDate === 'boolean' ? (v as any).hideDate : typeof (v as any).hideYear === 'boolean' ? (v as any).hideYear : undefined;
      base.albumMeta[k] = { ...(date ? { date } : {}), ...(hideDate !== undefined ? { hideDate } : {}) };
    }
  };

  const trySetArtistMeta = (src: any) => {
    if (!src || typeof src !== 'object') return;
    for (const [k, v] of Object.entries(src)) {
      if (!k) continue;
      if (typeof v === 'string') {
        base.artistMeta[k] = { twitter: v };
        continue;
      }
      if (!v || typeof v !== 'object') continue;

      const id = typeof (v as any).id === 'string' ? (v as any).id : undefined;
      const twitter = typeof (v as any).twitter === 'string' ? (v as any).twitter : id;
      const hideId = typeof (v as any).hideId === 'boolean' ? (v as any).hideId : undefined;
      const displayName = typeof (v as any).displayName === 'string' ? (v as any).displayName : undefined;
      const profileUrl = typeof (v as any).profileUrl === 'string' ? (v as any).profileUrl : undefined;
      const bio = typeof (v as any).bio === 'string' ? (v as any).bio : undefined;
      const dataId = typeof (v as any).dataId === 'string' ? (v as any).dataId : undefined;
      const collaborations = Array.isArray((v as any).collaborations) ? (v as any).collaborations : undefined;
      const instagram = typeof (v as any).instagram === 'string' ? (v as any).instagram : undefined;
      const youtube = typeof (v as any).youtube === 'string' ? (v as any).youtube : undefined;
      const pixiv = typeof (v as any).pixiv === 'string' ? (v as any).pixiv : undefined;
      const tiktok = typeof (v as any).tiktok === 'string' ? (v as any).tiktok : undefined;
      const website = typeof (v as any).website === 'string' ? (v as any).website : undefined;

      base.artistMeta[k] = { 
        ...(twitter ? { twitter } : {}), 
        ...(hideId !== undefined ? { hideId } : {}),
        ...(displayName ? { displayName } : {}),
        ...(profileUrl ? { profileUrl } : {}),
        ...(bio ? { bio } : {}),
        ...(dataId ? { dataId } : {}),
        ...(collaborations ? { collaborations } : {}),
        ...(instagram ? { instagram } : {}),
        ...(youtube ? { youtube } : {}),
        ...(pixiv ? { pixiv } : {}),
        ...(tiktok ? { tiktok } : {}),
        ...(website ? { website } : {})
      };
    }
  };

  if (r.albumMeta) trySetAlbumMeta(r.albumMeta);
  if (r.artistMeta) trySetArtistMeta(r.artistMeta);

  if (r.albumYears) trySetAlbumMeta(r.albumYears);
  if (r.artistIds) trySetArtistMeta(r.artistIds);

  return base;
};

export const getMetadata = async (): Promise<MetadataResponse> => {
  // 1. 取得畫師資料 (從 V2 ArtistModel)
  const artists = await ArtistModel.findAll();
  const artistMediaList = await ArtistMediaModel.findAll();
  const mediaList = await MediaModel.findAll({ where: { type: 'collaboration' } });
  
  const artistMeta: Record<string, ArtistMeta> = {};
  for (const row of artists) {
    const data = row.toJSON() as any;
    
    // Find collaborations for this artist
    const mediaIds = artistMediaList.filter(am => (am as any).artist_id === data.id).map(am => (am as any).media_id);
    const artistCollaborations = mediaList.filter(m => mediaIds.includes((m as any).id)).map(m => {
        const media = m.toJSON() as any;
        return {
          url: media.url,
          thumbnail_url: media.thumbnail_url || undefined,
          thumbnail: media.thumbnail_url || undefined, // keep for backward compatibility
          width: media.width,
          height: media.height,
          type: media.media_type,
          tweetUrl: media.original_url,
        };
      });

    artistMeta[data.name] = { 
      ...(data.twitter ? { twitter: data.twitter } : {}), 
      ...(data.profile_url ? { profileUrl: data.profile_url } : {}),
      ...(data.bio ? { bio: data.bio } : {}),
      ...(data.instagram ? { instagram: data.instagram } : {}),
      ...(data.youtube ? { youtube: data.youtube } : {}),
      ...(data.pixiv ? { pixiv: data.pixiv } : {}),
      ...(data.tiktok ? { tiktok: data.tiktok } : {}),
      ...(data.website ? { website: data.website } : {}),
      ...(artistCollaborations.length > 0 ? { collaborations: artistCollaborations } : {})
    };
  }

  // 2. 取得專輯資料 (從 V2 AlbumModel)
  const albums = await AlbumModel.findAll();
  const albumMeta: Record<string, AlbumMeta> = {};
  for (const row of albums) {
    const data = row.toJSON() as any;
    albumMeta[data.name] = {
      type: data.type || 'album',
      // Release date is now managed via apple_music_albums relation
      ...(data.apple_music_album_id ? { apple_music_album_id: data.apple_music_album_id } : {}),
      ...(data.hide_date ? { hideDate: data.hide_date } : {}),
    };
  }

  // 3. 取得系統設定
  const settings = await SysConfigModel.findAll();
  const configMap: Record<string, any> = {};
  for (const row of settings) {
    const data = row.toJSON() as any;
    configMap[data.key] = data.value;
  }

  // 4. 取得公告
  const announcements = await SysAnnouncementModel.findAll({ where: { is_active: true } });
  const announcementTexts = announcements.map(a => (a.toJSON() as any).content);

  return {
    artistMeta,
    albumMeta,
    announcements: announcementTexts,
    ...configMap
  };
};

export const saveMetadata = async (data: MetadataResponse): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    if (data.artistMeta) {
      for (const [name, rawMeta] of Object.entries(data.artistMeta)) {
        const meta = rawMeta as ArtistMeta;
        const artistData = {
          name,
          twitter: meta.twitter || meta.id || '',
          profile_url: meta.profileUrl || '',
          bio: meta.bio || '',
          instagram: meta.instagram || '',
          youtube: meta.youtube || '',
          pixiv: meta.pixiv || '',
          tiktok: meta.tiktok || '',
          website: meta.website || '',
        };
        const artist = await ArtistModel.findOne({ where: { name }, transaction: t });
        let artistId: string;
        if (artist) {
          await artist.update(artistData, { transaction: t });
          artistId = (artist as any).id;
        } else {
          const newArtist = await ArtistModel.create(artistData, { transaction: t });
          artistId = (newArtist as any).id;
        }

        // Save collaborations
        if (meta.collaborations) {
          // Delete existing collaborations
          const existingLinks = await ArtistMediaModel.findAll({ where: { artist_id: artistId }, transaction: t });
          if (existingLinks.length > 0) {
            const mediaIds = existingLinks.map(l => (l as any).media_id);
            await ArtistMediaModel.destroy({ where: { artist_id: artistId }, transaction: t });
            await MediaModel.destroy({ where: { id: mediaIds }, transaction: t });
          }

          // Insert new ones
          for (const collab of meta.collaborations) {
            const mediaData = {
              type: 'collaboration',
              media_type: collab.type || 'image',
              url: collab.url,
              original_url: collab.tweetUrl || collab.url,
              thumbnail_url: collab.thumbnail || null,
              width: collab.width || null,
              height: collab.height || null,
            };
            const newMedia = await MediaModel.create(mediaData, { transaction: t });
            await ArtistMediaModel.create({
              artist_id: artistId,
              media_id: (newMedia as any).id
            }, { transaction: t });
          }
        }
      }
    }

    if (data.albumMeta) {
      for (const [name, rawMeta] of Object.entries(data.albumMeta)) {
        const meta = rawMeta as AlbumMeta;
        const albumData = {
          name,
          hide_date: meta.hideDate || false,
        };
        const album = await AlbumModel.findOne({ where: { name }, transaction: t });
        if (album) {
          await album.update(albumData, { transaction: t });
        } else {
          await AlbumModel.create(albumData, { transaction: t });
        }
      }
    }

    if (data.showAutoAlbumDate !== undefined) {
      await SysConfigModel.upsert({
        key: 'showAutoAlbumDate',
        value: data.showAutoAlbumDate,
        description: '自動計算專輯日期'
      }, { transaction: t });
    }

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }
};
