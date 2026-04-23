import { MetaAlbum, MetaArtist, MetaSetting, sequelize } from './pg.service.js';

export interface AlbumMeta {
  date?: string;
  hideDate?: boolean;
}

export interface ArtistMeta {
  id?: string;
  hideId?: boolean;
  displayName?: string;
  profileUrl?: string;
  bio?: string;
  dataId?: string;
  collaborations?: any[];
  instagram?: string;
  youtube?: string;
  pixiv?: string;
  tiktok?: string;
  website?: string;
}

export interface MetadataSettings {
  showAutoAlbumDate: boolean;
  announcements?: string[] | Record<string, string[]>;
}

export interface Metadata {
  albumMeta: Record<string, AlbumMeta>;
  artistMeta: Record<string, ArtistMeta>;
  settings: MetadataSettings;
}

const defaultMetadata: Metadata = {
  albumMeta: {},
  artistMeta: {},
  settings: {
    showAutoAlbumDate: false,
    announcements: [],
  },
};

let runtimeMetadata: Metadata | null = null;

const normalizeMetadata = (raw: unknown): Metadata => {
  const base: Metadata = JSON.parse(JSON.stringify(defaultMetadata));
  if (!raw || typeof raw !== 'object') return base;

  const r = raw as any;

  if (r.settings && typeof r.settings === 'object') {
    if (typeof r.settings.showAutoAlbumDate === 'boolean') {
      base.settings.showAutoAlbumDate = r.settings.showAutoAlbumDate;
    } else if (typeof r.settings.showAutoAlbumYear === 'boolean') {
      // 相容舊版 showAutoAlbumYear
      base.settings.showAutoAlbumDate = r.settings.showAutoAlbumYear;
    }
    if (Array.isArray(r.settings.announcements)) {
      base.settings.announcements = r.settings.announcements.filter((a: any) => typeof a === 'string');
    } else if (r.settings.announcements && typeof r.settings.announcements === 'object') {
      const obj: Record<string, string[]> = {};
      for (const [lang, arr] of Object.entries(r.settings.announcements)) {
        if (Array.isArray(arr)) {
          obj[lang] = arr.filter((a: any) => typeof a === 'string');
        }
      }
      base.settings.announcements = obj;
    }
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
        base.artistMeta[k] = { id: v };
        continue;
      }
      if (!v || typeof v !== 'object') continue;
      const id = typeof (v as any).id === 'string' ? (v as any).id : undefined;
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
        ...(id ? { id } : {}), 
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

export const getMetadata = async (): Promise<Metadata> => {
  if (runtimeMetadata) return runtimeMetadata;
  
  const albums = await MetaAlbum.findAll();
  const artists = await MetaArtist.findAll();
  const settingsRows = await MetaSetting.findAll();

  const albumMeta: Record<string, AlbumMeta> = {};
  for (const row of albums) {
    const data = row.toJSON() as any;
    albumMeta[data.name] = { 
      ...(data.date ? { date: data.date } : {}), 
      ...(data.hideDate !== null && data.hideDate !== undefined ? { hideDate: Boolean(data.hideDate) } : {})
    };
  }

  const artistMeta: Record<string, ArtistMeta> = {};
  for (const row of artists) {
    const data = row.toJSON() as any;
    artistMeta[data.name] = { 
      ...(data.snsId ? { id: data.snsId } : {}), 
      ...(data.hideId !== null && data.hideId !== undefined ? { hideId: Boolean(data.hideId) } : {}),
      ...(data.displayName ? { displayName: data.displayName } : {}),
      ...(data.profileUrl ? { profileUrl: data.profileUrl } : {}),
      ...(data.bio ? { bio: data.bio } : {}),
      ...(data.dataId ? { dataId: data.dataId } : {}),
      ...(data.instagram ? { instagram: data.instagram } : {}),
      ...(data.youtube ? { youtube: data.youtube } : {}),
      ...(data.pixiv ? { pixiv: data.pixiv } : {}),
      ...(data.tiktok ? { tiktok: data.tiktok } : {}),
      ...(data.website ? { website: data.website } : {}),
    };
    if (data.collaborations) {
      try {
        artistMeta[data.name].collaborations = typeof data.collaborations === 'string' ? JSON.parse(data.collaborations) : data.collaborations;
      } catch(e) {}
    }
  }

  const settings: MetadataSettings = { showAutoAlbumDate: false, announcements: [] };
  for (const row of settingsRows) {
    const data = row.toJSON() as any;
    if (data.key === 'showAutoAlbumDate') settings.showAutoAlbumDate = data.value === 'true';
    if (data.key === 'announcements') {
      try {
        settings.announcements = JSON.parse(data.value);
      } catch (e) {
        settings.announcements = [];
      }
    }
  }

  runtimeMetadata = { albumMeta, artistMeta, settings };
  return runtimeMetadata;
};

export const updateMetadata = async (data: Partial<Metadata>): Promise<Metadata> => {
  const current = await getMetadata();
  
  await sequelize.transaction(async (t) => {
    if (data.albumMeta) {
      current.albumMeta = data.albumMeta;
      await MetaAlbum.destroy({ where: {}, transaction: t });
      for (const [name, meta] of Object.entries(data.albumMeta)) {
        await MetaAlbum.create({
          name,
          date: meta.date || '',
          hideDate: meta.hideDate ? true : false
        }, { transaction: t });
      }
    }

    if (data.artistMeta) {
      current.artistMeta = data.artistMeta;
      await MetaArtist.destroy({ where: {}, transaction: t });
      for (const [name, meta] of Object.entries(data.artistMeta)) {
        await MetaArtist.create({
          name,
          snsId: meta.id || '',
          hideId: meta.hideId ? true : false,
          displayName: meta.displayName || '',
          profileUrl: meta.profileUrl || '',
          bio: meta.bio || '',
          dataId: meta.dataId || '',
          collaborations: meta.collaborations ? meta.collaborations : [],
          instagram: meta.instagram || '',
          youtube: meta.youtube || '',
          pixiv: meta.pixiv || '',
          tiktok: meta.tiktok || '',
          website: meta.website || ''
        }, { transaction: t });
      }
    }

    if (data.settings) {
      current.settings = { ...current.settings, ...data.settings };
      await MetaSetting.upsert({ key: 'showAutoAlbumDate', value: current.settings.showAutoAlbumDate ? 'true' : 'false' }, { transaction: t });
      await MetaSetting.upsert({ key: 'announcements', value: JSON.stringify(current.settings.announcements || []) }, { transaction: t });
    }
  });

  runtimeMetadata = normalizeMetadata(current);
  return runtimeMetadata;
};
