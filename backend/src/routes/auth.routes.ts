import { Router } from 'express';
import { generateRegOptions, verifyReg, generateAuthOptions, verifyAuth, listPasskeys, removePasskey, changePassword } from '../controllers/auth.controller.js';
import { login, logout, me } from '../controllers/auth-session.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', me);

// Passkey authentication (public)
router.get('/generate-auth-options', generateAuthOptions);
router.post('/verify-auth', verifyAuth);

// Passkey management (requires admin)
router.get('/generate-reg-options', requireAdmin, generateRegOptions);
router.post('/verify-reg', requireAdmin, verifyReg);
router.get('/passkeys', requireAdmin, listPasskeys);
router.delete('/passkeys/:id', requireAdmin, removePasskey);

// Password management
router.post('/change-password', requireAdmin, changePassword);

export default router;
