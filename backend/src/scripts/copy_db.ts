import { Sequelize, DataTypes } from 'sequelize';

const OLD_DB_HOST = '127.0.0.1';
const OLD_DB_PORT = 5432;
const OLD_DB_NAME = 'zutomayo_gallery';
const OLD_DB_USER = 'zutomayo_gallery';
const OLD_DB_PASS = 'FBZNYC3HSJExdHX3';

const NEW_DB_HOST = '127.0.0.1';
const NEW_DB_PORT = 5432;
const NEW_DB_NAME = 'zutomayo_gallery_test';
const NEW_DB_USER = 'zutomayo_gallery';
const NEW_DB_PASS = 'FBZNYC3HSJExdHX3';

const oldDb = new Sequelize(OLD_DB_NAME, OLD_DB_USER, OLD_DB_PASS, {
  host: OLD_DB_HOST,
  port: OLD_DB_PORT,
  dialect: 'postgres',
  logging: false,
});

const newDb = new Sequelize(NEW_DB_NAME, NEW_DB_USER, NEW_DB_PASS, {
  host: NEW_DB_HOST,
  port: NEW_DB_PORT,
  dialect: 'postgres',
  logging: false,
});

// Define Models for Old DB
const OldMV = oldDb.define('MV', {
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

const OldMetaAlbum = oldDb.define('MetaAlbum', {
  name: { type: DataTypes.STRING, primaryKey: true },
  date: DataTypes.STRING,
  hideDate: DataTypes.BOOLEAN,
}, { tableName: 'meta_albums', timestamps: false });

const OldMetaArtist = oldDb.define('MetaArtist', {
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

const OldMetaSetting = oldDb.define('MetaSetting', {
  key: { type: DataTypes.STRING, primaryKey: true },
  value: DataTypes.TEXT,
}, { tableName: 'meta_settings', timestamps: false });

const OldAuthPasskey = oldDb.define('AuthPasskey', {
  id: { type: DataTypes.STRING, primaryKey: true },
  publicKey: DataTypes.TEXT,
  counter: DataTypes.INTEGER,
  transports: DataTypes.JSONB,
  name: DataTypes.STRING,
  createdAt: DataTypes.DATE,
}, { tableName: 'auth_passkeys', timestamps: false });

const OldAuthSetting = oldDb.define('AuthSetting', {
  key: { type: DataTypes.STRING, primaryKey: true },
  value: DataTypes.TEXT,
}, { tableName: 'auth_settings', timestamps: false });

const OldFanart = oldDb.define('Fanart', {
  id: { type: DataTypes.STRING, primaryKey: true },
  tweetUrl: { type: DataTypes.STRING, unique: true },
  tweetText: DataTypes.TEXT,
  tweetAuthor: DataTypes.STRING,
  tweetHandle: DataTypes.STRING,
  tweetDate: DataTypes.DATE,
  media: DataTypes.JSONB,
  status: { type: DataTypes.STRING, defaultValue: 'unorganized' },
  createdAt: DataTypes.DATE,
}, { tableName: 'fanarts', timestamps: false });

// Define Models for New DB
const NewMV = newDb.define('MV', OldMV.getAttributes(), { tableName: 'mvs', timestamps: false });
const NewMetaAlbum = newDb.define('MetaAlbum', OldMetaAlbum.getAttributes(), { tableName: 'meta_albums', timestamps: false });
const NewMetaArtist = newDb.define('MetaArtist', OldMetaArtist.getAttributes(), { tableName: 'meta_artists', timestamps: false });
const NewMetaSetting = newDb.define('MetaSetting', OldMetaSetting.getAttributes(), { tableName: 'meta_settings', timestamps: false });
const NewAuthPasskey = newDb.define('AuthPasskey', OldAuthPasskey.getAttributes(), { tableName: 'auth_passkeys', timestamps: false });
const NewAuthSetting = newDb.define('AuthSetting', OldAuthSetting.getAttributes(), { tableName: 'auth_settings', timestamps: false });
const NewFanart = newDb.define('Fanart', OldFanart.getAttributes(), { tableName: 'fanarts', timestamps: false });

async function copyData() {
  try {
    await oldDb.authenticate();
    console.log('Connected to old DB');
    await newDb.authenticate();
    console.log('Connected to new test DB');

    // Create new DB tables only if they don't exist
    await newDb.sync();
    console.log('New DB schema synced');

    const models = [
      { oldModel: OldMV, newModel: NewMV, name: 'mvs' },
      { oldModel: OldMetaAlbum, newModel: NewMetaAlbum, name: 'meta_albums' },
      { oldModel: OldMetaArtist, newModel: NewMetaArtist, name: 'meta_artists' },
      { oldModel: OldMetaSetting, newModel: NewMetaSetting, name: 'meta_settings' },
      { oldModel: OldAuthPasskey, newModel: NewAuthPasskey, name: 'auth_passkeys' },
      { oldModel: OldAuthSetting, newModel: NewAuthSetting, name: 'auth_settings' },
      { oldModel: OldFanart, newModel: NewFanart, name: 'fanarts' },
    ];

    for (const { oldModel, newModel, name } of models) {
      console.log(`Copying table: ${name}...`);
      const records = await oldModel.findAll({ raw: true });
      if (records.length > 0) {
        // Bulk insert records
        await newModel.bulkCreate(records as any[]);
        console.log(`✅ Copied ${records.length} records into ${name}`);
      } else {
        console.log(`⚠️ No records found in ${name}`);
      }
    }

    console.log('Database copy completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to copy database:', err);
    process.exit(1);
  }
}

copyData();