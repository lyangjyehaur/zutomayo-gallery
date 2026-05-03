import { Router } from 'express';
import { logout, me, requestMagicLink, verifyMagicLink } from '../controllers/public-auth.controller.js';

const router = Router();

router.post('/request-link', requestMagicLink);
router.post('/verify', verifyMagicLink);
router.get('/me', me);
router.post('/logout', logout);

export default router;

