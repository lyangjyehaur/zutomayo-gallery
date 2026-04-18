import { Request, Response, NextFunction } from 'express';
import { getDB } from '../services/db.service.js';
import fs from 'fs';
import path from 'path';

// 取得編譯時間的變數 (只在伺服器啟動時讀取一次)
let buildTime: string | null = null;
try {
  // index.js 位於 dist/ 目錄下，所以取它的修改時間作為編譯時間
  const indexFilePath = path.join(process.cwd(), 'dist', 'index.js');
  if (fs.existsSync(indexFilePath)) {
    const stats = fs.statSync(indexFilePath);
    buildTime = stats.mtime.toISOString();
  }
} catch (err) {
  console.warn('Unable to determine backend build time', err);
}

export const getSystemStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDB();
    const row = db.prepare('SELECT value FROM meta_settings WHERE key = ?').get('maintenance_mode') as any;
    // 預設為 true (站點初始化時默認開啟維護模式)
    const maintenance = row ? row.value === 'true' : true;
    
    const typeRow = db.prepare('SELECT value FROM meta_settings WHERE key = ?').get('maintenance_type') as any;
    // 預設為 'ui' (介面升級)
    const type = typeRow ? typeRow.value : 'ui';

    const etaRow = db.prepare('SELECT value FROM meta_settings WHERE key = ?').get('maintenance_eta') as any;
    const eta = etaRow ? etaRow.value : null;

    res.json({ success: true, data: { maintenance, type, eta, buildTime } });
  } catch (error) {
    next(error);
  }
};

export const toggleMaintenance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { maintenance, type, eta } = req.body;
    if (typeof maintenance !== 'boolean') {
      res.status(400).json({ success: false, error: 'Maintenance flag must be a boolean' });
      return;
    }
    if (type && type !== 'data' && type !== 'ui') {
      res.status(400).json({ success: false, error: 'Invalid maintenance type' });
      return;
    }

    const db = getDB();
    
    const transaction = db.transaction(() => {
      db.prepare(
        'INSERT INTO meta_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      ).run('maintenance_mode', maintenance ? 'true' : 'false');

      if (type) {
        db.prepare(
          'INSERT INTO meta_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
        ).run('maintenance_type', type);
      }

      if (eta !== undefined) {
        db.prepare(
          'INSERT INTO meta_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
        ).run('maintenance_eta', eta ? String(eta) : '');
      }
    });

    transaction();

    res.json({ success: true, data: { maintenance, type, eta } });
  } catch (error) {
    next(error);
  }
};
