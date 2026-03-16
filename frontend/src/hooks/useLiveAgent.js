import { useState, useRef, useCallback } from 'react';

const WS_URL = 'ws://127.0.0.1:8080/ws/live';

export function useLiveAgent(videoRef) {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [generatedImages, setGeneratedImages] = useState([]);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const videoIntervalRef = useRef(null);
  const playbackQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  // ── Connect ────────────────────────────────────────────
  const connect = useCallback(async () => {
    setError(null);
    setTranscript('');
    setGeneratedImages([]);

    // 1. Open WebSocket
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'text':
            setTranscript(prev => prev + msg.data);
            break;

          case 'audio':
            queueAudioPlayback(msg.data);
            break;

          case 'image_result':
            setGeneratedImages(prev => [
              ...prev,
              { url: msg.url, label: msg.label },
            ]);
            break;

          case 'session_id':
            setSessionId(msg.data);
            break;

          case 'error':
            setError(msg.message || 'An error occurred.');
            break;

          default:
            break;
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection error. Is the backend running on port 8080?');
    };

    ws.onclose = () => {
      setIsConnected(false);
      cleanup();
    };

    // 2. Setup Mic & Camera
    try {
      console.log('Requesting media devices...');
      const constraints = {
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
        video: { width: { ideal: 640 }, height: { ideal: 480 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Media stream obtained:', stream.id);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure it plays
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.error("Video play failed:", e));
        };
      }

      // 3. Audio capture → PCM 16kHz mono
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const audioData = e.inputBuffer.getChannelData(0);
          wsRef.current.send(
            JSON.stringify({ type: 'audio', data: floatTo16BitBase64(audioData) })
          );
        }
      };

      // 4. Camera frame streaming — 1 fps
      videoIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && videoRef.current && videoRef.current.readyState >= 2) {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const base64Img = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
            wsRef.current.send(JSON.stringify({ type: 'image', data: base64Img }));
          }
        }
      }, 1000);

    } catch (err) {
      console.error('Media access error:', err);
      let errorMsg = 'Could not access camera/mic. ';
      if (err.name === 'NotAllowedError') errorMsg += 'Permission denied.';
      else if (err.name === 'NotFoundError') errorMsg += 'No device found.';
      else if (err.name === 'NotReadableError') errorMsg += 'Device is already in use.';
      else errorMsg += err.message;
      
      setError(errorMsg);
      if (wsRef.current) wsRef.current.close();
    }
  }, [videoRef]);

  // ── Send text message ──────────────────────────────────
  const sendTextMessage = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && text) {
      wsRef.current.send(JSON.stringify({ type: 'text', data: text }));
      setTranscript(prev => prev + `\n\n📝 You: ${text}\n\n`);
    }
  }, []);

  // ── Disconnect ─────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsConnected(false);
    cleanup();
  }, []);

  // ── Cleanup resources ──────────────────────────────────
  const cleanup = () => {
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (_) { /* noop */ }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
  };

  // ── Audio playback (queued to prevent overlapping) ─────
  const queueAudioPlayback = (base64Data) => {
    playbackQueueRef.current.push(base64Data);
    if (!isPlayingRef.current) {
      playNext();
    }
  };

  const playNext = () => {
    if (playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    const data = playbackQueueRef.current.shift();
    playAudioChunk(data);
  };

  const playAudioChunk = (base64Data) => {
    if (!audioContextRef.current) {
      isPlayingRef.current = false;
      return;
    }

    try {
      const binaryStr = window.atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, 16000);
      audioBuffer.getChannelData(0).set(float32);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => playNext();
      source.start();
    } catch (e) {
      console.error('Audio playback error:', e);
      playNext();
    }
  };

  // ── Float32 → 16-bit PCM → Base64 ─────────────────────
  const floatTo16BitBase64 = (float32Array) => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  return {
    isConnected,
    connect,
    disconnect,
    transcript,
    generatedImages,
    sendTextMessage,
    error,
    sessionId,
  };
}
