"""
WebSocket Routes - Gemini Live API Version

This module provides WebSocket endpoints for real-time voice chat
with Gemini Live API (using the google-genai SDK).
"""

import asyncio
import base64
import contextlib
import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

from config import (
    GEMINI_API_KEY,
    INPUT_SAMPLE_RATE,
    TEMPERATURE,
    VOICE,
    get_session_config,
    get_environment_info,
)
from tools.tools_handler import get_gemini_tools, execute_whiteboard_tool

logger = logging.getLogger(__name__)
router = APIRouter()


class SessionManager:
    """Session management for WebSocket connections."""

    def __init__(self) -> None:
        self.sessions: Dict[str, Dict[str, Any]] = {}
        logger.info("Session manager initialized")

    async def create_session(
        self, session_id: str, websocket: WebSocket, api_key: str
    ) -> Dict[str, Any]:
        session = {
            "session_id": session_id,
            "websocket": websocket,
            "gemini_session": None,
            "is_active": False,
            "api_key": api_key,
            "config": get_session_config(),
            "initialized_sent": False,
        }
        self.sessions[session_id] = session
        logger.info(f"Session created: {session_id}")
        return session

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self.sessions.get(session_id)

    async def cleanup_session(self, session_id: str) -> None:
        self.sessions.pop(session_id, None)
        logger.info(f"Session cleaned up: {session_id}")


# Global session manager
session_manager = SessionManager()


