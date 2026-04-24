import { Sequelize, DataTypes, Model } from 'sequelize';

const DB_HOST = process.env.DB_HOST || '45.147.26.57';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_NAME = process.env.DB_NAME || 'zutomayo_gallery_test';
const DB_USER = process.env.DB_USER || 'zutomayo_gallery_test';
const DB_PASS = process.env.DB_PASS || 'XCFHbZQyn33KeY66';

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false,
  timezone: '+08:00',
});

// ==========================================
// Core Entities
// ==========================================

export const MVModel = sequelize.define('MV', {
  id: { type: DataTypes.STRING, primaryKey: true, comment: 'MV 唯一識別碼 (slug)' },
  title: { type: DataTypes.STRING, comment: 'MV 標題' },
  year: { type: DataTypes.STRING(4), comment: '發布年份' },
  date: { type: DataTypes.DATE, comment: '發布日期' },
  youtube: { type: DataTypes.STRING, comment: 'YouTube 影片 ID' },
  bilibili: { type: DataTypes.STRING, comment: 'Bilibili BV 號' },
  description: { type: DataTypes.TEXT, comment: '影片說明或備註' },
}, { tableName: 'mvs', timestamps: false, comment: '儲存 MV 核心資訊' });

export const MediaModel = sequelize.define('Media', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, comment: '媒體唯一識別碼' },
  type: { type: DataTypes.STRING, comment: '媒體分類 (cover, official, fanart)' },
  media_type: { type: DataTypes.STRING, defaultValue: 'image', comment: '媒體格式類型 (image, video, gif)' },
  url: { type: DataTypes.STRING, comment: '系統內實際使用的網址 (R2)' },
  original_url: { type: DataTypes.STRING, comment: '媒體的原始來源網址 (唯一鍵)' },
  thumbnail_url: { type: DataTypes.STRING, comment: '縮圖網址' },
  width: { type: DataTypes.INTEGER, comment: '媒體寬度' },
  height: { type: DataTypes.INTEGER, comment: '媒體高度' },
  caption: { type: DataTypes.TEXT, comment: '媒體描述或圖說' },
  group_id: { type: DataTypes.UUID, comment: '關聯至 media_groups.id' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, comment: '建立時間' },
}, { tableName: 'media', timestamps: false, comment: '儲存系統中所有的媒體資源 (圖片、影片、GIF)' });

export const ArtistModel = sequelize.define('Artist', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, comment: '畫師唯一識別碼' },
  name: { type: DataTypes.STRING, comment: '畫師名稱' },
  twitter: { type: DataTypes.STRING, comment: '推特用戶名 (不含 @)' },
  profile_url: { type: DataTypes.STRING, comment: '頭像網址' },
  bio: { type: DataTypes.TEXT, comment: '畫師簡介' },
  instagram: { type: DataTypes.STRING, comment: 'Instagram 帳號' },
  youtube: { type: DataTypes.STRING, comment: 'YouTube 頻道' },
  pixiv: { type: DataTypes.STRING, comment: 'Pixiv ID' },
  tiktok: { type: DataTypes.STRING, comment: 'TikTok 帳號' },
  website: { type: DataTypes.STRING, comment: '個人網站' },
}, { tableName: 'artists', timestamps: false, comment: '儲存參與 MV 製作或繪製二創圖的創作者資訊' });

export const AlbumModel = sequelize.define('Album', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, comment: '專輯唯一識別碼' },
  name: { type: DataTypes.STRING, comment: '專輯名稱' },
  type: { type: DataTypes.STRING, comment: '專輯類別 (參考 sys_dictionaries: album_type)' },
  release_date: { type: DataTypes.DATE, comment: '發行日期' },
  cover_image_url: { type: DataTypes.STRING, comment: '專輯封面圖' },
  hide_date: { type: DataTypes.BOOLEAN, comment: '是否隱藏日期' },
}, { tableName: 'albums', timestamps: false, comment: '儲存 MV 收錄的實體或數位專輯資訊' });

