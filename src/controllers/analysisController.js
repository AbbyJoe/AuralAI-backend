import fs from 'fs';
import { detectChords } from '../services/chordDetectionService.js';
import { buildBaselineAnalysis } from '../services/analysisService.js';
import { analyzeChordsWithAI } from '../services/aiService.js';

async function analyzeAudio(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio uploaded' });
    }

    const audioPath = req.file.path;
    // Disable debug in production for better performance
    const debug = process.env.NODE_ENV !== 'production';
    const detection = await detectChords(audioPath);
    const rawChords = detection?.chords || [];
    const estimatedKey = detection?.estimatedKey;

    const baselineAnalysis = buildBaselineAnalysis(rawChords, estimatedKey);

    let analysis = baselineAnalysis;
    if (rawChords.length) {
      try {
        analysis = await analyzeChordsWithAI(rawChords, baselineAnalysis);
      } catch (aiErr) {
        console.warn('AI analysis skipped or failed:', aiErr.message || aiErr);
        analysis = baselineAnalysis;
      }
    }

    setTimeout(() => {
      try {
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      } catch {
        // ignore cleanup failures
      }
    }, 60000);

    res.json({ success: true, rawChords, analysis });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'Failed to analyze audio', message: err.message || String(err) });
  }
}

export { analyzeAudio };