class VoiceChatService:
    def __init__(self) -> None:
        logger.info("Voice chat service initialized")

    async def handle_websocket_connection(
        self, websocket: WebSocket, session_id: str
    ) -> None:
        session = None
        try:
            await websocket.accept()

            session = await session_manager.create_session(
                session_id, websocket, GEMINI_API_KEY or ""
            )

            logger.info(f"WebSocket connection established for session {session_id}")

            await websocket.send_text(
                json.dumps(
                    {
                        "type": "connection_opened",
                        "message": "AI assistant ready",
                        "session_id": session_id,
                    }
                )
            )

            await self._initialize_gemini_session(websocket, session)

        except WebSocketDisconnect:
            logger.info(f"WebSocket connection closed for session {session_id}")
        except Exception as e:
            logger.error(
                f"Error in WebSocket connection for session {session_id}: {e}",
                exc_info=True,
            )
            try:
                if websocket.client_state.name != "DISCONNECTED":
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "error",
                                "message": "Internal server error occurred",
                            }
                        )
                    )
            except Exception:
                pass
        finally:
            if session:
                await session_manager.cleanup_session(session_id)

    async def _initialize_gemini_session(
        self, websocket: WebSocket, session: Dict[str, Any]
    ) -> None:
        session_id = session["session_id"]
        config = session["config"]

        try:
            logger.info(f"Initializing Gemini Live session for {session_id}")
            env_info = get_environment_info()
            logger.info(f"Model: {env_info['model']}")

            client = genai.Client(api_key=GEMINI_API_KEY)
            
            voice_name = config.get("voice", VOICE)
            
            system_prompt = (
                "You are a helpful AI assistant with access to a digital whiteboard.\n"
                "You have multiple tools for the whiteboard operations.\n"
                "By default when user asks to tell something, most of the time they expect you to write/draw on whiteboard.\n"
                "If you're unsure whether they just want to hear or write/draw as well, then ask them to confirm.\n"
                "You can see what's on the whiteboard through images the user sends.\n"
                "Respond conversationally and naturally.\n"
                "While dictation, or spelling checks, pronounce the letters individually with gap in between.\n"
                "Important: You must use English language, unless user explicitly asks you multiple times to use a different language."
            )

            live_config = types.LiveConnectConfig(
                response_modalities=["AUDIO"],
                temperature=config.get("temperature", TEMPERATURE),
                thinking_config=types.ThinkingConfig(thinking_budget=0),
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name=voice_name
                        )
                    )
                ),
                system_instruction=types.Content(
                    parts=[types.Part(text=system_prompt)]
                ),
                input_audio_transcription=types.AudioTranscriptionConfig(),
                output_audio_transcription=types.AudioTranscriptionConfig(),
                tools=get_gemini_tools(),
                realtime_input_config=types.RealtimeInputConfig(
                    automatic_activity_detection=types.AutomaticActivityDetection(
                        start_of_speech_sensitivity="START_SENSITIVITY_HIGH",
                        end_of_speech_sensitivity="END_SENSITIVITY_LOW",
                        prefix_padding_ms=20,
                        silence_duration_ms=200,
                    )
                ),
            )

            logger.info(f"Connecting to Gemini Live API for session {session_id}")

            try:
                async with client.aio.live.connect(model=config["model"], config=live_config) as gemini_session:
                    session["gemini_session"] = gemini_session
                    session["is_active"] = True
                    
                    logger.info(f"[{session_id}] Successfully connected to Gemini Live API")

                    if not session.get("initialized_sent", False):
                        current_config = session["config"]
                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "openai_initialized",
                                    "message": f"AI ready (Model: {current_config['model']}, Voice: {current_config['voice']})",
                                    "model": current_config["model"],
                                    "voice": current_config["voice"],
                                }
                            )
                        )
                        session["initialized_sent"] = True

                    websocket_task = asyncio.create_task(
                        self._handle_websocket_messages(websocket, gemini_session, session)
                    )
                    gemini_task = asyncio.create_task(
                        self._handle_gemini_responses(websocket, gemini_session, session)
                    )

                    try:
                        done, pending = await asyncio.wait(
                            [websocket_task, gemini_task],
                            return_when=asyncio.FIRST_COMPLETED,
                        )
                        for task in pending:
                            task.cancel()
                            with contextlib.suppress(asyncio.CancelledError):
                                await task
                    except Exception as e:
                        logger.exception(
                            f"Error in concurrent tasks for session {session_id}: {e}"
                        )
                        raise
                    finally:
                        session["is_active"] = False
                        logger.info(f"Gemini session ended for {session_id}")

            except Exception as e:
                error_msg = f"Failed to connect to Gemini: {e!s}"
                logger.exception(f"[{session_id}] Connection error: {error_msg}")
                await websocket.send_text(
                    json.dumps({"type": "error", "message": f"❌ {error_msg}"})
                )
                return

        except Exception as e:
            logger.error(
                f"Error initializing Gemini session for {session_id}: {e}",
                exc_info=True,
            )
            try:
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "error",
                            "message": f"Failed to initialize AI service: {e!s}",
                        }
                    )
                )
            except Exception:
                pass
            raise

    async def _handle_websocket_messages(
        self, websocket: WebSocket, gemini_session: Any, session: Dict[str, Any]
    ) -> None:
        """Forward messages from client to Gemini Live API."""
        session_id = session["session_id"]
        
        try:
            while True:
                try:
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    message_type = message.get("type", "unknown")

                    if message_type not in ["audio_data"]:
                        logger.debug(f"[{session_id}] Client -> Gemini: {message_type}")

                    # --- Audio data ---
                    if message_type == "audio_data":
                        audio_base64 = message["data"]
                        audio_bytes = base64.b64decode(audio_base64)
                        
                        # Use the specific SDK method for realtime audio input
                        await gemini_session.send_realtime_input(
                            audio=types.Blob(mime_type=f"audio/pcm;rate={INPUT_SAMPLE_RATE}", data=audio_bytes)
                        )
                        continue

                    # --- recording_stopped: Gemini uses VAD automatically ---
                    if message_type == "recording_stopped":
                        logger.debug(f"[{session_id}] recording_stopped — Gemini uses auto VAD, ignoring")
                        continue

                    # --- config_update: update local config ---
                    if message_type == "config_update":
                        config_data = message.get("data", {})
                        session["config"].update(config_data)
                        logger.info(f"[{session_id}] Config updated: {config_data}")
                        continue

                    # --- response.cancel: Gemini uses VAD for interruption, just log it ---
                    if message_type == "response.cancel":
                        logger.debug(f"[{session_id}] response.cancel — Gemini handles interruption via VAD, ignoring")
                        continue

                    # --- Image message ---
                    if message_type == "conversation.item.create":
                        item = message.get("item", {})
                        content = item.get("content", [])
                        has_image = any(
                            c.get("type") == "input_image"
                            for c in content
                            if isinstance(c, dict)
                        )
                        if has_image:
                            logger.info(f"[{session_id}] 📸 Received image from client")
                            for c in content:
                                if isinstance(c, dict) and c.get("type") == "input_image":
                                    image_data = c.get("image_url", "")
                                    data_url = image_data if isinstance(image_data, str) else image_data.get("url", "")
                                    if "," in data_url:
                                        b64_data = data_url.split(",", 1)[1]
                                        mime_type = data_url.split(";")[0].replace("data:", "")
                                    else:
                                        b64_data = data_url
                                        mime_type = "image/jpeg"
                                    
                                    img_bytes = base64.b64decode(b64_data)
                                    # Use the specific SDK method for realtime image input
                                    await gemini_session.send_realtime_input(
                                        media=types.Blob(mime_type=mime_type, data=img_bytes)
                                    )
                        continue

                    # Unknown types
                    logger.warning(f"[{session_id}] Ignoring unknown message type: {message_type}")

                except json.JSONDecodeError as e:
                    logger.exception(f"[{session_id}] Invalid JSON from client: {e}")
                except WebSocketDisconnect:
                    logger.info(f"[{session_id}] Client disconnected")
                    break

        except Exception as e:
            logger.exception(f"[{session_id}] Critical error in client message handler: {e}")
            raise

    async def _safe_send(self, websocket: WebSocket, data: str) -> bool:
        """Send text on WebSocket, suppressing errors if already closed."""
        try:
            await websocket.send_text(data)
            return True
        except (RuntimeError, WebSocketDisconnect):
            return False

    async def _handle_gemini_responses(
        self, websocket: WebSocket, gemini_session: Any, session: Dict[str, Any]
    ) -> None:
        """Handle responses from Gemini Live API."""
        session_id = session["session_id"]
        
        try:
            while True:
                async for response in gemini_session.receive():
                    try:
                        server_content = response.server_content if hasattr(response, "server_content") else None
                        
                        if server_content:
                            if getattr(server_content, "interrupted", False):
                                logger.info(f"[{session_id}] 🎙️ User speech interrupted AI")
                                await self._safe_send(websocket, json.dumps({"type": "interrupted", "message": "User started speaking"}))
                                continue

                            model_turn = getattr(server_content, "model_turn", None)
                            if model_turn:
                                for part in getattr(model_turn, "parts", []):
                                    if getattr(part, "inline_data", None):
                                        audio_bytes = part.inline_data.data
                                        audio_b64 = base64.b64encode(audio_bytes).decode('ascii')
                                        await self._safe_send(websocket, json.dumps({
                                            "type": "audio_response",
                                            "data": audio_b64,
                                            "mime_type": "audio/pcm;rate=24000",
                                            "sample_rate": 24000,
                                            "channels": 1,
                                        }))

                            input_transcript = getattr(server_content, "input_transcription", None)
                            if input_transcript and getattr(input_transcript, "text", ""):
                                transcript = getattr(input_transcript, "text")
                                logger.info(f"[{session_id}] User said: '{transcript}'")
                                await self._safe_send(websocket, json.dumps({"type": "user_transcription", "content": transcript}))
                            
                            output_transcript = getattr(server_content, "output_transcription", None)
                            if output_transcript and getattr(output_transcript, "text", ""):
                                ai_text = getattr(output_transcript, "text")
                                logger.debug(f"[{session_id}] AI said: '{ai_text}'")
                                await self._safe_send(websocket, json.dumps({"type": "ai_transcription", "content": ai_text}))

                            if getattr(server_content, "turn_complete", False):
                                await self._safe_send(websocket, json.dumps({"type": "response.done"}))

                        # In case the SDK parses as pure dicts occasionally
                        elif isinstance(response, dict) and "serverContent" in response:
                            server_content = response["serverContent"]
                            
                            if server_content.get("interrupted"):
                                await self._safe_send(websocket, json.dumps({"type": "interrupted", "message": "User started speaking"}))
                                continue
                                
                            if "modelTurn" in server_content:
                                for part in server_content["modelTurn"].get("parts", []):
                                    if "inlineData" in part:
                                        audio_b64 = part["inlineData"]["data"]
                                        await self._safe_send(websocket, json.dumps({
                                            "type": "audio_response",
                                            "data": audio_b64,
                                            "mime_type": "audio/pcm;rate=24000",
                                            "sample_rate": 24000,
                                            "channels": 1,
                                        }))

                            if server_content.get("turnComplete"):
                                await self._safe_send(websocket, json.dumps({"type": "response.done"}))

                        tool_call = getattr(response, "tool_call", None)
                        if tool_call is None and isinstance(response, dict):
                            tool_call = response.get("toolCall")

                        if tool_call:
                            await self._handle_tool_call(gemini_session, websocket, session, tool_call)

                    except WebSocketDisconnect:
                        logger.info(f"[{session_id}] Client WebSocket disconnected")
                        break
                    except Exception as e:
                        logger.exception(f"[{session_id}] Error handling Gemini response: {e}")

        except Exception as e:
            logger.exception(f"[{session_id}] Critical error in Gemini response handler: {e}")
            await self._safe_send(websocket, json.dumps(
                    {
                        "type": "error",
                        "message": "🔌 AI service connection lost.",
                        "error": str(e),
                    }
                )
            )


    async def _handle_tool_call(
        self, gemini_session: Any, websocket: WebSocket, session: Dict[str, Any], tool_call: Any
    ) -> None:
        """Handle Gemini tool call requests and send results back."""
        session_id = session["session_id"]
        function_responses = []

        is_dict = isinstance(tool_call, dict)
        function_calls = tool_call.get("functionCalls", []) if is_dict else getattr(tool_call, "function_calls", [])

        for fc in function_calls:
            call_id = fc.get("id", "") if isinstance(fc, dict) else getattr(fc, "id", "")
            name = fc.get("name", "") if isinstance(fc, dict) else getattr(fc, "name", "")
            arguments = fc.get("args", {}) if isinstance(fc, dict) else getattr(fc, "args", {})

            logger.info(f"[{session_id}] 🔧 Handling function call: {name}")

            try:
                result = execute_whiteboard_tool(name, arguments)
            except Exception as e:
                logger.exception(f"[{session_id}] Error executing tool {name}: {e}")
                result = {"success": False, "error": str(e)}

            # Send UI update to client if tool execution was successful
            if result.get("success"):
                if "element" in result:
                    element = result["element"]
                    if element.get("type") == "pure_text":
                        ui_update = {"type": "whiteboard.add_pure_text", "data": element}
                    elif element.get("type") == "shape_with_text":
                        ui_update = {"type": "whiteboard.add_shape", "data": element}
                    elif element.get("type") == "undo_action":
                        ui_update = {"type": "whiteboard.undo_action", "data": element}
                    elif element.get("type") == "svg_image":
                        ui_update = {"type": "whiteboard.add_svg", "data": element}
                    else:
                        ui_update = {"type": "whiteboard.add_element", "data": element}
                    logger.info(f"Sending UI update to client: {ui_update['type']}")
                    await websocket.send_text(json.dumps(ui_update))
                elif "text_element" in result:
                    ui_update = {"type": "whiteboard.add_text", "data": result["text_element"]}
                    logger.info(f"Sending UI update to client: {ui_update['type']}")
                    await websocket.send_text(json.dumps(ui_update))

            function_responses.append(
                types.FunctionResponse(
                    id=call_id,
                    name=name,
                    response={"result": result}
                )
            )

        if function_responses:
            # Use the specific SDK method for tool responses
            await gemini_session.send_tool_response(
                function_responses=function_responses
            )
            logger.info(f"[{session_id}] ✅ Sent {len(function_responses)} tool response(s) to Gemini")


# Initialize voice chat service
voice_chat_service = VoiceChatService()
