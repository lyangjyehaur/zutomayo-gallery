import { Router } from 'express';
import { createArtist, deleteArtist, getArtistById, getArtists, patchArtist } from '../controllers/artist.controller.js';
import { ADMIN_PERMISSIONS } from '../constants/admin-permissions.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', asyncHandler(getArtists));
router.get('/:id', asyncHandler(getArtistById));
router.post('/create', requireAuth, requirePermission(ADMIN_PERMISSIONS.ARTISTS), asyncHandler(createArtist));
router.patch('/:id', requireAuth, requirePermission(ADMIN_PERMISSIONS.ARTISTS), asyncHandler(patchArtist));
router.delete('/:id', requireAuth, requirePermission(ADMIN_PERMISSIONS.ARTISTS), asyncHandler(deleteArtist));

export default router;
