import { Router } from 'express';
import { logout, me, requestMagicLink, updateMe, verifyMagicLink } from '../controllers/public-auth.controller.js';
import { requirePublicUser } from '../middleware/public-auth.middleware.js';

const router = Router();

router.post('/request-link', requestMagicLink);
router.post('/verify', verifyMagicLink);
router.get('/me', me);
router.put('/me', requirePublicUser, updateMe);
router.post('/logout', logout);

export default router;
