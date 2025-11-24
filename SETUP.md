# 🚀 Setup Guide

Follow these steps to get the AI Music Chord Analyzer up and running.

## Prerequisites

- **Node.js** 18+ installed
- **FFmpeg** installed (for audio processing)
- **xAI API Key** (for AI features)

### Installing FFmpeg

- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt-get install ffmpeg` or `sudo yum install ffmpeg`
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

## Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env` and add your xAI API key:
```
PORT=3001
XAI_API_KEY=your-xai-api-key-here
XAI_MODEL=grok-beta
UPLOAD_DIR=./uploads
NODE_ENV=development
```

**Getting your xAI API Key:**
- Sign up or log in at [xAI Console](https://console.x.ai/)
- Navigate to Settings to generate a new API key
- Available models: `grok-beta`, `grok-2`, `grok-2-1212`, etc.

5. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:3001`

## Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. Open your browser and go to `http://localhost:3000`
2. Upload an audio file (MP3, WAV, M4A, or FLAC)
3. Wait for the AI analysis to complete
4. Explore the chord progression, sections, and music theory explanations
5. Use the chat interface to ask questions about the song

## Troubleshooting

### Backend won't start
- Make sure port 3001 is not in use
- Check that all dependencies are installed
- Verify your `.env` file exists and has the correct format

### AI features not working
- Ensure your xAI API key is set in the backend `.env` file
- Check that you have API credits available
- Verify the API key is correct
- Check that the model name (`XAI_MODEL`) is valid (e.g., `grok-beta`)

### Audio upload fails
- Check file size (max 50MB)
- Verify file format (MP3, WAV, M4A, FLAC)
- Ensure FFmpeg is installed and accessible

### Frontend can't connect to backend
- Verify backend is running on port 3001
- Check browser console for CORS errors
- Ensure `API_BASE` in `nuxt.config.ts` matches your backend URL

## Next Steps

- Integrate Essentia.js for real chord detection (currently using mock data)
- Add more audio format support
- Implement export features (PDF, MIDI)
- Add user accounts and saved progressions

