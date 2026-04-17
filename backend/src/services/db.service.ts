import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../../data');
const dbPath = path.join(dataDir, 'database.sqlite');

// 確保 data 目錄存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export const initDB = async () => {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS mvs (
      id TEXT PRIMARY KEY,
      title TEXT,
      artist TEXT,
      year TEXT,
      date TEXT,
      youtube TEXT,
      bilibili TEXT,
      description TEXT,
      album TEXT,
      coverImages TEXT,
      keywords TEXT,
      images TEXT
    );

    CREATE TABLE IF NOT EXISTS meta_albums (
      name TEXT PRIMARY KEY,
      date TEXT,
      hideDate INTEGER
    );

    CREATE TABLE IF NOT EXISTS meta_artists (
      name TEXT PRIMARY KEY,
      snsId TEXT,
      hideId INTEGER
    );

    CREATE TABLE IF NOT EXISTS meta_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS auth_passkeys (
      id TEXT PRIMARY KEY,
      publicKey TEXT,
      counter INTEGER,
      transports TEXT,
      name TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS auth_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // 自動化檢查與新增 MVs 表的欄位
  const tableInfo = await dbInstance.all("PRAGMA table_info(mvs)");
  const existingColumns = tableInfo.map(col => col.name);
  const expectedColumns = [
    'id', 'title', 'artist', 'year', 'date', 'youtube', 'bilibili', 
    'description', 'album', 'coverImages', 'keywords', 'images'
  ];

  for (const col of expectedColumns) {
    if (!existingColumns.includes(col)) {
      console.log(`Auto-migrating: Adding missing column '${col}' to 'mvs' table...`);
      await dbInstance.exec(`ALTER TABLE mvs ADD COLUMN ${col} TEXT`);
    }
  }

  return dbInstance;
};

export const getDB = async () => {
  if (!dbInstance) return await initDB();
  return dbInstance;
};