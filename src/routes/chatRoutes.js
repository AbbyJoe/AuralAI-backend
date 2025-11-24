import { Router } from 'express';
import { chatAboutSong } from '../controllers/chatController.js';

const router = Router();

router.post('/chat', chatAboutSong);

export default router;

