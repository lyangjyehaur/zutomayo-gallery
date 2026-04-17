import { Request, Response, NextFunction } from 'express';
import { getDB } from '../services/db.service.js';

export const getSystemStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = await getDB();
    const row = await db.get('SELECT value FROM meta_settings WHERE key = ?', ['maintenance_mode']);
    // 預設為 true (站點初始化時默認開啟維護模式)
    const maintenance = row ? row.value === 'true' : true;
    
    const typeRow = await db.get('SELECT value FROM meta_settings WHERE key = ?', ['maintenance_type']);
    // 預設為 'ui' (介面升級)
    const type = typeRow ? typeRow.value : 'ui';

    const etaRow = await db.get('SELECT value FROM meta_settings WHERE key = ?', ['maintenance_eta']);
    const eta = etaRow ? etaRow.value : null;

    res.json({ success: true, data: { maintenance, type, eta } });
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

    const db = await getDB();
    
    await db.run('BEGIN TRANSACTION');
    
    await db.run(
      'INSERT INTO meta_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ['maintenance_mode', maintenance ? 'true' : 'false']
    );

    if (type) {
      await db.run(
        'INSERT INTO meta_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ['maintenance_type', type]
      );
    }

    if (eta !== undefined) {
      await db.run(
        'INSERT INTO meta_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ['maintenance_eta', eta ? String(eta) : '']
      );
    }
    
    await db.run('COMMIT');

    res.json({ success: true, data: { maintenance, type, eta } });
  } catch (error) {
    next(error);
  }
};
