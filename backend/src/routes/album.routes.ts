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

const router = Router();

router.get('/apple-music', cacheMiddleware(300), getAppleMusicAlbums);
router.get('/apple-music/:id', cacheMiddleware(300), getAppleMusicAlbumById);
router.post('/apple-music', requirePermission(ADMIN_PERMISSIONS.ALBUMS), updateAppleMusicAlbums);
router.patch('/apple-music/:id', requirePermission(ADMIN_PERMISSIONS.ALBUMS), patchAppleMusicAlbum);
router.get('/', cacheMiddleware(300), getAlbums);
router.get('/:id', cacheMiddleware(300), getAlbumById);
router.post('/create', requirePermission(ADMIN_PERMISSIONS.ALBUMS), createAlbum);
router.post('/', requirePermission(ADMIN_PERMISSIONS.ALBUMS), updateAlbums);
router.patch('/:id', requirePermission(ADMIN_PERMISSIONS.ALBUMS), patchAlbum);
router.delete('/:id', requirePermission(ADMIN_PERMISSIONS.ALBUMS), deleteAlbum);

export default router;
