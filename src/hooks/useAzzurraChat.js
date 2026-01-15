// src/hooks/useAzzurraChat.js
// Hook per gestire la chat vocale/testuale senza HeyGen

import { useState, useRef, useCallback, useEffect } from 'react';

export function useAzzurraChat() {
  // Stati
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [discussedRecipes, setDiscussedRecipes] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const currentAudioRef = useRef(null);
  const streamRef = useRef(null);

  // Messaggio di benvenuto
  const WELCOME_MESSAGE = "Ciao sono Azzurra, l'avatar digitale di ECI, l'enciclopedia della Cucina Italiana, messo a punto da CREA, l'ente Italiano di ricerca sull'agroalimentare, con gli esperti di FIB per accompagnarti nell'affascinante mondo dell'alimentazione italiana. Oggi si parte per un viaggio all'insegna della dolcezza! Iniziamo!";

  // Inizializza la sessione chat
  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Richiedi permesso microfono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Inizializza AudioContext per playback
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

      setIsReady(true);
      setIsLoading(false);

      // Pronuncia messaggio di benvenuto
      await speakText(WELCOME_MESSAGE);

      // Aggiungi a history
      setConversationHistory([{ role: 'assistant', content: WELCOME_MESSAGE }]);

    } catch (err) {
      console.error('Initialization error:', err);
      setError('Impossibile accedere al microfono. Verifica i permessi del browser.');
      setIsLoading(false);
    }
  }, []);

  // Genera audio TTS e riproducilo
  const speakText = useCallback(async (text) => {
    if (!text) return;

    setIsTalking(true);
    setCurrentMessage(text);

    try {
      // Chiama endpoint TTS
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const { audio } = await response.json();

      // Decodifica Base64 PCM e riproduci
      await playPCMAudio(audio);

    } catch (err) {
      console.error('TTS error:', err);
      setError('Errore nella sintesi vocale');
    } finally {
      setIsTalking(false);
      setCurrentMessage('');
    }
  }, []);

  // Riproduci audio PCM (formato OpenAI TTS)
  const playPCMAudio = useCallback(async (base64Audio) => {
    return new Promise((resolve, reject) => {
      try {
        // Decodifica Base64
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // PCM 24kHz, 16-bit, mono -> Float32
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768.0;
        }

        // Crea AudioBuffer
        const audioContext = audioContextRef.current;
        const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);

        // Riproduci
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        currentAudioRef.current = source;

        source.onended = () => {
          currentAudioRef.current = null;
          resolve();
        };

        source.start(0);

      } catch (err) {
        reject(err);
      }
    });
  }, []);

  // Ferma audio in riproduzione
  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.stop();
      } catch (e) {
        // Ignora errori se già fermato
      }
      currentAudioRef.current = null;
      setIsTalking(false);
    }
  }, []);

  // Avvia registrazione vocale
  const startListening = useCallback(async () => {
    if (!streamRef.current || isListening) return;

    // Ferma eventuale audio in riproduzione
    stopAudio();

    audioChunksRef.current = [];

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);

    } catch (err) {
      console.error('Recording error:', err);
      setError('Errore nella registrazione audio');
    }
  }, [isListening, stopAudio]);

  // Ferma registrazione vocale
  const stopListening = useCallback(() => {
    if (!mediaRecorderRef.current || !isListening) return;

    mediaRecorderRef.current.stop();
    setIsListening(false);
  }, [isListening]);

  // Processa audio registrato con Whisper STT
  const processAudio = useCallback(async (audioBlob) => {
    setIsProcessing(true);

    try {
      // Converti blob in Base64
      const reader = new FileReader();
      const base64Audio = await new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Chiama endpoint STT
      const sttResponse = await fetch('/api/stt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64Audio })
      });

      if (!sttResponse.ok) {
        throw new Error('STT request failed');
      }

      const { text } = await sttResponse.json();

      if (text && text.trim().length > 0) {
        console.log('Trascrizione:', text);
        await sendMessage(text.trim());
      }

    } catch (err) {
      console.error('Audio processing error:', err);
      setError('Errore nel riconoscimento vocale');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Invia messaggio testuale a Claude
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    setIsProcessing(true);

    // Aggiungi messaggio utente alla history
    const userMessage = { role: 'user', content: text };
    setConversationHistory(prev => [...prev, userMessage]);

    try {
      // Chiama endpoint chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: conversationHistory
        })
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();
      const reply = data.reply;

      // Traccia ricette discusse
      if (data.recipeTitles && data.recipeTitles.length > 0) {
        setDiscussedRecipes(prev => {
          const newSet = new Set([...prev, ...data.recipeTitles]);
          return [...newSet];
        });
      }

      setIsProcessing(false);

      // Pronuncia la risposta (currentMessage sarà visibile durante il parlato)
      await speakText(reply);

      // Aggiungi risposta alla history DOPO aver finito di parlare
      // Così evitiamo duplicazione visiva
      const assistantMessage = { role: 'assistant', content: reply };
      setConversationHistory(prev => [...prev, assistantMessage]);

    } catch (err) {
      console.error('Chat error:', err);
      setError('Errore nella comunicazione con Azzurra');
      setIsProcessing(false);

      // Messaggio di fallback
      await speakText("Scusami, non ho capito bene. Puoi ripetere?");
    }
  }, [conversationHistory, speakText]);

  // Disconnetti e pulisci risorse
  const disconnect = useCallback(() => {
    // Ferma registrazione
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
    }

    // Ferma audio
    stopAudio();

    // Chiudi stream microfono
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Chiudi AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsReady(false);
    setIsListening(false);
    setIsTalking(false);
  }, [isListening, stopAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    // Stati
    isLoading,
    isReady,
    isTalking,
    isListening,
    isProcessing,
    error,
    conversationHistory,
    discussedRecipes,
    currentMessage,

    // Azioni
    initialize,
    startListening,
    stopListening,
    sendMessage,
    stopAudio,
    disconnect
  };
}

export default useAzzurraChat;
