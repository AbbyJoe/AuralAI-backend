import multer from 'multer';
import path from 'path';
import { UPLOAD_DIR } from './env.js';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(mp3|wav|m4a|flac)$/i;
    allowed.test(file.originalname) ? cb(null, true) : cb(new Error('Invalid file type.'));
  }
});

export default upload;

