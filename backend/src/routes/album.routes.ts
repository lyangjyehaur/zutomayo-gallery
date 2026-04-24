import { Router } from 'express';
import { getAlbums, updateAlbums } from '../controllers/album.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', getAlbums);
router.post('/', requireAdmin, updateAlbums);

export default router;
