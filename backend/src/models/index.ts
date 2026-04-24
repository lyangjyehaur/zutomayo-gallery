import { Sequelize, DataTypes, Model } from 'sequelize';

const DB_HOST = process.env.DB_HOST || '45.147.26.57';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_NAME = process.env.DB_NAME || 'zutomayo_gallery';
const DB_USER = process.env.DB_USER || 'zutomayo_gallery';
const DB_PASS = process.env.DB_PASS || 'FBZNYC3HSJExdHX3';

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
  id: { type: DataTypes.STRING, primaryKey: true },
  title: DataTypes.STRING,
  year: DataTypes.STRING(4),
  date: DataTypes.DATE,
  youtube: DataTypes.STRING,
  bilibili: DataTypes.STRING,
  description: DataTypes.TEXT,
}, { tableName: 'mvs_v2', timestamps: false });

export const ImageModel = sequelize.define('Image', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  type: DataTypes.STRING, // 'cover', 'official', 'fanart', 'screenshot'
  url: DataTypes.STRING,
  original_url: DataTypes.STRING,
  thumbnail_url: DataTypes.STRING,
  width: DataTypes.INTEGER,
  height: DataTypes.INTEGER,
  caption: DataTypes.TEXT,
  group_id: DataTypes.STRING,
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'images', timestamps: false });

export const ArtistModel = sequelize.define('Artist', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: DataTypes.STRING,
  sns_id: DataTypes.STRING,
  profile_url: DataTypes.STRING,
  bio: DataTypes.TEXT,
  instagram: DataTypes.STRING,
  youtube: DataTypes.STRING,
  pixiv: DataTypes.STRING,
  tiktok: DataTypes.STRING,
  website: DataTypes.STRING,
}, { tableName: 'artists', timestamps: false });

export const AlbumModel = sequelize.define('Album', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: DataTypes.STRING,
  release_date: DataTypes.DATE,
  cover_image_url: DataTypes.STRING,
  hide_date: DataTypes.BOOLEAN,
}, { tableName: 'albums', timestamps: false });

export const KeywordModel = sequelize.define('Keyword', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING, unique: true },
}, { tableName: 'keywords', timestamps: false });

// ==========================================
// Metadata & Extensions
// ==========================================

export const FanartMetadataModel = sequelize.define('FanartMetadata', {
  image_id: { type: DataTypes.UUID, primaryKey: true },
  tweet_url: DataTypes.STRING,
  tweet_text: DataTypes.TEXT,
  tweet_author: DataTypes.STRING,
  tweet_handle: DataTypes.STRING,
  tweet_date: DataTypes.DATE,
  status: { type: DataTypes.STRING, defaultValue: 'unorganized' },
}, { tableName: 'fanart_metadata', timestamps: false });

// ==========================================
// Many-to-Many Relationships
// ==========================================

export const MVImageModel = sequelize.define('MVImage', {
  mv_id: { type: DataTypes.STRING, primaryKey: true },
  image_id: { type: DataTypes.UUID, primaryKey: true },
  usage: DataTypes.STRING, // 'cover', 'gallery'
  order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'mv_images', timestamps: false });

export const ArtistImageModel = sequelize.define('ArtistImage', {
  artist_id: { type: DataTypes.UUID, primaryKey: true },
  image_id: { type: DataTypes.UUID, primaryKey: true },
}, { tableName: 'artist_images', timestamps: false });

export const MVArtistModel = sequelize.define('MVArtist', {
  mv_id: { type: DataTypes.STRING, primaryKey: true },
  artist_id: { type: DataTypes.UUID, primaryKey: true },
  role: DataTypes.STRING,
}, { tableName: 'mv_artists', timestamps: false });

export const MVAlbumModel = sequelize.define('MVAlbum', {
  mv_id: { type: DataTypes.STRING, primaryKey: true },
  album_id: { type: DataTypes.UUID, primaryKey: true },
  track_number: DataTypes.INTEGER,
}, { tableName: 'mv_albums', timestamps: false });

export const MVKeywordModel = sequelize.define('MVKeyword', {
  mv_id: { type: DataTypes.STRING, primaryKey: true },
  keyword_id: { type: DataTypes.UUID, primaryKey: true },
}, { tableName: 'mv_keywords', timestamps: false });

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