import { Router } from 'express';
import { getMVs, getMVById, updateMVs, probeImage } from '../controllers/mv.controller.js';

const router = Router();

router.get('/', getMVs);
router.get('/:id', getMVById);
router.post('/update', updateMVs); // 新增更新路由
router.post('/probe', probeImage); // 新增尺寸偵測路由

export default router;