import app from './src/app.js';
import { PORT } from './src/config/env.js';
import { initEssentia } from './src/services/essentiaService.js';

initEssentia().catch((err) => {
  console.error('Essentia init error (server will still start but detection will fail):', err);
});

app.listen(PORT, () => {
  console.log(`🎹 AI Music Analyzer API listening on http://localhost:${PORT}`);
  if (!process.env.XAI_API_KEY) {
    console.warn('⚠️ XAI_API_KEY not set — AI features disabled.');
  }
});