export const KeywordModel = sequelize.define('Keyword', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, comment: '關鍵字唯一識別碼' },
  name: { type: DataTypes.STRING, comment: '關鍵字內容' },
  lang: { type: DataTypes.STRING, defaultValue: 'zh-Hant', comment: '關鍵字所屬語言 (如 zh-Hant, ja, en)' },
}, { 
  tableName: 'keywords', 
  timestamps: false, 
  comment: '儲存用於搜尋與分類的標籤 (多對多關聯以避免重複及實現全域標籤雲)',
  indexes: [{ unique: true, fields: ['name', 'lang'] }]
});

// ==========================================
// Metadata & Extensions
// ==========================================

export const MediaGroupModel = sequelize.define('MediaGroup', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, comment: '分組唯一識別碼' },
  title: { type: DataTypes.STRING, comment: '分組標題 (可選)' },
  source_url: { type: DataTypes.STRING, comment: '來源網址 (如原始推文連結)' },
  source_text: { type: DataTypes.TEXT, comment: '來源內容 (如推文內文)' },
  author_name: { type: DataTypes.STRING, comment: '來源作者顯示名稱' },
  author_handle: { type: DataTypes.STRING, comment: '來源作者帳號 (如 @username)' },
  post_date: { type: DataTypes.DATE, comment: '發布時間' },
  status: { type: DataTypes.STRING, defaultValue: 'pending', comment: '審核狀態 (參考 sys_dictionaries: fanart_status)' },
}, { tableName: 'media_groups', timestamps: false, comment: '媒體分組資訊 (共用來源詮釋資料，如推文)' });

export const SysDictionaryModel = sequelize.define('SysDictionary', {
  id: { type: DataTypes.STRING(20), primaryKey: true, comment: '字典唯一識別碼 (簡短 ID，如 NanoID 或自訂代碼)' },
  category: { type: DataTypes.STRING, comment: '字典分類 (如 album_type, image_type)' },
  code: { type: DataTypes.STRING, comment: '代碼值 (如 full, fanart)' },
  label: { type: DataTypes.STRING, comment: '顯示名稱 (如 完整專輯, 二創圖)' },
  description: { type: DataTypes.TEXT, comment: '詳細說明' },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0, comment: '排序權重' },
}, { 
  tableName: 'sys_dictionaries', 
  timestamps: false, 
  comment: '全局字典表，存放不同表的 type 或 status 代表的意思',
  indexes: [{ unique: true, fields: ['category', 'code'] }]
});

export const SysConfigModel = sequelize.define('SysConfig', {
  key: { type: DataTypes.STRING, primaryKey: true, comment: '配置鍵名' },
  value: { type: DataTypes.JSONB, comment: '配置內容 (JSON 格式)' },
  description: { type: DataTypes.TEXT, comment: '配置說明' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, comment: '最後更新時間' },
}, { tableName: 'sys_configs', timestamps: false, comment: '全局配置表，系統所有的全局配置皆存於此' });

export const SysAnnouncementModel = sequelize.define('SysAnnouncement', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, comment: '公告唯一識別碼' },
  content: { type: DataTypes.TEXT, comment: '公告內容 (支援 Markdown 或純文字)' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true, comment: '是否啟用/顯示' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, comment: '建立時間' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, comment: '最後更新時間' },
}, { tableName: 'sys_announcements', timestamps: false, comment: '首頁公告表 (獨立於系統配置)' });

// ==========================================
// Many-to-Many Relationships
// ==========================================

export const MVMediaModel = sequelize.define('MVMedia', {
  mv_id: { type: DataTypes.STRING, primaryKey: true, comment: '關聯至 mvs.id' },
  media_id: { type: DataTypes.UUID, primaryKey: true, comment: '關聯至 media.id' },
  usage: { type: DataTypes.STRING, comment: '媒體用途 (cover, gallery)' },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0, comment: '顯示順序' },
}, { tableName: 'mv_media', timestamps: false, comment: '定義媒體在特定 MV 中的角色與排序' });

