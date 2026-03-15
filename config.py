"""
Simple configuration for Realtime Voice Chat v2.
Uses Gemini Live API via native WebSocket.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Gemini Settings
MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"
VOICE = "Aoede"  # Gemini prebuilt voice
TEMPERATURE = 0.8

# Audio Settings
INPUT_AUDIO_FORMAT = "pcm16"
OUTPUT_AUDIO_FORMAT = "pcm16"
INPUT_SAMPLE_RATE = 16000   # Frontend captures at 16kHz
OUTPUT_SAMPLE_RATE = 24000  # Gemini outputs 24kHz

# VAD Settings (kept for session config reference)
VAD_THRESHOLD = 0.5
VAD_PREFIX_PADDING_MS = 300
VAD_SILENCE_DURATION_MS = 800

# Session Settings
SESSION_TIMEOUT = 3600  # 1 hour

# Gemini API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")




def get_session_config() -> dict[str, any]:
    """Get session configuration."""
    return {
        "model": MODEL,
        "voice": VOICE,
        "temperature": TEMPERATURE,
        "input_audio_format": INPUT_AUDIO_FORMAT,
        "output_audio_format": OUTPUT_AUDIO_FORMAT,
        "input_sample_rate": INPUT_SAMPLE_RATE,
        "output_sample_rate": OUTPUT_SAMPLE_RATE,
    }


def get_environment_info() -> dict[str, str]:
    """Get environment information for debugging."""
    return {
        "model": MODEL,
        "has_gemini_key": "Yes" if GEMINI_API_KEY else "No",
    }
