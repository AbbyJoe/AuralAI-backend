import xaiClient from '../config/openai.js';
import { XAI_MODEL } from '../config/env.js';

function formatChordString(rawChords) {
  if (!Array.isArray(rawChords) || rawChords.length === 0) return 'No chord data detected.';
  const sanitized = rawChords
    .map((c, i) => {
      const t = Number(c?.time);
      return {
        time: Number.isFinite(t) ? t : null,
        chord: typeof c?.chord === 'string' && c.chord.trim() ? c.chord.trim() : `Unknown chord ${i + 1}`
      };
    })
    .filter((e) => e.time !== null);
  if (!sanitized.length) throw new Error('Chord analysis returned invalid timing values');
  return sanitized.map((e) => `${e.time.toFixed(2)}s: ${e.chord}`).join('\n');
}

async function analyzeChordsWithAI(rawChords, baseline) {
  if (!xaiClient) throw new Error('xAI API key not configured');
  const chordString = formatChordString(rawChords);
  const baselineSummary = baseline ? JSON.stringify(baseline) : '{}';
  const prompt = `You are a music theory expert. Analyze this raw chord progression and provide:

1. Clean and simplified chord progression (remove noise, fix errors, consolidate repeats)
2. Identify sections: intro, verse, chorus, bridge, outro
3. Detect the key
4. Provide music theory explanation, touching on the likely genre/feel of the song
5. Return JSON with exact structure:
{
  "key": "C Major",
  "sections": {
    "intro": [{"time":0,"chord":"C"}],
    "verse": [{"time":2,"chord":"C"}, {"time":4,"chord":"G"}],
    "chorus": [{"time":16,"chord":"F"}],
    "bridge": [],
    "outro": []
  },
  "progression": [{"time":0,"chord":"C"}, {"time":2,"chord":"G"}],
  "explanation": "This song uses a I-V-vi-IV progression..."
}
Make sure every section key exists even if it must be an empty array. Use the heuristic baseline below to keep your output grounded:
Baseline: ${baselineSummary}

Raw chords:
${chordString}`;

  const completion = await xaiClient.chat.completions.create({
    model: XAI_MODEL,
    messages: [
      { role: 'system', content: 'You are a music theory expert. Return valid JSON only.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7
  });

  const response = completion.choices?.[0]?.message?.content;
  if (!response) throw new Error('Empty AI response');
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  const payload = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
  return payload;
}

async function answerSongQuestion(question, analysisData) {
  if (!xaiClient) throw new Error('xAI API key not configured');
  const prompt = `You are AuralAI, a music theory expert. A user has this song analysis:

Key: ${analysisData.key || 'Unknown'}
Sections: ${JSON.stringify(analysisData.sections || {})}
Progression: ${JSON.stringify(analysisData.progression || [])}
Explanation: ${analysisData.explanation || ''}

User question: ${question}

Provide a helpful, detailed answer (music theory / playing tips) about the song, song genre, also make your explanation brief as possible, also you don't have to
 always introduce yourself as a music theory expert, your breakdown should always be about the piano`;

  const completion = await xaiClient.chat.completions.create({
    model: XAI_MODEL,
    messages: [
      { role: 'system', content: 'You are AuralAI, a friendly music theory instructor.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8
  });

  return completion.choices?.[0]?.message?.content || '';
}

export { analyzeChordsWithAI, answerSongQuestion };

