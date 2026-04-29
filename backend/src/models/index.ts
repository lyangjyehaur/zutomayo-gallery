import { DataTypes, Model } from 'sequelize';
import { nanoid } from 'nanoid';
import { sequelize } from '../services/pg.service.js';

// 自定義 16 碼短 ID 生成器 (兼具高安全性與短字元優勢)
const generateShortId = () => nanoid(16);

export { sequelize };

// ==========================================
// Core Entities
// ⚠️ 警告：每次修改此檔案中的任何表結構 (新增/修改/刪除欄位或表)，
// 都必須同步更新對應的資料庫文件 (例如 docs/DB_SCHEMA.md 或相關的說明文檔)！
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
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: generateShortId, comment: '媒體唯一識別碼' },
  type: { type: DataTypes.STRING, comment: '媒體分類 (cover, official, fanart)' },
  media_type: { type: DataTypes.STRING, defaultValue: 'image', comment: '媒體格式類型 (image, video, gif)' },
  url: { type: DataTypes.STRING, comment: '系統內實際使用的網址 (R2)' },
  original_url: { type: DataTypes.STRING, comment: '媒體的原始來源網址 (唯一鍵)' },
  thumbnail_url: { type: DataTypes.STRING, comment: '縮圖網址' },
  width: { type: DataTypes.INTEGER, comment: '媒體寬度' },
  height: { type: DataTypes.INTEGER, comment: '媒體高度' },
  caption: { type: DataTypes.TEXT, comment: '媒體描述或圖說' },
  tags: { type: DataTypes.JSONB, defaultValue: [], comment: '媒體標籤 (JSONB Array)' },
  group_id: { type: DataTypes.STRING(36), comment: '關聯至 media_groups.id' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, comment: '建立時間' },
}, { tableName: 'media', timestamps: false, comment: '儲存系統中所有的媒體資源 (圖片、影片、GIF)' });

export const ArtistModel = sequelize.define('Artist', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: generateShortId, comment: '畫師唯一識別碼' },
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
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: generateShortId, comment: '專輯唯一識別碼' },
  name: { type: DataTypes.STRING, comment: '專輯名稱' },
  type: { type: DataTypes.STRING, comment: '專輯類別 (參考 sys_dictionaries: album_type)' },
  apple_music_album_id: { type: DataTypes.STRING(36), comment: '關聯至 apple_music_albums.id' },
  hide_date: { type: DataTypes.BOOLEAN, comment: '是否隱藏日期' },
}, { tableName: 'albums', timestamps: false, comment: '儲存 MV 收錄的實體或數位專輯資訊' });

export const KeywordModel = sequelize.define('Keyword', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: generateShortId, comment: '關鍵字唯一識別碼' },
  name: { type: DataTypes.STRING, comment: '關鍵字內容' },
  lang: { type: DataTypes.STRING, defaultValue: 'zh-Hant', comment: '關鍵字所屬語言 (如 zh-Hant, ja, en)' },
}, { 
  tableName: 'keywords', 
  timestamps: false, 
  comment: '儲存用於搜尋與分類的標籤 (多對多關聯以避免重複及實現全域標籤雲)',
  indexes: [{ unique: true, fields: ['name', 'lang'] }]
});

export const AppleMusicAlbumModel = sequelize.define('AppleMusicAlbum', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: generateShortId, comment: '唯一識別碼' },
  collection_id: { type: DataTypes.STRING, comment: 'Apple Music Collection ID' },
  album_name: { type: DataTypes.STRING, comment: '專輯名稱' },
  artist_name: { type: DataTypes.STRING, comment: '歌手名稱' },
  release_date: { type: DataTypes.DATE, comment: '發行日期' },
  track_count: { type: DataTypes.INTEGER, comment: '收錄曲目數量' },
  collection_type: { type: DataTypes.STRING, comment: '集合類型 (Album/Single/EP)' },
  genre: { type: DataTypes.STRING, comment: '音樂類型' },
  apple_region: { type: DataTypes.STRING, comment: '來源區域代碼' },
  source_url: { type: DataTypes.STRING, comment: 'Apple Music 原始高畫質圖片網址' },
  r2_url: { type: DataTypes.STRING, comment: 'R2 儲存桶中的圖片網址' },
  is_lossless: { type: DataTypes.BOOLEAN, defaultValue: false, comment: '是否為極致無損版本 (-999)' },
  is_hidden: { type: DataTypes.BOOLEAN, defaultValue: false, comment: '是否在時間軸中隱藏' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, comment: '建立時間' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, comment: '更新時間' }
}, { 
  tableName: 'apple_music_albums', 
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  comment: '儲存從 Apple Music 抓取的高清封面與專輯元資料',
  indexes: [{ unique: true, fields: ['collection_id'] }]
});

