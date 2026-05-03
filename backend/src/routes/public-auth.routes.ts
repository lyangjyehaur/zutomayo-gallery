import { Router } from 'express';
import { loginWithPassword, logout, me, register, requestMagicLink, requestPasswordReset, resetPassword, updateMe, verifyEmail, verifyMagicLink } from '../controllers/public-auth.controller.js';
import { requirePublicUser } from '../middleware/public-auth.middleware.js';

const router = Router();

router.post('/request-link', requestMagicLink);
router.post('/verify', verifyMagicLink);
router.post('/register', register);
router.post('/login', loginWithPassword);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/me', me);
router.put('/me', requirePublicUser, updateMe);
router.post('/logout', logout);

export default router;
