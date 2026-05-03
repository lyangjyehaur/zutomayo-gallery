import { Router } from 'express';
import { addTweet, createSubmission, getSubmission, localSubmissions, mySubmissions, submitForReview, submissionUpload, updateSubmission, uploadFiles } from '../controllers/submissions.controller.js';

const router = Router();

router.get('/me/list', mySubmissions);
router.post('/local/list', localSubmissions);
router.post('/', createSubmission);
router.get('/:id', getSubmission);
router.put('/:id', updateSubmission);
router.post('/:id/add-tweet', addTweet);
router.post('/:id/upload', submissionUpload.array('files', 10), uploadFiles);
router.post('/:id/submit', submitForReview);

export default router;
