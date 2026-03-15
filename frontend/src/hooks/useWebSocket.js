import { useState, useRef, useCallback, useEffect } from 'react';
import { supabaseStorage } from '@/utils/supabaseStorage';

export const useWebSocket = (onWhiteboardMessage) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Disconnected');

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingAudioRef = useRef(false);
  const sessionIdRef = useRef(null);
  const lastImageSentTimeRef = useRef(0);
  const captureImageCallbackRef = useRef(null);
  const audioSourcesRef = useRef([]);
  const nextStartTimeRef = useRef(0);

  // Stop all audio playback
  const stopAllAudio = useCallback(() => {
    console.log('🔇 Stopping all audio playback');

    // Stop all audio sources
    audioSourcesRef.current.forEach(source => {
      try {
        if (source && source.stop) {
          source.stop();
        }
      } catch (error) {
        console.warn('⚠️ Error stopping audio source:', error);
      }
    });

    // Clear the audio sources array
    audioSourcesRef.current = [];

    // Clear the audio queue
    audioQueueRef.current = [];

    // Reset playing flag
    isPlayingAudioRef.current = false;
  }, []);

  // Audio conversion utility
  const floatTo16BitPCM = useCallback((float32Array) => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Uint8Array(buffer);
  }, []);

  // Audio playback
  const processAudioQueue = useCallback(async () => {
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingAudioRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const base64Audio = audioQueueRef.current.shift();

      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 24000
          });
          nextStartTimeRef.current = 0;
        }

        // Decode base64 to PCM16 data
        const binaryString = atob(base64Audio);
        const pcm16Data = new Int16Array(binaryString.length / 2);

        for (let i = 0; i < pcm16Data.length; i++) {
          const byte1 = binaryString.charCodeAt(i * 2);
          const byte2 = binaryString.charCodeAt(i * 2 + 1);
          pcm16Data[i] = byte1 | (byte2 << 8);
        }

        // Create AudioBuffer from PCM16 data
        const audioBuffer = audioContextRef.current.createBuffer(1, pcm16Data.length, 24000);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < pcm16Data.length; i++) {
          channelData[i] = pcm16Data[i] / 32768;
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        const now = audioContextRef.current.currentTime;
        nextStartTimeRef.current = Math.max(now, nextStartTimeRef.current || now);
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;

        // Track this audio source
        audioSourcesRef.current.push(source);

        source.onended = () => {
          // Remove this source from the array
          const index = audioSourcesRef.current.indexOf(source);
          if (index > -1) {
            audioSourcesRef.current.splice(index, 1);
          }
        };

      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
    isPlayingAudioRef.current = false;
  }, []);

  // WebSocket message handler
  const handleMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);

      // Log all message types with details
      console.log('📥 Received WebSocket message:', {
        type: message.type,
        hasAudioDelta: !!message.delta,
        audioSize: message.delta ? message.delta.length : 0,
        fullMessage: message
      });

      switch (message.type) {
        case 'connection_opened':
          setStatus('Connected to AI service');
          console.log('✅ Connection opened:', message.message);
          break;
        case 'openai_initialized':
          setStatus('AI ready');
          console.log('✅ OpenAI initialized:', message.message);
          break;
        case 'session.created':
          setStatus('Session created successfully');
          console.log('✅ AI session created successfully');
          break;
        case 'response.audio.delta':
          if (message.delta) {
            audioQueueRef.current.push(message.delta);
            console.log(`🔊 Received audio delta, queue length: ${audioQueueRef.current.length}`);
            processAudioQueue();
          }
          break;
        case 'audio_response':
          if (message.data) {
            audioQueueRef.current.push(message.data);
            console.log(`🔊 Received audio response, queue length: ${audioQueueRef.current.length}`);
            processAudioQueue();
          }
          break;
        case 'response.audio.done':
        case 'response.done':
          setStatus('Response complete');
          console.log('✅ AI response complete');
          break;
        case 'user_transcription':
          console.log('🗣️ User said:', message.content);
          break;
        case 'ai_transcription':
          console.log('🤖 AI said:', message.content);
          break;
        case 'whiteboard.add_text':
        case 'whiteboard.add_pure_text':
        case 'whiteboard.add_shape':
        case 'whiteboard.add_svg':
        case 'whiteboard.undo_action':
          // Handle whiteboard element addition/actions from AI
          console.log('📝 Whiteboard update received:', message.type, message.data);
          if (onWhiteboardMessage) {
            onWhiteboardMessage(message);
          }
          break;
        case 'interrupted':
          console.log('🛑 Model interrupted by user speech');
          // Stop any playing audio immediately
          stopAllAudio();

          // Capture whiteboard image when user starts speaking
          const currentTime = Date.now();
          const timeSinceLastImage = currentTime - lastImageSentTimeRef.current;

          if (timeSinceLastImage > 5000) {
            console.log('📸 Capturing whiteboard triggered by user speech');
            if (captureImageCallbackRef.current) {
              captureImageCallbackRef.current();
            }
          } else {
            console.log(`⏸️ Skipping capture - only ${Math.round(timeSinceLastImage / 1000)}s since last capture`);
          }
          break;
        case 'error':
          const errorMsg = `Error: ${message.error?.message || message.message || 'Unknown error'}`;
          setStatus(errorMsg);
          console.error('❌ WebSocket error:', message.error || message);
          break;
        default:
          console.log('🔄 Unhandled message type:', message.type);
          break;
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error, 'Raw data:', event.data);
    }
  }, [processAudioQueue, onWhiteboardMessage, stopAllAudio]);

  // Cleanup function
  const cleanup = useCallback(() => {
    setIsRecording(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    audioQueueRef.current = [];
    audioSourcesRef.current = [];
    isPlayingAudioRef.current = false;
    setIsConnected(false);
    sessionIdRef.current = null; // Reset session ID on disconnect
  }, []);

  // Initialize audio streaming using AudioWorklet for low-latency capture
  const initializeAudio = useCallback(async () => {
    try {
      // Immediately stop any playing audio when user starts recording
      stopAllAudio();
      console.log('🎤 User starting to record - stopped model audio');

      // Send interruption signal to server (response.cancel)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'response.cancel'
        }));
        console.log('📤 Sent response.cancel to interrupt AI');
      }

      // Check for HTTPS requirement
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access requires HTTPS. Please visit https://localhost:8000 (accept security warning for self-signed cert).');
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      streamRef.current = stream;

      // Create audio context at 16kHz for capture
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Load AudioWorklet for off-main-thread processing
      await audioContext.audioWorklet.addModule('/capture-worklet.js');
      const workletNode = new AudioWorkletNode(audioContext, 'capture-processor');

      let audioChunkCount = 0;
      workletNode.port.onmessage = (event) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const pcm16Buffer = event.data; // ArrayBuffer of Int16 PCM
          const uint8View = new Uint8Array(pcm16Buffer);

          // Convert to base64
          let binary = '';
          for (let i = 0; i < uint8View.length; i++) {
            binary += String.fromCharCode(uint8View[i]);
          }
          const base64Audio = btoa(binary);

          wsRef.current.send(JSON.stringify({
            type: 'audio_data',
            data: base64Audio
          }));

          // Log every 100th audio chunk to avoid spam
          audioChunkCount++;
          if (audioChunkCount % 100 === 0) {
            console.log(`🎤 Sent audio chunk #${audioChunkCount}, size: ${base64Audio.length} chars`);
          }
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      setIsRecording(true);
      setStatus('Recording... Speak now!');
      return true;

    } catch (error) {
      setStatus('Failed to access microphone');
      console.error('Audio initialization error:', error);
      return false;
    }
  }, [floatTo16BitPCM, stopAllAudio]);

  // Generate session ID
  const generateSessionId = useCallback(() => {
    return 'session_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now();
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      // Generate new session ID if not exists
      if (!sessionIdRef.current) {
        sessionIdRef.current = generateSessionId();
      }

      // Connect to Python backend
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const backendHost = window.location.host; // Uses current domain and port (if any)
      const ws = new WebSocket(`${protocol}//${backendHost}/ws/${sessionIdRef.current}`);

      wsRef.current = ws;

      ws.onopen = async () => {
        setIsConnected(true);
        setStatus('Connected to server');
        console.log('✅ WebSocket connected to:', `wss://${backendHost}/ws/${sessionIdRef.current}`);

        // Send initial whiteboard image when session starts
        if (captureImageCallbackRef.current) {
          console.log('📸 Sending initial whiteboard image');
          captureImageCallbackRef.current();
        }

        // Automatically start audio streaming when connected (like index.html)
        await initializeAudio();
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        setIsConnected(false);
        setStatus('Disconnected from server');
        setIsRecording(false);
        console.log('🔌 WebSocket disconnected:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        cleanup();
      };

      ws.onerror = (error) => {
        setStatus('WebSocket error');
        console.error('❌ WebSocket connection error:', error);
        console.log('🔍 Trying to connect to:', `wss://${backendHost}/ws`);
      };

    } catch (error) {
      setStatus('Failed to connect');
      console.error('Connection error:', error);
    }
  }, [handleMessage, cleanup, initializeAudio]);

  // Start recording (creates session and connects to WebSocket)
  const startRecording = useCallback(async () => {
    try {
      // Create session in Supabase when user starts recording
      const supabaseSessionId = await supabaseStorage.createSession();
      console.log('📝 Created Supabase session:', supabaseSessionId);

      if (!isConnected) {
        await connect();
      }
      return true;
    } catch (error) {
      console.error('Error creating session:', error);
      // Continue with connection even if session creation fails
      if (!isConnected) {
        await connect();
      }
      return true;
    }
  }, [isConnected, connect]);

  // Stop recording (disconnects and cleans up)
  const stopRecording = useCallback(() => {
    cleanup();
    setStatus('Disconnected');
  }, [cleanup]);

  // Send image to AI
  const sendImage = useCallback((base64Data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const imageMessage = {
        type: 'conversation.item.create',
        previous_item_id: null,
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: `data:image/png;base64,${base64Data}`
            }
          ]
        }
      };

      wsRef.current.send(JSON.stringify(imageMessage));
      console.log('🖼️ Image sent to AI:', {
        imageSize: base64Data.length,
        messageType: imageMessage.type
      });

      // Update last image sent time
      lastImageSentTimeRef.current = Date.now();
      return true;
    } else {
      console.log('❌ Cannot send image - WebSocket not connected');
      return false;
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    cleanup();
    setStatus('Disconnected');
  }, [cleanup]);

  // Register capture callback
  const registerCaptureCallback = useCallback((callback) => {
    captureImageCallbackRef.current = callback;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    isConnected,
    isRecording,
    status,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendImage,
    registerCaptureCallback
  };
};