// ==========================================
// Metadata & Extensions
// ⚠️ 警告：每次修改此檔案中的任何表結構 (新增/修改/刪除欄位或表)，
// 都必須同步更新對應的資料庫文件 (例如 docs/DB_SCHEMA.md 或相關的說明文檔)！
// ==========================================

export const MediaGroupModel = sequelize.define('MediaGroup', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: generateShortId, comment: '分組唯一識別碼' },
  title: { type: DataTypes.STRING, comment: '分組標題 (可選)' },
  source_url: { type: DataTypes.STRING, comment: '來源網址 (如原始推文連結)' },
  source_text: { type: DataTypes.TEXT, comment: '來源內容 (如推文內文)' },
  author_name: { type: DataTypes.STRING, comment: '來源作者顯示名稱' },
  author_handle: { type: DataTypes.STRING, comment: '來源作者帳號 (如 @username)' },
  post_date: { type: DataTypes.DATE, comment: '發布時間' },
  status: { type: DataTypes.STRING, defaultValue: 'pending', comment: '審核狀態 (參考 sys_dictionaries: fanart_status)' },
  like_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '喜歡數' },
  retweet_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '轉推數' },
  view_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '觀看數' },
  hashtags: { type: DataTypes.JSONB, defaultValue: [], comment: '推文標籤' },
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
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: generateShortId, comment: '公告唯一識別碼' },
  content: { type: DataTypes.TEXT, comment: '公告內容 (支援 Markdown 或純文字)' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true, comment: '是否啟用/顯示' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, comment: '建立時間' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, comment: '最後更新時間' },
}, { tableName: 'sys_announcements', timestamps: false, comment: '首頁公告表 (獨立於系統配置)' });

export const GeoRawLogModel = sequelize.define('GeoRawLog', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: generateShortId },
  geo_session_id: { type: DataTypes.STRING(32) },
  ip: { type: DataTypes.STRING },
  country: { type: DataTypes.STRING },
  raw_country: { type: DataTypes.STRING },
  ip2region_raw: { type: DataTypes.TEXT },
  geoip_raw: { type: DataTypes.TEXT },
  maxmind_city_raw: { type: DataTypes.TEXT },
  maxmind_asn_raw: { type: DataTypes.TEXT },
  ip2region_sha256: { type: DataTypes.STRING(64) },
  geoip_sha256: { type: DataTypes.STRING(64) },
  maxmind_city_sha256: { type: DataTypes.STRING(64) },
  maxmind_asn_sha256: { type: DataTypes.STRING(64) },
  user_agent: { type: DataTypes.TEXT },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'geo_raw_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['geo_session_id'] },
    { fields: ['ip'] },
    { fields: ['geoip_sha256'] },
    { fields: ['maxmind_city_sha256'] },
    { fields: ['maxmind_asn_sha256'] },
    { fields: ['ip2region_sha256'] },
    { fields: ['created_at'] },
  ],
});

export const StagingFanartModel = sequelize.define('StagingFanart', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: generateShortId, comment: '暫存資料唯一識別碼' },
  tweet_id: { type: DataTypes.STRING, comment: '推文 ID' },
  original_url: { type: DataTypes.STRING, comment: '原始來源網址 (如推文連結)' },
  media_url: { type: DataTypes.STRING, comment: '原始媒體連結' },
  thumbnail_url: { type: DataTypes.STRING, allowNull: true, comment: '影片縮圖或預覽圖網址' },
  author_name: { type: DataTypes.STRING, allowNull: true, comment: '推主顯示名稱' },
  author_handle: { type: DataTypes.STRING, allowNull: true, comment: '推主帳號 (不含 @)' },
  r2_url: { type: DataTypes.STRING, allowNull: true, comment: 'R2 備份連結' },
  media_type: { type: DataTypes.STRING, comment: '媒體格式類型 (image/video)' },
  crawled_at: { type: DataTypes.DATE, comment: '爬取時間' },
  post_date: { type: DataTypes.DATE, comment: '發布時間' },
  source_text: { type: DataTypes.TEXT, comment: '來源內容' },
  status: { type: DataTypes.STRING, defaultValue: 'pending', comment: '處理狀態 (pending/approved/rejected)' },
  source: { type: DataTypes.STRING, comment: '資料來源 (crawler/rss)' },
  like_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '喜歡數' },
  retweet_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '轉推數' },
  view_count: { type: DataTypes.INTEGER, defaultValue: 0, comment: '觀看數' },
  media_width: { type: DataTypes.INTEGER, allowNull: true, comment: '媒體寬度' },
  media_height: { type: DataTypes.INTEGER, allowNull: true, comment: '媒體高度' },
  hashtags: { type: DataTypes.JSONB, defaultValue: [], comment: '推文標籤' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, comment: '建立時間' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, comment: '更新時間' },
}, { 
  tableName: 'staging_fanarts', 
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  comment: '暫存從 Twitter 等來源爬取的二創圖，等待後續處理或人工審核'
});

