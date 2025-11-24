import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const PORT = process.env.PORT || 3001;
const JSON_LIMIT = process.env.JSON_LIMIT || '10mb';
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT_DIR, 'uploads');
const SPECTRAL_PEAK_MAG_THRESHOLD = Number(process.env.SPECTRAL_PEAK_MAG_THRESHOLD ?? 1e-6);
const XAI_MODEL = process.env.XAI_MODEL || 'gpt-4o-mini';
const MAX_ANALYSIS_DURATION_SEC = Number(process.env.MAX_ANALYSIS_DURATION_SEC || 60); // Limit to 60 seconds for performance
const FRAME_SKIP_RATIO = Number(process.env.FRAME_SKIP_RATIO || 1); // Process every Nth frame for long files

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export {
  PORT,
  JSON_LIMIT,
  ROOT_DIR,
  UPLOAD_DIR,
  SPECTRAL_PEAK_MAG_THRESHOLD,
  XAI_MODEL,
  MAX_ANALYSIS_DURATION_SEC,
  FRAME_SKIP_RATIO
};

