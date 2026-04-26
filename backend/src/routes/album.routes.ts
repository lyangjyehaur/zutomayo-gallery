import { Router } from 'express';
import { getAlbums, updateAlbums, getAppleMusicAlbums, updateAppleMusicAlbums } from '../controllers/album.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/apple-music', getAppleMusicAlbums);
router.post('/apple-music', requireAdmin, updateAppleMusicAlbums);
router.get('/', getAlbums);
router.post('/', requireAdmin, updateAlbums);

export default router;
