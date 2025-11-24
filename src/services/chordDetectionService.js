import { SPECTRAL_PEAK_MAG_THRESHOLD, MAX_ANALYSIS_DURATION_SEC, FRAME_SKIP_RATIO } from '../config/env.js';
import { ensureWavFile, loadMonoAudio } from './audioService.js';
import { initEssentia, getEssentia, disposeVector, toFloat32Array } from './essentiaService.js';

const NOTE_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CHORD_TEMPLATE_LIBRARY = [
  { id: 'maj', suffix: ':maj', intervals: [0, 4, 7], weights: [1, 0.85, 0.75] },
  { id: 'min', suffix: ':min', intervals: [0, 3, 7], weights: [1, 0.85, 0.75] },
  { id: 'dim', suffix: ':dim', intervals: [0, 3, 6], weights: [1, 0.8, 0.7] },
  { id: 'aug', suffix: ':aug', intervals: [0, 4, 8], weights: [1, 0.85, 0.7] },
  { id: 'sus2', suffix: ':sus2', intervals: [0, 2, 7], weights: [1, 0.8, 0.7] },
  { id: 'sus4', suffix: ':sus4', intervals: [0, 5, 7], weights: [1, 0.8, 0.75] },
  { id: '7', suffix: ':7', intervals: [0, 4, 7, 10], weights: [1, 0.85, 0.75, 0.6] },
  { id: 'maj7', suffix: ':maj7', intervals: [0, 4, 7, 11], weights: [1, 0.85, 0.75, 0.6] },
  { id: 'min7', suffix: ':min7', intervals: [0, 3, 7, 10], weights: [1, 0.85, 0.75, 0.6] },
  { id: 'minMaj7', suffix: ':min(maj7)', intervals: [0, 3, 7, 11], weights: [1, 0.85, 0.75, 0.6] }
];

const CHORD_TEMPLATE_CACHE = (() => {
  const cache = [];
  for (let root = 0; root < 12; root++) {
    const rootTemplates = CHORD_TEMPLATE_LIBRARY.map((template) => {
      const vector = new Float32Array(12);
      template.intervals.forEach((interval, idx) => {
        const noteIndex = (root + interval) % 12;
        vector[noteIndex] = template.weights[idx] ?? 1;
      });
      const norm = Math.hypot(...vector) || 1e-6;
      return {
        label: `${NOTE_CLASS_NAMES[root]}${template.suffix}`,
        vector,
        norm
      };
    });
    cache[root] = rootTemplates;
  }
  return cache;
})();

function classifyHpcpFrames(frames, opts = {}) {
  const CONF_THRESHOLD = opts.confidenceThreshold ?? 0.32;
  const results = new Array(frames.length);

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frame || frame.length !== 12) {
      results[i] = { chord: 'Unknown', confidence: 0 };
      continue;
    }

    // Optimized norm calculation
    let frameNormSq = 0;
    for (let j = 0; j < 12; j++) {
      frameNormSq += frame[j] * frame[j];
    }
    const frameNorm = Math.sqrt(frameNormSq) || 1e-6;
    
    let best = { chord: 'Unknown', confidence: 0 };

    // Optimized template matching
    for (let root = 0; root < 12; root++) {
      const templates = CHORD_TEMPLATE_CACHE[root];
      for (const tpl of templates) {
        let dot = 0;
        for (let j = 0; j < 12; j++) {
          dot += frame[j] * tpl.vector[j];
        }
        const cosine = dot / (tpl.norm * frameNorm || 1e-6);
        if (cosine > best.confidence) {
          best = { chord: tpl.label, confidence: cosine };
        }
      }
    }

    if (best.confidence < CONF_THRESHOLD) {
      results[i] = { chord: 'Unknown', confidence: Number(best.confidence.toFixed(3)) };
    } else {
      results[i] = {
        chord: best.chord,
        confidence: Number(best.confidence.toFixed(3))
      };
    }
  }

  return results;
}

function medianSmoothLabels(labels, window = 5) {
  if (!Array.isArray(labels) || labels.length === 0) return labels;
  const half = Math.floor(window / 2);
  const out = new Array(labels.length);
  
  for (let i = 0; i < labels.length; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(labels.length - 1, i + half);
    const freq = new Map();
    let maxCount = 0;
    let winner = labels[i];
    
    // Optimized frequency counting
    for (let j = start; j <= end; j++) {
      const label = labels[j];
      const count = (freq.get(label) || 0) + 1;
      freq.set(label, count);
      if (count > maxCount) {
        maxCount = count;
        winner = label;
      }
    }
    
    out[i] = winner;
  }
  return out;
}

