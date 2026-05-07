import { Router } from 'express';
import { generateRegOptions, verifyReg, generateAuthOptions, verifyAuth, listPasskeys, removePasskey } from '../controllers/auth.controller.js';
import { login, logout, me, updateMeProfile, updateNotificationPreferences } from '../controllers/auth-session.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.post('/login', asyncHandler(login));
router.post('/logout', asyncHandler(logout));
router.get('/me', asyncHandler(me));
router.put('/me/profile', requireAuth, asyncHandler(updateMeProfile));
router.put('/me/notification-preferences', requireAuth, asyncHandler(updateNotificationPreferences));

// Passkey authentication (public)
router.post('/generate-auth-options', asyncHandler(generateAuthOptions));
router.post('/verify-auth', asyncHandler(verifyAuth));

// Passkey management (per-user)
router.get('/generate-reg-options', requireAuth, asyncHandler(generateRegOptions));
router.post('/verify-reg', requireAuth, asyncHandler(verifyReg));
router.get('/passkeys', requireAuth, asyncHandler(listPasskeys));
router.delete('/passkeys/:id', requireAuth, asyncHandler(removePasskey));

export default router;
