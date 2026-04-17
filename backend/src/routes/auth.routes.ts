import { Router } from 'express';
import { generateRegOptions, verifyReg, generateAuthOptions, verifyAuth, listPasskeys, removePasskey, changePassword } from '../controllers/auth.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

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