function mergeShortChordSegments(chords, minDuration = 0.5) {
  if (!Array.isArray(chords) || !chords.length) return chords;
  const merged = [];
  for (let i = 0; i < chords.length; i++) {
    const curr = chords[i];
    const next = chords[i + 1];
    // Calculate duration of current segment
    const duration = next ? next.time - curr.time : minDuration;
    
    if (merged.length === 0) {
      merged.push({ ...curr, duration });
      continue;
    }
    
    const last = merged[merged.length - 1];
    
    // Only merge consecutive identical chords
    if (curr.chord === last.chord) {
      // Same chord - extend duration
      last.duration = (last.duration || 0) + duration;
    } else {
      // Different chord - always keep it, even if short
      // This preserves all chord changes in the progression
      merged.push({ ...curr, duration });
    }
  }
  return merged.map((m) => ({
    time: Number(m.time.toFixed(2)),
    chord: m.chord,
    confidence: m.confidence ?? null
  }));
}

async function detectChords(audioPath, opts = {}) {
  const DEBUG = !!opts.debug;
  const MIN_HPCP_FRAMES = opts.minHpcpFrames || 6;
  const MEDIAN_WINDOW = opts.medianWindow || 5; // Reduced from 7 to preserve more chord changes
  const MIN_SEGMENT_SEC = opts.minSegmentSec || 0.3; // Reduced from 0.5 to preserve shorter chord changes

  await initEssentia();
  const ess = getEssentia();

  const { wavPath, cleanup } = await ensureWavFile(audioPath);
  try {
    const { samples, sampleRate } = await loadMonoAudio(wavPath);
    if (!samples || samples.length < 8192) {
      if (DEBUG) console.warn('Audio too short for analysis:', samples?.length);
      return { chords: [], estimatedKey: null };
    }

    const FRAME_SIZE = 8192;
    const HOP_SIZE = 4096;
    
    // Limit audio duration for performance
    const maxSamples = Math.floor(MAX_ANALYSIS_DURATION_SEC * sampleRate);
    const samplesToProcess = samples.length > maxSamples ? samples.subarray(0, maxSamples) : samples;
    
    if (DEBUG && samples.length > maxSamples) {
      console.log(`Audio truncated from ${(samples.length / sampleRate).toFixed(1)}s to ${MAX_ANALYSIS_DURATION_SEC}s for performance`);
    }

    // Calculate frame skip based on audio length
    const totalFrames = Math.floor((samplesToProcess.length - FRAME_SIZE) / HOP_SIZE) + 1;
    const frameSkip = totalFrames > 200 ? Math.max(1, Math.floor(totalFrames / 200)) : 1;
    
    if (DEBUG && frameSkip > 1) {
      console.log(`Processing every ${frameSkip} frame(s) for performance (${totalFrames} total frames)`);
    }

    const hpcpRawFrames = [];
    const peaksCounts = [];

    // Process frames with skipping for long files
    const actualHopSize = HOP_SIZE * frameSkip;
    for (let start = 0; start + FRAME_SIZE <= samplesToProcess.length; start += actualHopSize) {
      const frameSlice = samplesToProcess.subarray(start, start + FRAME_SIZE);
      const frameVec = ess.arrayToVector(frameSlice);

      let windowedVec = null;
      try {
        const win = ess.Windowing(frameVec, true, FRAME_SIZE, 'blackmanharris62', 0, true);
        windowedVec = win.frame || win;
      } catch (e) {
        try {
          const win = ess.Windowing(frameVec);
          windowedVec = win.frame || win;
        } catch {
          disposeVector(frameVec);
          continue;
        }
      } finally {
        disposeVector(frameVec);
      }

      let spectrumVec = null;
      let spectrumOut = null;
      try {
        spectrumOut = ess.Spectrum(windowedVec, FRAME_SIZE);
        spectrumVec = spectrumOut.spectrum || spectrumOut;
      } catch {
        disposeVector(windowedVec);
        continue;
      } finally {
        disposeVector(windowedVec);
      }

      let peaks;
      try {
        peaks = ess.SpectralPeaks(
          spectrumVec,
          SPECTRAL_PEAK_MAG_THRESHOLD,
          Math.floor(sampleRate / 2),
          800,
          40,
          'frequency',
          sampleRate
        );
      } catch {
        try {
          peaks = ess.SpectralPeaks(
            spectrumVec,
            SPECTRAL_PEAK_MAG_THRESHOLD,
            40,
            Math.floor(sampleRate / 2),
            800
          );
        } catch {
          disposeVector(spectrumVec);
          disposeVector(spectrumOut);
          continue;
        }
      } finally {
        disposeVector(spectrumVec);
        disposeVector(spectrumOut);
      }

      const freqs = peaks?.frequencies || peaks?.[0] || [];
      const mags = peaks?.magnitudes || peaks?.[1] || [];
      const freqArr = toFloat32Array(freqs);
      const magArr = toFloat32Array(mags);
      disposeVector(freqs);
      disposeVector(mags);
      peaksCounts.push((freqArr && freqArr.length) || 0);

      if (!freqArr?.length || !magArr?.length) {
        continue;
      }

      const freqVec = ess.arrayToVector(freqArr);
      const magVec = ess.arrayToVector(magArr);

      let hpcpOut;
      try {
        hpcpOut = ess.HPCP(
          freqVec,
          magVec,
          true,
          500,
          0,
          Math.floor(sampleRate / 2),
          false,
          40,
          false,
          'unitSum',
          440.0,
          sampleRate,
          12
        );
      } catch {
        try {
          hpcpOut = ess.HPCP(freqVec, magVec, 12, 440.0, sampleRate);
        } catch {
          disposeVector(freqVec);
          disposeVector(magVec);
          continue;
        }
      } finally {
        disposeVector(freqVec);
        disposeVector(magVec);
      }

      const hpcpArr = toFloat32Array(hpcpOut?.hpcp || hpcpOut) || [];
      disposeVector(hpcpOut?.hpcp || hpcpOut);
      if (hpcpArr.length && hpcpArr.some((v) => Number.isFinite(v) && v > 0)) {
        hpcpRawFrames.push(hpcpArr);
      }
    }

    if (DEBUG) {
      console.log('sampleRate:', sampleRate, 'framesCollected:', hpcpRawFrames.length, 'peaksCountsStats:', {
        min: Math.min(...peaksCounts, 0),
        max: Math.max(...peaksCounts, 0),
        avg: (peaksCounts.reduce((a, b) => a + b, 0) / Math.max(peaksCounts.length, 1)).toFixed(1)
      });
    }

    if (hpcpRawFrames.length < MIN_HPCP_FRAMES) {
      if (DEBUG) console.warn('Insufficient HPCP frames for chord detection:', hpcpRawFrames.length);
      return { chords: [], estimatedKey: null };
    }

    // Optimized smoothing with pre-allocated arrays
    const avgWindow = 3;
    const halfWindow = Math.floor(avgWindow / 2);
    const smoothedHpcp = new Array(hpcpRawFrames.length);
    
    for (let i = 0; i < hpcpRawFrames.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(hpcpRawFrames.length - 1, i + halfWindow);
      const windowSize = end - start + 1;
      const sum = new Float32Array(12);
      
      for (let j = start; j <= end; j++) {
        const row = hpcpRawFrames[j];
        for (let k = 0; k < 12; k++) {
          sum[k] += row[k] || 0;
        }
      }
      
      for (let k = 0; k < 12; k++) {
        sum[k] /= windowSize;
      }
      
      smoothedHpcp[i] = Array.from(sum);
    }

    let estimatedKey = null;
    try {
      const global = new Float32Array(12);
      for (const r of smoothedHpcp) for (let i = 0; i < 12; i++) global[i] += r[i] || 0;
      for (let i = 0; i < 12; i++) global[i] = global[i] / smoothedHpcp.length;
      const globalVec = ess.arrayToVector(global);
      let keyResult;
      try {
        keyResult = ess.KeyExtractor(globalVec);
      } catch {
        keyResult = ess.Key(globalVec);
      }
      if (keyResult) {
        estimatedKey = keyResult.key || keyResult;
      }
      disposeVector(globalVec);
      if (DEBUG) console.log('Estimated key:', estimatedKey);
    } catch (e) {
      if (DEBUG) console.warn('Key estimation failed:', e.message || e);
    }

    const chordClassifications = classifyHpcpFrames(smoothedHpcp, { confidenceThreshold: 0.3 });
    // Adjust hop size calculation for frame skipping
    const secondsPerHop = actualHopSize / sampleRate;
    const initialLabels = chordClassifications.map((entry) => entry.chord);

    const smoothedLabels = medianSmoothLabels(initialLabels, MEDIAN_WINDOW);

    const timeStamped = smoothedLabels.map((label, i) => ({
      time: Number((i * secondsPerHop).toFixed(2)),
      chord: label === 'N' ? 'Unknown' : label,
      confidence: chordClassifications[i]?.confidence ?? null
    }));

    const merged = mergeShortChordSegments(timeStamped, MIN_SEGMENT_SEC);

    const final = [];
    for (let i = 0; i < merged.length; i++) {
      const cur = merged[i];
      if (final.length && final[final.length - 1].chord === cur.chord) {
        const prev = final[final.length - 1];
        prev.confidence = ((prev.confidence || 0) + (cur.confidence || 0)) / 2;
      } else {
        final.push({ time: cur.time, chord: cur.chord, confidence: cur.confidence });
      }
    }

    if (DEBUG) {
      console.log('Raw labels sample:', initialLabels.slice(0, 12));
      console.log('Smoothed sample:', smoothedLabels.slice(0, 12));
      console.log('Final chords count:', final.length);
    }

    return { chords: final, estimatedKey };
  } finally {
    try {
      if (cleanup) await cleanup();
    } catch {
      // ignore cleanup errors
    }
  }
}

export { detectChords };

