import { Router } from 'express';
import upload from '../config/multer.js';
import { analyzeAudio } from '../controllers/analysisController.js';

const router = Router();

router.post('/analyze', upload.single('audio'), analyzeAudio);

export default router;

