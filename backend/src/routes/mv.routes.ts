import { Router } from 'express';
import { getMVs, getMVById, updateMVs, probeImage, getMetadata, updateMetadata, resolveTwitterMedia } from '../controllers/mv.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { authService } from '../services/auth.service.js';

const router = Router();

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

router.get('/', cacheMiddleware(300), getMVs); // 5分鐘快取
router.get('/:id', cacheMiddleware(300), getMVById);
router.post('/update', requireAdmin, updateMVs);
router.post('/probe', requireAdmin, probeImage);
router.post('/twitter-resolve', requireAdmin, resolveTwitterMedia);

export default router;
