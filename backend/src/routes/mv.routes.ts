import { Router } from 'express';
import { getMVs, getMVById, updateMVs, probeImage, getMetadata, updateMetadata, resolveTwitterMedia } from '../controllers/mv.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requirePermission } from '../middleware/auth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

const router = Router();

router.get('/metadata', getMetadata);
router.post('/metadata', requirePermission(ADMIN_PERMISSIONS.MVS), updateMetadata);

router.get('/', cacheMiddleware(300), getMVs); // 5分鐘快取
router.get('/:id', cacheMiddleware(300), getMVById);
router.post('/update', requirePermission(ADMIN_PERMISSIONS.MVS), updateMVs);
router.post('/probe', requirePermission(ADMIN_PERMISSIONS.MVS), probeImage);
router.post('/twitter-resolve', requirePermission(ADMIN_PERMISSIONS.MVS), resolveTwitterMedia);

export default router;
