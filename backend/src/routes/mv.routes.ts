import { Router } from 'express';
import { getMVs, getMVById, updateMVs, probeImage, getMetadata, updateMetadata, resolveTwitterMedia } from '../controllers/mv.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

const router = Router();

router.get('/metadata', getMetadata);
router.post('/metadata', requireAdmin, updateMetadata);

router.get('/', cacheMiddleware(300), getMVs); // 5分鐘快取
router.get('/:id', cacheMiddleware(300), getMVById);
router.post('/update', requireAdmin, updateMVs);
router.post('/probe', requireAdmin, probeImage);
router.post('/twitter-resolve', requireAdmin, resolveTwitterMedia);

export default router;
