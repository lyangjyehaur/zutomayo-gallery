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

// 舊版 MetaAlbum 等表已移除，改由 V2 Models 接管


// Auth 相關
export const AuthPasskey = sequelize.define('AuthPasskey', {
  id: { type: DataTypes.STRING, primaryKey: true },
  user_id: DataTypes.STRING,
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