export const CrawlerStateModel = sequelize.define('CrawlerState', {
  username: { type: DataTypes.STRING, primaryKey: true, comment: '爬蟲目標用戶名' },
  pagination_token: { type: DataTypes.STRING, allowNull: true, comment: '分頁 Token，用於接續爬取' },
  last_crawled_month: { type: DataTypes.STRING, allowNull: true, comment: '上一次爬完的月份 (YYYY-MM)' },
  total_crawled: { type: DataTypes.INTEGER, defaultValue: 0, comment: '已爬取的總數量' },
  status: { type: DataTypes.STRING, defaultValue: 'idle', comment: '爬蟲狀態 (idle, crawling, processing, error)' },
  current_run_processed: { type: DataTypes.INTEGER, defaultValue: 0, comment: '當次執行已處理數量' },
  current_run_total: { type: DataTypes.INTEGER, defaultValue: 0, comment: '當次執行總數量' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, comment: '最後更新時間' },
}, { 
  tableName: 'crawler_states', 
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at',
  comment: '儲存爬蟲的進度狀態，避免重複爬取或中斷後可接續'
});

// ==========================================
// Many-to-Many Relationships
// ⚠️ 警告：每次修改此檔案中的任何表結構 (新增/修改/刪除欄位或表)，
// 都必須同步更新對應的資料庫文件 (例如 docs/DB_SCHEMA.md 或相關的說明文檔)！
// ==========================================

export const MVMediaModel = sequelize.define('MVMedia', {
  mv_id: { type: DataTypes.STRING, primaryKey: true, comment: '關聯至 mvs.id' },
  media_id: { type: DataTypes.STRING(36), primaryKey: true, comment: '關聯至 media.id' },
  usage: { type: DataTypes.STRING, comment: '媒體用途 (cover, gallery)' },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0, comment: '顯示順序' },
}, { tableName: 'mv_media', timestamps: false, comment: '定義媒體在特定 MV 中的角色與排序' });

export const ArtistMediaModel = sequelize.define('ArtistMedia', {
  artist_id: { type: DataTypes.STRING(36), primaryKey: true, comment: '關聯至 artists.id' },
  media_id: { type: DataTypes.STRING(36), primaryKey: true, comment: '關聯至 media.id' },
}, { tableName: 'artist_media', timestamps: false, comment: '將特定媒體直接歸屬於特定畫師' });

export const MVArtistModel = sequelize.define('MVArtist', {
  mv_id: { type: DataTypes.STRING, primaryKey: true, comment: '關聯至 mvs.id' },
  artist_id: { type: DataTypes.STRING(36), primaryKey: true, comment: '關聯至 artists.id' },
  role: { type: DataTypes.STRING, comment: '畫師在該 MV 中的職位 (如 Animator)' },
}, { tableName: 'mv_artists', timestamps: false, comment: 'MV 與畫師的關聯' });

export const MVAlbumModel = sequelize.define('MVAlbum', {
  mv_id: { type: DataTypes.STRING, primaryKey: true, comment: '關聯至 mvs.id' },
  album_id: { type: DataTypes.STRING(36), primaryKey: true, comment: '關聯至 albums.id' },
  track_number: { type: DataTypes.INTEGER, comment: '歌曲在專輯中的音軌編號' },
}, { tableName: 'mv_albums', timestamps: false, comment: 'MV 與專輯的關聯' });

export const MVKeywordModel = sequelize.define('MVKeyword', {
  mv_id: { type: DataTypes.STRING, primaryKey: true, comment: '關聯至 mvs.id' },
  keyword_id: { type: DataTypes.STRING(36), primaryKey: true, comment: '關聯至 keywords.id' },
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

// Album <-> AppleMusicAlbum
AlbumModel.belongsTo(AppleMusicAlbumModel, { foreignKey: 'apple_music_album_id', as: 'appleMusicAlbum' });
AppleMusicAlbumModel.hasMany(AlbumModel, { foreignKey: 'apple_music_album_id', as: 'albums' });

export const syncModels = async () => {
  await sequelize.sync({ alter: true });
};