export const ArtistMediaModel = sequelize.define('ArtistMedia', {
  artist_id: { type: DataTypes.UUID, primaryKey: true, comment: '關聯至 artists.id' },
  media_id: { type: DataTypes.UUID, primaryKey: true, comment: '關聯至 media.id' },
}, { tableName: 'artist_media', timestamps: false, comment: '將特定媒體直接歸屬於特定畫師' });

export const MVArtistModel = sequelize.define('MVArtist', {
  mv_id: { type: DataTypes.STRING, primaryKey: true, comment: '關聯至 mvs.id' },
  artist_id: { type: DataTypes.UUID, primaryKey: true, comment: '關聯至 artists.id' },
  role: { type: DataTypes.STRING, comment: '畫師在該 MV 中的職位 (如 Animator)' },
}, { tableName: 'mv_artists', timestamps: false, comment: 'MV 與畫師的關聯' });

export const MVAlbumModel = sequelize.define('MVAlbum', {
  mv_id: { type: DataTypes.STRING, primaryKey: true, comment: '關聯至 mvs.id' },
  album_id: { type: DataTypes.UUID, primaryKey: true, comment: '關聯至 albums.id' },
  track_number: { type: DataTypes.INTEGER, comment: '歌曲在專輯中的音軌編號' },
}, { tableName: 'mv_albums', timestamps: false, comment: 'MV 與專輯的關聯' });

export const MVKeywordModel = sequelize.define('MVKeyword', {
  mv_id: { type: DataTypes.STRING, primaryKey: true, comment: '關聯至 mvs.id' },
  keyword_id: { type: DataTypes.UUID, primaryKey: true, comment: '關聯至 keywords.id' },
}, { tableName: 'mv_keywords', timestamps: false, comment: 'MV 與關鍵字的關聯' });

// ==========================================
// Setup Associations
// ==========================================

// MV <-> Media
MVModel.belongsToMany(MediaModel, { through: MVMediaModel, foreignKey: 'mv_id', otherKey: 'media_id', as: 'images' }); // Keep 'images' alias for frontend compatibility
MediaModel.belongsToMany(MVModel, { through: MVMediaModel, foreignKey: 'media_id', otherKey: 'mv_id', as: 'mvs' });

// Artist <-> Media
ArtistModel.belongsToMany(MediaModel, { through: ArtistMediaModel, foreignKey: 'artist_id', otherKey: 'media_id', as: 'artworks' });
MediaModel.belongsToMany(ArtistModel, { through: ArtistMediaModel, foreignKey: 'media_id', otherKey: 'artist_id', as: 'artists' });

// MV <-> Artist
MVModel.belongsToMany(ArtistModel, { through: MVArtistModel, foreignKey: 'mv_id', otherKey: 'artist_id', as: 'creators' });
ArtistModel.belongsToMany(MVModel, { through: MVArtistModel, foreignKey: 'artist_id', otherKey: 'mv_id', as: 'mvs' });

// MV <-> Album
MVModel.belongsToMany(AlbumModel, { through: MVAlbumModel, foreignKey: 'mv_id', otherKey: 'album_id', as: 'albums' });
AlbumModel.belongsToMany(MVModel, { through: MVAlbumModel, foreignKey: 'album_id', otherKey: 'mv_id', as: 'mvs' });

// MV <-> Keyword
MVModel.belongsToMany(KeywordModel, { through: MVKeywordModel, foreignKey: 'mv_id', otherKey: 'keyword_id', as: 'keywords' });
KeywordModel.belongsToMany(MVModel, { through: MVKeywordModel, foreignKey: 'keyword_id', otherKey: 'mv_id', as: 'mvs' });

// Media <-> MediaGroup
MediaGroupModel.hasMany(MediaModel, { foreignKey: 'group_id', as: 'images' }); // Keep alias 'images' for frontend compatibility
MediaModel.belongsTo(MediaGroupModel, { foreignKey: 'group_id', as: 'group' });

export const syncModels = async () => {
  await sequelize.sync({ alter: true });
};