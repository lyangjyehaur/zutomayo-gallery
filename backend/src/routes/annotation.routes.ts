import { Router } from 'express';
import {
  getAllAnnotations,
  getAnnotationsByMedia,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getAnnotationsByMv,
} from '../controllers/annotation.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requirePermission } from '../middleware/auth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/', asyncHandler(getAllAnnotations));
router.get('/media/:mediaId', cacheMiddleware(300), asyncHandler(getAnnotationsByMedia));
router.get('/mv/:mvId', cacheMiddleware(300), asyncHandler(getAnnotationsByMv));
router.post('/', requirePermission(ADMIN_PERMISSIONS.ANNOTATIONS), asyncHandler(createAnnotation));
router.put('/:id', requirePermission(ADMIN_PERMISSIONS.ANNOTATIONS), asyncHandler(updateAnnotation));
router.delete('/:id', requirePermission(ADMIN_PERMISSIONS.ANNOTATIONS), asyncHandler(deleteAnnotation));

export default router;
