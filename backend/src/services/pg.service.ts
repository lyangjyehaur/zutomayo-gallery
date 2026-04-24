import { Sequelize, DataTypes } from 'sequelize';

// 從環境變數讀取資料庫連線資訊，若無則提供預設值 (給本地開發用)
const DB_HOST = process.env.DB_HOST || '45.147.26.57';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_NAME = process.env.DB_NAME || 'zutomayo_gallery';
const DB_USER = process.env.DB_USER || 'zutomayo_gallery';
const DB_PASS = process.env.DB_PASS || 'FBZNYC3HSJExdHX3';

// 連線到 PostgreSQL
export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false, // 關閉終端機的 SQL 語法輸出
  timezone: '+08:00',
});

// MV 主表
export const MV = sequelize.define('MV', {
  id: { type: DataTypes.STRING, primaryKey: true },
  title: DataTypes.STRING,
  artist: DataTypes.JSONB,
  year: DataTypes.STRING(4),
  date: DataTypes.DATE,
  youtube: DataTypes.STRING,
  bilibili: DataTypes.STRING,
  description: DataTypes.TEXT,
  album: DataTypes.JSONB,
  coverImages: DataTypes.JSONB,
  keywords: DataTypes.JSONB,
  images: DataTypes.JSONB,
}, { tableName: 'mvs', timestamps: false });

// 專輯中繼資料
export const MetaAlbum = sequelize.define('MetaAlbum', {
  name: { type: DataTypes.STRING, primaryKey: true, comment: '專輯名稱 (對應 albums.name)' },
  date: { type: DataTypes.STRING, comment: '發行日期' }, // 原本是字串，先保留相容性
  hideDate: { type: DataTypes.BOOLEAN, comment: '是否隱藏日期' },
}, { tableName: 'meta_albums', timestamps: false, comment: '專輯的舊版全域元資料表' });

// 藝術家中繼資料
export const MetaArtist = sequelize.define('MetaArtist', {
  name: { type: DataTypes.STRING, primaryKey: true, comment: '畫師名稱 (對應 artists.name)' },
  snsId: { type: DataTypes.STRING, comment: '社群帳號 ID (如 Twitter)' },
  hideId: { type: DataTypes.BOOLEAN, comment: '是否隱藏社群 ID' },
  displayName: { type: DataTypes.STRING, comment: '顯示名稱 (別名)' },
  profileUrl: { type: DataTypes.STRING, comment: '頭像網址' },
  bio: { type: DataTypes.TEXT, comment: '畫師簡介' },
  dataId: DataTypes.STRING,
  collaborations: { type: DataTypes.JSONB, comment: '合作過的畫師列表或相關資訊' },
  instagram: { type: DataTypes.STRING, comment: 'Instagram 帳號' },
  youtube: { type: DataTypes.STRING, comment: 'YouTube 頻道' },
  pixiv: { type: DataTypes.STRING, comment: 'Pixiv ID' },
  tiktok: { type: DataTypes.STRING, comment: 'TikTok 帳號' },
  website: { type: DataTypes.STRING, comment: '個人網站' },
}, { tableName: 'meta_artists', timestamps: false, comment: '畫師的舊版全域元資料表' });

// 系統設定
export const MetaSetting = sequelize.define('MetaSetting', {
  key: { type: DataTypes.STRING, primaryKey: true, comment: '設定鍵名' },
  value: { type: DataTypes.TEXT, comment: '設定內容 (JSON 字串)' },
}, { tableName: 'meta_settings', timestamps: false, comment: '系統全域設定表' });

// Auth 相關
export const AuthPasskey = sequelize.define('AuthPasskey', {
  id: { type: DataTypes.STRING, primaryKey: true },
  publicKey: DataTypes.TEXT,
  counter: DataTypes.INTEGER,
  transports: DataTypes.JSONB,
  name: DataTypes.STRING,
  createdAt: DataTypes.DATE,
}, { tableName: 'auth_passkeys', timestamps: false });

export const AuthSetting = sequelize.define('AuthSetting', {
  key: { type: DataTypes.STRING, primaryKey: true },
  value: DataTypes.TEXT,
}, { tableName: 'auth_settings', timestamps: false });

// Fanarts (Twitter)
export const Fanart = sequelize.define('Fanart', {
  id: { type: DataTypes.STRING, primaryKey: true },
  tweetUrl: { type: DataTypes.STRING, unique: true },
  tweetText: DataTypes.TEXT,
  tweetAuthor: DataTypes.STRING,
  tweetHandle: DataTypes.STRING,
  tweetDate: DataTypes.DATE,
  media: DataTypes.JSONB,
  status: { type: DataTypes.STRING, defaultValue: 'unorganized' },
  createdAt: DataTypes.DATE,
}, { 
  tableName: 'fanarts', 
  timestamps: false,
  indexes: [
    { fields: ['status'] },
    { fields: ['tweetDate'] }
  ]
});
