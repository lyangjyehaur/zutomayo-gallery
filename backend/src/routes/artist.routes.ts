import { Router } from 'express';
import { createArtist, deleteArtist, getArtistById, getArtists, patchArtist } from '../controllers/artist.controller.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', asyncHandler(getArtists));
router.get('/:id', asyncHandler(getArtistById));
router.post('/create', requireAuth, requirePermission('admin:artists'), asyncHandler(createArtist));
router.patch('/:id', requireAuth, requirePermission('admin:artists'), asyncHandler(patchArtist));
router.delete('/:id', requireAuth, requirePermission('admin:artists'), asyncHandler(deleteArtist));

export default router;
