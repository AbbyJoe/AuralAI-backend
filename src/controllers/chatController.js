import { answerSongQuestion } from '../services/aiService.js';

async function chatAboutSong(req, res) {
  try {
    const { question, analysisData } = req.body || {};
    if (!question || !analysisData) {
      return res.status(400).json({ error: 'question and analysisData required' });
    }
    const answer = await answerSongQuestion(question, analysisData);
    res.json({ success: true, answer });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to process question', message: err.message || String(err) });
  }
}

export { chatAboutSong };

