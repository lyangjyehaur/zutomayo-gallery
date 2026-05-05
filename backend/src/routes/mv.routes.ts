import { Router } from 'express';
import { getMVs, getMVById, updateMVs, probeImage, getMetadata, updateMetadata, resolveTwitterMedia } from '../controllers/mv.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requirePermission } from '../middleware/auth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/metadata', asyncHandler(getMetadata));
router.post('/metadata', requirePermission(ADMIN_PERMISSIONS.MVS), asyncHandler(updateMetadata));

router.get('/', cacheMiddleware(300), asyncHandler(getMVs)); // 5分鐘快取
router.get('/:id', cacheMiddleware(300), asyncHandler(getMVById));
router.post('/update', requirePermission(ADMIN_PERMISSIONS.MVS), asyncHandler(updateMVs));
router.post('/probe', requirePermission(ADMIN_PERMISSIONS.MVS), asyncHandler(probeImage));
router.post('/twitter-resolve', requirePermission(ADMIN_PERMISSIONS.MVS), asyncHandler(resolveTwitterMedia));

export default router;
