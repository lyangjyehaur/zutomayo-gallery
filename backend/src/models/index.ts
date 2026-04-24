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
}, { tableName: 'mvs_v2', timestamps: false, comment: '儲存 MV 核心資訊' });

export const ImageModel = sequelize.define('Image', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, comment: '圖片唯一識別碼' },
  type: { type: DataTypes.STRING, comment: '圖片類型 (cover, official, fanart)' },
  url: { type: DataTypes.STRING, comment: '系統內實際使用的網址 (R2)' },
  original_url: { type: DataTypes.STRING, comment: '圖片的原始來源網址 (唯一鍵)' },
  thumbnail_url: { type: DataTypes.STRING, comment: '縮圖網址' },
  width: { type: DataTypes.INTEGER, comment: '圖片寬度' },
  height: { type: DataTypes.INTEGER, comment: '圖片高度' },
  caption: { type: DataTypes.TEXT, comment: '圖片描述或圖說' },
  group_id: { type: DataTypes.STRING, comment: '用於將多張圖片分組的識別碼' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, comment: '建立時間' },
}, { tableName: 'images', timestamps: false, comment: '儲存系統中所有的圖片資源' });

export const ArtistModel = sequelize.define('Artist', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, comment: '畫師唯一識別碼' },
  name: { type: DataTypes.STRING, comment: '畫師名稱' },
  sns_id: { type: DataTypes.STRING, comment: '社群帳號 ID' },
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
  release_date: { type: DataTypes.DATE, comment: '發行日期' },
  cover_image_url: { type: DataTypes.STRING, comment: '專輯封面圖' },
  hide_date: { type: DataTypes.BOOLEAN, comment: '是否隱藏日期' },
}, { tableName: 'albums', timestamps: false, comment: '儲存 MV 收錄的實體或數位專輯資訊' });

export const KeywordModel = sequelize.define('Keyword', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, comment: '關鍵字唯一識別碼' },
  name: { type: DataTypes.STRING, comment: '關鍵字內容' },
}, { 
  tableName: 'keywords', 
  timestamps: false, 
  comment: '儲存用於搜尋與分類的標籤',
  indexes: [{ unique: true, fields: ['name'] }]
});

// ==========================================
// Metadata & Extensions
// ==========================================

export const FanartMetadataModel = sequelize.define('FanartMetadata', {
  image_id: { type: DataTypes.UUID, primaryKey: true, comment: '關聯至 images.id' },
  tweet_url: { type: DataTypes.STRING, comment: '推文網址' },
  tweet_text: { type: DataTypes.TEXT, comment: '推文內容' },
  tweet_author: { type: DataTypes.STRING, comment: '推文作者顯示名稱' },
  tweet_handle: { type: DataTypes.STRING, comment: '推文作者帳號' },
  tweet_date: { type: DataTypes.DATE, comment: '推文發布時間' },
  status: { type: DataTypes.STRING, defaultValue: 'unorganized', comment: '審核狀態 (pending, organized, rejected)' },
}, { tableName: 'fanart_metadata', timestamps: false, comment: '二創圖的社群平台擴展屬性' });

// ==========================================
// Many-to-Many Relationships
// ==========================================

export const MVImageModel = sequelize.define('MVImage', {
  mv_id: { type: DataTypes.STRING, primaryKey: true, comment: '關聯至 mvs_v2.id' },
  image_id: { type: DataTypes.UUID, primaryKey: true, comment: '關聯至 images.id' },
  usage: { type: DataTypes.STRING, comment: '圖片用途 (cover, gallery)' },
  order_index: { type: DataTypes.INTEGER, defaultValue: 0, comment: '顯示順序' },
}, { tableName: 'mv_images', timestamps: false, comment: '定義圖片在特定 MV 中的角色與排序' });

export const ArtistImageModel = sequelize.define('ArtistImage', {
  artist_id: { type: DataTypes.UUID, primaryKey: true, comment: '關聯至 artists.id' },
  image_id: { type: DataTypes.UUID, primaryKey: true, comment: '關聯至 images.id' },
}, { tableName: 'artist_images', timestamps: false, comment: '將特定圖片直接歸屬於特定畫師' });

export const MVArtistModel = sequelize.define('MVArtist', {
  mv_id: { type: DataTypes.STRING, primaryKey: true, comment: '關聯至 mvs_v2.id' },
  artist_id: { type: DataTypes.UUID, primaryKey: true, comment: '關聯至 artists.id' },
  role: { type: DataTypes.STRING, comment: '畫師在該 MV 中的職位 (如 Animator)' },
}, { tableName: 'mv_artists', timestamps: false, comment: 'MV 與畫師的關聯' });

export const MVAlbumModel = sequelize.define('MVAlbum', {
  mv_id: { type: DataTypes.STRING, primaryKey: true, comment: '關聯至 mvs_v2.id' },
  album_id: { type: DataTypes.UUID, primaryKey: true, comment: '關聯至 albums.id' },
  track_number: { type: DataTypes.INTEGER, comment: '歌曲在專輯中的音軌編號' },
}, { tableName: 'mv_albums', timestamps: false, comment: 'MV 與專輯的關聯' });

export const MVKeywordModel = sequelize.define('MVKeyword', {
  mv_id: { type: DataTypes.STRING, primaryKey: true, comment: '關聯至 mvs_v2.id' },
  keyword_id: { type: DataTypes.UUID, primaryKey: true, comment: '關聯至 keywords.id' },
}, { tableName: 'mv_keywords', timestamps: false, comment: 'MV 與關鍵字的關聯' });

// ==========================================
// Setup Associations
// ==========================================

// MV <-> Image
MVModel.belongsToMany(ImageModel, { through: MVImageModel, foreignKey: 'mv_id', otherKey: 'image_id', as: 'images' });
ImageModel.belongsToMany(MVModel, { through: MVImageModel, foreignKey: 'image_id', otherKey: 'mv_id', as: 'mvs' });

// Artist <-> Image
ArtistModel.belongsToMany(ImageModel, { through: ArtistImageModel, foreignKey: 'artist_id', otherKey: 'image_id', as: 'artworks' });
ImageModel.belongsToMany(ArtistModel, { through: ArtistImageModel, foreignKey: 'image_id', otherKey: 'artist_id', as: 'artists' });

// MV <-> Artist
MVModel.belongsToMany(ArtistModel, { through: MVArtistModel, foreignKey: 'mv_id', otherKey: 'artist_id', as: 'creators' });
ArtistModel.belongsToMany(MVModel, { through: MVArtistModel, foreignKey: 'artist_id', otherKey: 'mv_id', as: 'mvs' });

// MV <-> Album
MVModel.belongsToMany(AlbumModel, { through: MVAlbumModel, foreignKey: 'mv_id', otherKey: 'album_id', as: 'albums' });
AlbumModel.belongsToMany(MVModel, { through: MVAlbumModel, foreignKey: 'album_id', otherKey: 'mv_id', as: 'mvs' });

// MV <-> Keyword
MVModel.belongsToMany(KeywordModel, { through: MVKeywordModel, foreignKey: 'mv_id', otherKey: 'keyword_id', as: 'keywords' });
KeywordModel.belongsToMany(MVModel, { through: MVKeywordModel, foreignKey: 'keyword_id', otherKey: 'mv_id', as: 'mvs' });

// Image <-> FanartMetadata
ImageModel.hasOne(FanartMetadataModel, { foreignKey: 'image_id', as: 'fanart_meta' });
FanartMetadataModel.belongsTo(ImageModel, { foreignKey: 'image_id', as: 'image' });

export const syncModels = async () => {
  await sequelize.sync({ alter: true });
};