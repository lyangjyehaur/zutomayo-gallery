import { Router } from 'express';
import { addTweet, createSubmission, getSubmission, localSubmissions, mySubmissions, submitForReview, submissionUpload, updateSubmission, uploadFiles } from '../controllers/submissions.controller.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get('/me/list', asyncHandler(mySubmissions));
router.post('/local/list', asyncHandler(localSubmissions));
router.post('/', asyncHandler(createSubmission));
router.get('/:id', asyncHandler(getSubmission));
router.put('/:id', asyncHandler(updateSubmission));
router.post('/:id/add-tweet', asyncHandler(addTweet));
router.post('/:id/upload', submissionUpload.array('files', 10), asyncHandler(uploadFiles));
router.post('/:id/submit', asyncHandler(submitForReview));

export default router;
