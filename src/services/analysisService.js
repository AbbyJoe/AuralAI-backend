function inferKeyFromChords(chords) {
  if (!Array.isArray(chords) || !chords.length) return 'Unknown';
  const counts = {};
  chords.forEach(({ chord }) => {
    if (!chord || chord === 'Unknown') return;
    const root = chord.split(':')[0];
    if (!root) return;
    counts[root] = (counts[root] || 0) + 1;
  });
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best ? `${best[0]} (${best[1]} hits)` : 'Unknown';
}

function buildBaselineAnalysis(chords, estimatedKey) {
  const sections = { intro: [], verse: [], chorus: [], bridge: [], outro: [] };
  if (!Array.isArray(chords) || !chords.length) {
    return { key: estimatedKey || 'Unknown', sections, progression: [] };
  }

  const dedup = [];
  chords.forEach((entry) => {
    if (!dedup.length || dedup[dedup.length - 1].chord !== entry.chord) {
      dedup.push({ time: entry.time, chord: entry.chord });
    }
  });

  const totalDuration = Math.max(dedup[dedup.length - 1]?.time || 0, 1);
  const boundarySpecs = [
    { id: 'intro', start: 0, end: 0.15 },
    { id: 'verse', start: 0.15, end: 0.4 },
    { id: 'chorus', start: 0.4, end: 0.65 },
    { id: 'bridge', start: 0.65, end: 0.85 },
    { id: 'outro', start: 0.85, end: 1.01 }
  ];

  dedup.forEach(({ time, chord }) => {
    const ratio = totalDuration ? Math.max(0, Math.min(1, time / totalDuration)) : 0;
    const match = boundarySpecs.find((b) => ratio >= b.start && ratio < b.end) || boundarySpecs[1];
    sections[match.id].push({ time: Number(time.toFixed(2)), chord });
  });

  const progression = dedup.slice(0, 64).map(({ time, chord }) => ({
    time: Number(time.toFixed(2)),
    chord
  }));

  return {
    key: estimatedKey || inferKeyFromChords(dedup) || 'Unknown',
    sections,
    progression
  };
}

export { buildBaselineAnalysis };

