import { Router } from 'express';
import { loginWithPassword, logout, me, register, requestMagicLink, requestPasswordReset, resetPassword, updateMe, verifyEmail, verifyMagicLink } from '../controllers/public-auth.controller.js';
import { requirePublicUser } from '../middleware/public-auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.post('/request-link', asyncHandler(requestMagicLink));
router.post('/verify', asyncHandler(verifyMagicLink));
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(loginWithPassword));
router.post('/verify-email', asyncHandler(verifyEmail));
router.post('/forgot-password', asyncHandler(requestPasswordReset));
router.post('/reset-password', asyncHandler(resetPassword));
router.get('/me', asyncHandler(me));
router.put('/me', requirePublicUser, asyncHandler(updateMe));
router.post('/logout', asyncHandler(logout));

export default router;
