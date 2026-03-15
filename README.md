# Minimal Realtime Voice Chat

A simple implementation of OpenAI's Realtime API with custom deployment endpoint using modern Python tooling.

## Setup

### Prerequisites

Install [uv](https://docs.astral.sh/uv/) if you haven't already:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Quick Start

1. Clone/navigate to the project directory and install dependencies with uv:
   ```bash
   uv sync
   ```

2. Create a `.env` file in the project root with your API key:
   ```bash
   echo "GEMINI_API_KEY=your-actual-api-key" > .env
   ```

3. Start the server:
   ```bash
   uv run python main.py
   ```
   
   The server will start on `http://localhost:8000`

4. Open your browser and go to `http://localhost:8000` - everything is served from one place!

## Usage

1. Open `http://localhost:8000` in your browser
2. Click "Start Recording" to begin voice chat
3. Speak into your microphone  
4. The AI will respond with voice
5. Click "Stop Recording" to end the session

## Configuration

The backend uses the Gemini Live API:
- **Model**: `gemini-2.0-flash-exp`
- **Audio Format**: PCM16 at 24kHz

## Project Structure

```
├── pyproject.toml          # Modern Python dependencies with uv
├── main.py                 # FastAPI server with WebSocket + static files
└── static/
    └── index.html          # Frontend served directly from FastAPI
```

## Features

✅ **Modern tooling** - Uses `uv` and `pyproject.toml`  
✅ **Single server** - Frontend and backend served from one FastAPI instance  
✅ **Minimal setup** - Just 2 files total  
✅ **Real-time audio** - 24kHz PCM16 bidirectional streaming  
✅ **Standard API** - Works with Gemini Live API  

## Notes

- Make sure to replace `"your-actual-api-key"` with your real API key
- The frontend requires HTTPS or localhost for microphone access
- Audio is processed in real-time with 24kHz PCM16 format
- Everything runs on a single port (8000) for maximum simplicity
