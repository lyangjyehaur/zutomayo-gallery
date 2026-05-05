import { Router } from 'express';
import {
  createAlbum,
  deleteAlbum,
  getAlbumById,
  getAlbums,
  getAppleMusicAlbumById,
  getAppleMusicAlbums,
  patchAlbum,
  patchAppleMusicAlbum,
  updateAlbums,
  updateAppleMusicAlbums,
} from '../controllers/album.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { requirePermission } from '../middleware/auth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/apple-music', cacheMiddleware(300), asyncHandler(getAppleMusicAlbums));
router.get('/apple-music/:id', cacheMiddleware(300), asyncHandler(getAppleMusicAlbumById));
router.post('/apple-music', requirePermission(ADMIN_PERMISSIONS.ALBUMS), asyncHandler(updateAppleMusicAlbums));
router.patch('/apple-music/:id', requirePermission(ADMIN_PERMISSIONS.ALBUMS), asyncHandler(patchAppleMusicAlbum));
router.get('/', cacheMiddleware(300), asyncHandler(getAlbums));
router.get('/:id', cacheMiddleware(300), asyncHandler(getAlbumById));
router.post('/create', requirePermission(ADMIN_PERMISSIONS.ALBUMS), asyncHandler(createAlbum));
router.post('/', requirePermission(ADMIN_PERMISSIONS.ALBUMS), asyncHandler(updateAlbums));
router.patch('/:id', requirePermission(ADMIN_PERMISSIONS.ALBUMS), asyncHandler(patchAlbum));
router.delete('/:id', requirePermission(ADMIN_PERMISSIONS.ALBUMS), asyncHandler(deleteAlbum));

export default router;
