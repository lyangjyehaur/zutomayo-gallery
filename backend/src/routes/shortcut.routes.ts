import { Router } from 'express';
import { parseTweet, submitFromShortcut, listMvsForShortcut, listArtistsForShortcut } from '../controllers/shortcut.controller.js';
import { requireApiToken } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// 所有 shortcut 端點都需要 API Token 認證
router.post('/parse-tweet', requireApiToken, asyncHandler(parseTweet));
router.post('/submit', requireApiToken, asyncHandler(submitFromShortcut));
router.get('/mvs', requireApiToken, asyncHandler(listMvsForShortcut));
router.get('/artists', requireApiToken, asyncHandler(listArtistsForShortcut));

export default router;
