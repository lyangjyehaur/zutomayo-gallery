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
import { requireAdmin } from '../middleware/auth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

const router = Router();

router.get('/apple-music', cacheMiddleware(300), getAppleMusicAlbums);
router.get('/apple-music/:id', cacheMiddleware(300), getAppleMusicAlbumById);
router.post('/apple-music', requireAdmin, updateAppleMusicAlbums);
router.patch('/apple-music/:id', requireAdmin, patchAppleMusicAlbum);
router.get('/', cacheMiddleware(300), getAlbums);
router.get('/:id', cacheMiddleware(300), getAlbumById);
router.post('/create', requireAdmin, createAlbum);
router.post('/', requireAdmin, updateAlbums);
router.patch('/:id', requireAdmin, patchAlbum);
router.delete('/:id', requireAdmin, deleteAlbum);

export default router;
