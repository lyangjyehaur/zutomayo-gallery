import { Router } from 'express';
import { getAlbums, updateAlbums, getAppleMusicAlbums, updateAppleMusicAlbums } from '../controllers/album.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { cacheMiddleware } from '../middleware/cache.middleware.js';

const router = Router();

router.get('/apple-music', cacheMiddleware(300), getAppleMusicAlbums);
router.post('/apple-music', requireAdmin, updateAppleMusicAlbums);
router.get('/', cacheMiddleware(300), getAlbums);
router.post('/', requireAdmin, updateAlbums);

export default router;
