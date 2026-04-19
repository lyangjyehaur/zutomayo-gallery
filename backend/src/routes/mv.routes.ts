import { Router } from 'express';
import { getMVs, getMVById, updateMVs, probeImage, getMetadata, updateMetadata, resolveTwitterMedia } from '../controllers/mv.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { authService } from '../services/auth.service.js';
import { getDB } from '../services/db.service.js';
import bcrypt from 'bcrypt';

const router = Router();

// 匯出 SQLite 備份 (供管理員下載)
router.get('/export-db', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const dbPath = db.name;
    res.download(dbPath, 'zutomayo-gallery.sqlite');
  } catch (error: any) {
    res.status(500).json({ error: '無法匯出資料庫' });
  }
});

// 執行原生 SQL (供管理員操作)
router.post('/db/query', requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const { sql } = req.body;
    if (!sql) return res.status(400).json({ error: 'SQL 不可為空' });
    
    if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
      const rows = db.prepare(sql).all();
      res.json({ rows });
    } else {
      const result = db.prepare(sql).run();
      res.json({ result: { changes: result.changes, lastID: result.lastInsertRowid } });
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 管理員密碼驗證
router.post('/verify-admin', requireAdmin, async (req, res) => {
  const storedPassword = await authService.getPassword();
  if (!storedPassword) {
    const expectedPassword = process.env.ADMIN_PASSWORD || 'zutomayo';
    res.json({ success: true, isDefaultPassword: expectedPassword === 'zutomayo' });
  } else {
    // 若有 storedPassword 必定代表已修改過密碼
    res.json({ success: true, isDefaultPassword: false });
  }
});

router.get('/metadata', getMetadata);
router.post('/metadata', requireAdmin, updateMetadata);

router.get('/', getMVs);
router.get('/:id', getMVById);
router.post('/update', requireAdmin, updateMVs);
router.post('/probe', requireAdmin, probeImage);
router.post('/twitter-resolve', requireAdmin, resolveTwitterMedia);

export default router;