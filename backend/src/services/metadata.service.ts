import { getDB } from './db.service.js';

export interface AlbumMeta {
  date?: string;
  hideDate?: boolean;
}

export interface ArtistMeta {
  id?: string;
  hideId?: boolean;
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
      base.artistMeta[k] = { ...(id ? { id } : {}), ...(hideId !== undefined ? { hideId } : {}) };
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
  const db = getDB();
  
  const albums = db.prepare('SELECT * FROM meta_albums').all() as any[];
  const artists = db.prepare('SELECT * FROM meta_artists').all() as any[];
  const settingsRows = db.prepare('SELECT * FROM meta_settings').all() as any[];

  const albumMeta: Record<string, AlbumMeta> = {};
  for (const row of albums) {
    albumMeta[row.name] = { 
      ...(row.date ? { date: row.date } : {}), 
      ...(row.hideDate !== null ? { hideDate: Boolean(row.hideDate) } : {})
    };
  }

  const artistMeta: Record<string, ArtistMeta> = {};
  for (const row of artists) {
    artistMeta[row.name] = { 
      ...(row.snsId ? { id: row.snsId } : {}), 
      ...(row.hideId !== null ? { hideId: Boolean(row.hideId) } : {}) 
    };
  }

  const settings: MetadataSettings = { showAutoAlbumDate: false, announcements: [] };
  for (const row of settingsRows) {
    if (row.key === 'showAutoAlbumDate') settings.showAutoAlbumDate = row.value === 'true';
    if (row.key === 'announcements') {
      try {
        settings.announcements = JSON.parse(row.value);
      } catch (e) {
        settings.announcements = [];
      }
    }
  }

  runtimeMetadata = { albumMeta, artistMeta, settings };
  return runtimeMetadata;
};

export const updateMetadata = async (data: Partial<Metadata>): Promise<Metadata> => {
  const db = getDB();
  const current = await getMetadata();
  
  const transaction = db.transaction(() => {
    if (data.albumMeta) {
      current.albumMeta = data.albumMeta;
      db.prepare('DELETE FROM meta_albums').run();
      const stmt = db.prepare('INSERT INTO meta_albums (name, date, hideDate) VALUES (?, ?, ?)');
      for (const [name, meta] of Object.entries(data.albumMeta)) {
        stmt.run(name, meta.date || '', meta.hideDate ? 1 : 0);
      }
    }

    if (data.artistMeta) {
      current.artistMeta = data.artistMeta;
      db.prepare('DELETE FROM meta_artists').run();
      const stmt = db.prepare('INSERT INTO meta_artists (name, snsId, hideId) VALUES (?, ?, ?)');
      for (const [name, meta] of Object.entries(data.artistMeta)) {
        stmt.run(name, meta.id || '', meta.hideId ? 1 : 0);
      }
    }

    if (data.settings) {
      current.settings = { ...current.settings, ...data.settings };
      const stmt = db.prepare('INSERT OR REPLACE INTO meta_settings (key, value) VALUES (?, ?)');
      stmt.run('showAutoAlbumDate', current.settings.showAutoAlbumDate ? 'true' : 'false');
      stmt.run('announcements', JSON.stringify(current.settings.announcements || []));
    }
  });

  transaction();
  
  runtimeMetadata = normalizeMetadata(current);
  return runtimeMetadata;
};
