# Backend API - AI Music Chord Analyzer

Node.js/Express backend server providing RESTful API endpoints for audio analysis, chord detection, and AI-powered music theory explanations.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ installed
- **FFmpeg** installed (for audio processing)
- **xAI API Key** (for AI features)

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Create a `.env` file in the backend directory:
```env
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

3. Install FFmpeg:
   - **macOS**: `brew install ffmpeg`
   - **Linux**: `sudo apt-get install ffmpeg`
   - **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/)

4. Start the server:
```bash
npm run dev
# or
yarn dev
```

The API will be available at `http://localhost:3001`

### Production

```bash
npm start
# or
yarn start
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── app.js                    # Express application setup
│   ├── config/                    # Configuration files
│   │   ├── env.js                # Environment variables loader
│   │   ├── multer.js             # File upload configuration
│   │   └── openai.js              # xAI API client configuration
│   ├── controllers/              # Route controllers
│   │   ├── analysisController.js # Audio analysis handler
│   │   ├── chatController.js     # Chat/AI question handler
│   │   └── healthController.js   # Health check handler
│   ├── routes/                   # API route definitions
│   │   ├── analysisRoutes.js     # Analysis endpoints
│   │   ├── chatRoutes.js         # Chat endpoints
│   │   ├── healthRoutes.js       # Health check endpoints
│   │   └── index.js              # Route aggregator
│   └── services/                 # Business logic services
│       ├── aiService.js          # xAI integration
│       ├── analysisService.js    # Analysis data processing
│       ├── audioService.js       # Audio file processing
│       ├── chordDetectionService.js # Chord detection logic
│       └── essentiaService.js    # Essentia.js integration
├── uploads/                      # Temporary file storage
├── server.js                     # Server entry point
└── package.json
```

## 🔌 API Endpoints

### Health Check

**GET** `/api/health`

Check server health and status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200` - Server is healthy

---

### Analyze Audio

**POST** `/api/analyze`

Upload and analyze an audio file to detect chords, key signature, and generate music theory explanations.

**Content-Type:** `multipart/form-data`

**Request Body:**
- `file` (required): Audio file (MP3, WAV, M4A, FLAC)
  - Max file size: 50MB
  - Supported formats: MP3, WAV, M4A, FLAC

**Response:**
```json
{
  "success": true,
  "rawChords": ["C", "Am", "F", "G"],
  "analysis": {
    "key": "C major",
    "explanation": "The song is in C major...",
    "sections": {
      "intro": ["C", "Am", "F", "G"],
      "verse": ["C", "Am", "F", "G"],
      "chorus": ["F", "G", "Am", "C"]
    }
  }
}
```

**Status Codes:**
- `200` - Analysis successful
- `400` - No file uploaded or invalid file
- `500` - Analysis failed

**Notes:**
- Audio files are automatically converted to WAV format for processing
- Files are temporarily stored and deleted after 60 seconds
- Analysis includes chord detection, key estimation, and AI-powered explanations

---

### Chat

**POST** `/api/chat`

Ask questions about an analyzed song and get AI-powered answers.

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "question": "What is the chord progression in the chorus?",
  "analysisData": {
    "key": "C major",
    "sections": {
      "chorus": ["F", "G", "Am", "C"]
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "answer": "The chorus uses a I-V-vi-IV progression in C major..."
}
```

**Status Codes:**
- `200` - Question answered successfully
- `400` - Missing required fields (question, analysisData)
- `500` - Failed to process question

**Notes:**
- Requires valid `XAI_API_KEY` in environment variables
- AI responses are contextually aware of the analyzed song
- Supports markdown formatting in responses

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port number | No | `3001` |
| `XAI_API_KEY` | xAI API key for AI features | Yes* | - |
| `XAI_MODEL` | xAI model to use | No | `grok-beta` |
| `UPLOAD_DIR` | Directory for temporary file storage | No | `./uploads` |
| `NODE_ENV` | Environment mode (development/production) | No | `development` |

*Required for AI features (analysis explanations and chat). Server will start without it but AI features will be disabled.

### File Upload Configuration

