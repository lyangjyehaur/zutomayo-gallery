import { Sequelize, DataTypes, Model } from 'sequelize';

// 連線到 PostgreSQL
export const sequelize = new Sequelize('zutomayo_gallery', 'zutomayo_gallery', 'FBZNYC3HSJExdHX3', {
  host: 'postgresql',
  port: 5432,
  dialect: 'postgres',
  logging: false, // 關閉終端機的 SQL 語法輸出
  timezone: '+08:00',
});

// MV 主表
export const MV = sequelize.define('MV', {
  id: { type: DataTypes.STRING, primaryKey: true },
  title: DataTypes.STRING,
  artist: DataTypes.STRING,
  year: DataTypes.STRING(4),
  date: DataTypes.DATE,
  youtube: DataTypes.STRING,
  bilibili: DataTypes.STRING,
  description: DataTypes.TEXT,
  album: DataTypes.STRING,
  coverImages: DataTypes.JSONB,
  keywords: DataTypes.JSONB,
  images: DataTypes.JSONB,
}, { tableName: 'mvs', timestamps: false });

// 專輯中繼資料
export const MetaAlbum = sequelize.define('MetaAlbum', {
  name: { type: DataTypes.STRING, primaryKey: true },
  date: DataTypes.STRING, // 原本是字串，先保留相容性
  hideDate: DataTypes.BOOLEAN,
}, { tableName: 'meta_albums', timestamps: false });

// 藝術家中繼資料
export const MetaArtist = sequelize.define('MetaArtist', {
  name: { type: DataTypes.STRING, primaryKey: true },
  snsId: DataTypes.STRING,
  hideId: DataTypes.BOOLEAN,
  displayName: DataTypes.STRING,
  profileUrl: DataTypes.STRING,
  bio: DataTypes.TEXT,
  dataId: DataTypes.STRING,
  collaborations: DataTypes.JSONB,
  instagram: DataTypes.STRING,
  youtube: DataTypes.STRING,
  pixiv: DataTypes.STRING,
  tiktok: DataTypes.STRING,
  website: DataTypes.STRING,
}, { tableName: 'meta_artists', timestamps: false });

// 系統設定
export const MetaSetting = sequelize.define('MetaSetting', {
  key: { type: DataTypes.STRING, primaryKey: true },
  value: DataTypes.TEXT,
}, { tableName: 'meta_settings', timestamps: false });

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
