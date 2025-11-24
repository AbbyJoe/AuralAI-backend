function getHealth(_req, res) {
  res.json({ status: 'ok', message: 'AI Music Analyzer API is running' });
}

export { getHealth };

