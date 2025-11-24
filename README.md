# Backend API

Node.js/Express backend for AI Music Chord Analyzer.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in this directory:
```
PORT=3001
XAI_API_KEY=your_xai_api_key_here
XAI_MODEL=grok-beta
UPLOAD_DIR=./uploads
NODE_ENV=development
```

**Getting your xAI API Key:**
- Sign up or log in at [xAI Console](https://console.x.ai/)
- Navigate to Settings to generate a new API key
- Available models: `grok-beta`, `grok-2`, `grok-2-1212`, etc.

3. Make sure FFmpeg is installed on your system:
- macOS: `brew install ffmpeg`
- Linux: `sudo apt-get install ffmpeg`
- Windows: Download from https://ffmpeg.org/

4. Start the server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/analyze` - Upload and analyze audio file
- `POST /api/chat` - Ask questions about analyzed song

## Notes

- Currently uses mock chord detection. In production, integrate Essentia.js for actual DSP processing.
- Audio files are temporarily stored and deleted after 1 minute.
- Maximum file size: 50MB