- **Max file size**: 50MB
- **Supported formats**: MP3, WAV, M4A, FLAC
- **Storage**: Temporary (files deleted after 60 seconds)
- **Processing**: Files are converted to WAV format using FFmpeg

## 🛠️ Services

### Audio Service
Handles audio file processing, format conversion, and cleanup.

### Chord Detection Service
Detects chords from audio files using Essentia.js and audio analysis algorithms.

### Analysis Service
Processes detected chords, estimates key signatures, and organizes data by song sections.

### AI Service
Integrates with xAI (Grok) API to provide:
- Music theory explanations
- Chord progression analysis
- Contextual answers to user questions

### Essentia Service
Initializes and manages Essentia.js for advanced audio feature extraction.

## 🔒 Security & Best Practices

- **File Upload Limits**: Maximum 50MB file size enforced
- **Temporary Storage**: Files are automatically deleted after processing
- **CORS**: Configured for frontend communication
- **Error Handling**: Comprehensive error handling with appropriate status codes
- **Environment Variables**: Sensitive data stored in `.env` (not committed to git)

## 🐛 Troubleshooting

### Server Won't Start

**Port already in use:**
```bash
# Check what's using port 3001
lsof -i :3001
# Kill the process or change PORT in .env
```

**Missing dependencies:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Environment file issues:**
- Ensure `.env` file exists in the backend directory
- Verify all required variables are set
- Check for syntax errors (no quotes around values unless needed)

### AI Features Not Working

**Missing API key:**
- Verify `XAI_API_KEY` is set in `.env`
- Check for typos or extra spaces
- Restart server after adding API key

**API errors:**
- Verify API key is valid and has credits
- Check model name (`XAI_MODEL`) is correct
- Review server logs for specific error messages

### Audio Processing Fails

**FFmpeg not found:**
```bash
# Verify FFmpeg installation
ffmpeg -version

# Reinstall if needed
# macOS
brew install ffmpeg
# Linux
sudo apt-get install ffmpeg
```

**File format issues:**
- Verify file is in supported format (MP3, WAV, M4A, FLAC)
- Check file is not corrupted
- Ensure file size is under 50MB

**Conversion errors:**
- Check FFmpeg has necessary codecs installed
- Review server logs for specific error messages
- Try converting file manually with FFmpeg to test

### Performance Issues

**Large files:**
- Consider implementing file size limits
- Add progress tracking for long operations
- Optimize Essentia.js processing

**Memory issues:**
- Ensure sufficient system memory
- Consider streaming large files instead of loading entirely
- Monitor memory usage during processing

## 📝 Development

### Running in Development Mode

```bash
npm run dev
```

Uses `nodemon` for automatic server restart on file changes.

### Code Structure

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and external integrations
- **Routes**: Define API endpoints and middleware
- **Config**: Configuration and setup files

### Adding New Features

1. Create service in `src/services/` for business logic
2. Create controller in `src/controllers/` for request handling
3. Add route in `src/routes/` and register in `index.js`
4. Update API documentation

## 📦 Dependencies

### Core
- **express** - Web framework
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management
- **multer** - File upload handling

### Audio Processing
- **fluent-ffmpeg** - FFmpeg wrapper for Node.js
- **essentia.js** - Audio analysis and feature extraction
- **wav-decoder** - WAV file decoding

### AI Integration
- **openai** - xAI API client (compatible with OpenAI SDK)

### Development
- **nodemon** - Development server with auto-reload

## 🔮 Future Enhancements

- [ ] Real-time chord detection during playback
- [ ] Batch file processing
- [ ] Advanced audio feature extraction
- [ ] MIDI file generation from analysis
- [ ] Export analysis results (JSON, PDF)
- [ ] Rate limiting and request throttling
- [ ] Database integration for storing analyses
- [ ] WebSocket support for real-time updates
- [ ] Audio streaming support
- [ ] Enhanced error recovery and retry logic

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Code follows existing patterns
- Error handling is comprehensive
- API responses are consistent
- Documentation is updated

---

**For frontend documentation, see [Frontend README](../frontend/README.md)**

