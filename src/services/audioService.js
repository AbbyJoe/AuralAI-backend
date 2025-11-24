import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import wavDecoder from 'wav-decoder';

async function ensureWavFile(inputPath) {
  if (!inputPath) throw new Error('Missing input path');
  if (inputPath.toLowerCase().endsWith('.wav')) {
    return { wavPath: inputPath, cleanup: null };
  }

  const outPath = `${inputPath}.converted.wav`;
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(44100)
      .format('wav')
      .on('error', reject)
      .on('end', resolve)
      .save(outPath);
  });

  return {
    wavPath: outPath,
    cleanup: async () => {
      try {
        if (fs.existsSync(outPath)) {
          await fs.promises.unlink(outPath);
        }
      } catch {
        // ignore cleanup errors
      }
    }
  };
}

async function loadMonoAudio(wavPath) {
  const buffer = await fs.promises.readFile(wavPath);
  const decoded = await wavDecoder.decode(buffer);
  const sampleRate = decoded.sampleRate || decoded.header?.sampleRate;
  const channelData = decoded.channelData || decoded.getChannelData ? decoded.channelData : decoded.channelData;

  if (!channelData || !channelData.length) {
    throw new Error('No audio samples found after decoding');
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error(`Invalid sample rate: ${sampleRate}`);
  }

  if (channelData.length === 1) {
    return { samples: channelData[0], sampleRate };
  }

  const len = channelData[0].length;
  const mono = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    let s = 0;
    for (let c = 0; c < channelData.length; c++) {
      s += channelData[c][i] || 0;
    }
    mono[i] = s / channelData.length;
  }

  return { samples: mono, sampleRate };
}

export { ensureWavFile, loadMonoAudio };

