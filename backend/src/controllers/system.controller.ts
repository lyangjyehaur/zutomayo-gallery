import { Request, Response, NextFunction } from 'express';
import { getDB } from '../services/db.service.js';

export const getSystemStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = await getDB();
    const row = await db.get('SELECT value FROM meta_settings WHERE key = ?', ['maintenance_mode']);
    const maintenance = row ? row.value === 'true' : false;
    
    const etaRow = await db.get('SELECT value FROM meta_settings WHERE key = ?', ['maintenance_eta']);
    const eta = etaRow ? etaRow.value : null;

    res.json({ success: true, data: { maintenance, eta } });
  } catch (error) {
    next(error);
  }
};

export const toggleMaintenance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { maintenance, eta } = req.body;
    if (typeof maintenance !== 'boolean') {
      res.status(400).json({ success: false, error: 'Maintenance flag must be a boolean' });
      return;
    }
    const db = await getDB();
    
    await db.run('BEGIN TRANSACTION');
    
    await db.run(
      'INSERT INTO meta_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ['maintenance_mode', maintenance ? 'true' : 'false']
    );

    if (eta !== undefined) {
      await db.run(
        'INSERT INTO meta_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ['maintenance_eta', eta ? String(eta) : '']
      );
    }
    
    await db.run('COMMIT');

    res.json({ success: true, data: { maintenance, eta } });
  } catch (error) {
    next(error);
  }
};
