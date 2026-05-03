import { Router } from 'express';
import { generateRegOptions, verifyReg, generateAuthOptions, verifyAuth, listPasskeys, removePasskey } from '../controllers/auth.controller.js';
import { login, logout, me, updateMeProfile } from '../controllers/auth-session.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', me);
router.put('/me/profile', requireAuth, updateMeProfile);

// Passkey authentication (public)
router.get('/generate-auth-options', generateAuthOptions);
router.post('/verify-auth', verifyAuth);

// Passkey management (per-user)
router.get('/generate-reg-options', requireAuth, generateRegOptions);
router.post('/verify-reg', requireAuth, verifyReg);
router.get('/passkeys', requireAuth, listPasskeys);
router.delete('/passkeys/:id', requireAuth, removePasskey);

export default router;
