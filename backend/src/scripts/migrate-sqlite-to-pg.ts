import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { 
  sequelize, MV, MetaAlbum, MetaArtist, MetaSetting, 
  AuthPasskey, AuthSetting, Fanart 
} from '../services/pg.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data/database.sqlite');

if (!fs.existsSync(dbPath)) {
  console.error('❌ 找不到 SQLite 資料庫:', dbPath);
  process.exit(1);
}

const sqlite = new Database(dbPath);

const safeParseJSON = (str: any) => {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
};

const safeDate = (dateStr: any) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const safeBoolean = (val: any) => {
  if (val === null || val === undefined) return null;
  return val == 1 || val === 'true' || val === true;
};

async function migrate() {
  try {
    console.log('🔄 正在連線到 PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ 連線成功！');

    console.log('🔄 正在同步資料表結構...');
    await sequelize.sync({ force: true }); // 這會刪除舊表並重建
    console.log('✅ 資料表結構重建完成！');

    // 1. 遷移 MVs
    const mvs = sqlite.prepare('SELECT * FROM mvs').all();
    const mvData = mvs.map((m: any) => ({
      ...m,
      date: safeDate(m.date),
      coverImages: safeParseJSON(m.coverImages),
      keywords: safeParseJSON(m.keywords),
      images: safeParseJSON(m.images),
    }));
    await MV.bulkCreate(mvData);
    console.log(`✅ 成功遷移 ${mvs.length} 筆 MVs`);

    // 2. 遷移 MetaAlbums
    const albums = sqlite.prepare('SELECT * FROM meta_albums').all();
    const albumData = albums.map((a: any) => ({
      ...a,
      hideDate: safeBoolean(a.hideDate)
    }));
    await MetaAlbum.bulkCreate(albumData);
    console.log(`✅ 成功遷移 ${albums.length} 筆 Albums`);

    // 3. 遷移 MetaArtists
    const artists = sqlite.prepare('SELECT * FROM meta_artists').all();
    const artistData = artists.map((a: any) => ({
      ...a,
      hideId: safeBoolean(a.hideId),
      collaborations: safeParseJSON(a.collaborations)
    }));
    await MetaArtist.bulkCreate(artistData);
    console.log(`✅ 成功遷移 ${artists.length} 筆 Artists`);

    // 4. 遷移 Settings
    const settings = sqlite.prepare('SELECT * FROM meta_settings').all() as any[];
    await MetaSetting.bulkCreate(settings);
    console.log(`✅ 成功遷移 ${settings.length} 筆 Settings`);

    // 5. 遷移 Auth
    const passkeys = sqlite.prepare('SELECT * FROM auth_passkeys').all() as any[];
    const pkData = passkeys.map((p: any) => ({
      ...p,
      transports: safeParseJSON(p.transports),
      createdAt: safeDate(p.createdAt)
    }));
    await AuthPasskey.bulkCreate(pkData);
    console.log(`✅ 成功遷移 ${passkeys.length} 筆 Passkeys`);

    const authSettings = sqlite.prepare('SELECT * FROM auth_settings').all() as any[];
    await AuthSetting.bulkCreate(authSettings);
    console.log(`✅ 成功遷移 ${authSettings.length} 筆 AuthSettings`);

    // 6. 遷移 Fanarts
    const fanarts = sqlite.prepare('SELECT * FROM fanarts').all();
    const fanartData = fanarts.map((f: any) => ({
      ...f,
      tweetDate: safeDate(f.tweetDate),
      createdAt: safeDate(f.createdAt),
      media: safeParseJSON(f.media)
    }));
    await Fanart.bulkCreate(fanartData);
    console.log(`✅ 成功遷移 ${fanarts.length} 筆 Fanarts`);

    console.log('🎉 全部遷移完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    process.exit(1);
  }
}

migrate();
