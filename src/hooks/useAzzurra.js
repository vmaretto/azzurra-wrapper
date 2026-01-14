// src/hooks/useAzzurra.js
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  LiveAvatarSession,
  SessionEvent,
  SessionState
} from '@heygen/liveavatar-web-sdk';

export function useAzzurra() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const [mediaElement, setMediaElement] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  const sessionRef = useRef(null);
  const welcomeSentRef = useRef(false);
  const recognitionRef = useRef(null);
  const isProcessingRef = useRef(false);
  const conversationHistoryRef = useRef([]);

  // Messaggio di benvenuto
  const WELCOME_MESSAGE = "Ciao sono Azzurra, l'avatar digitale di ECI, l'enciclopedia della Cucina Italiana, messo a punto da CREA, l'ente Italiano di ricerca sull'agroalimentare, con gli esperti di FIB per accompagnarti nell'affascinante mondo dell'alimentazione italiana. Oggi si parte per un viaggio all'insegna della dolcezza! Iniziamo!";

  // Sync conversationHistory to ref for use in callbacks
  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);

  // Genera audio TTS e fai parlare l'avatar
  const speakWithTTS = async (session, text) => {
    try {
      console.log('Generating TTS for:', text.substring(0, 50) + '...');
      setIsTalking(true);

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
      console.log('TTS audio received, sending to avatar');

      // Invia audio all'avatar
      session.repeatAudio(audio);
      console.log('Audio sent to avatar');
    } catch (err) {
      console.error('TTS/Speech error:', err);
      setIsTalking(false);
      throw err;
    }
  };

  // Processa il messaggio utente e genera risposta
  const processUserMessage = async (userMessage) => {
    if (!sessionRef.current || isProcessingRef.current) return;
    if (!userMessage || userMessage.length < 3) {
      console.log('Message too short, ignoring');
      return;
    }

    console.log('Processing user message:', userMessage);
    isProcessingRef.current = true;

    // Aggiorna history
    setConversationHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Ottieni risposta da Claude
      const reply = await getChatResponse(userMessage);
      console.log('Claude reply:', reply);

      // Aggiorna history
      setConversationHistory(prev => [...prev, { role: 'assistant', content: reply }]);

      // Fai parlare Azzurra con TTS
      await speakWithTTS(sessionRef.current, reply);
    } catch (err) {
      console.error('Error getting response:', err);
      try {
        await speakWithTTS(sessionRef.current, "Scusami, non ho capito bene. Puoi ripetere?");
      } catch (fallbackErr) {
        console.error('Error sending fallback:', fallbackErr);
      }
    } finally {
      isProcessingRef.current = false;
      setIsTalking(false);
    }
  };

  // Configura Web Speech API per riconoscimento vocale
  const setupSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Web Speech API not supported');
      setError('Il tuo browser non supporta il riconoscimento vocale');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
      // Riavvia automaticamente se non mutato e connesso
      if (!isMuted && sessionRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log('Recognition restart skipped:', e.message);
        }
      }
    };

    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.trim();
      console.log('Transcript:', transcript);

      if (transcript) {
        processUserMessage(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError('Errore riconoscimento vocale: ' + event.error);
      }
    };

    return recognition;
  };

  // Ottieni session token da LiveAvatar via backend
  const getSessionToken = async () => {
    const response = await fetch('/api/liveavatar-session', { method: 'POST' });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.sessionToken;
  };

  // Invia messaggio a Claude e ricevi risposta
  const getChatResponse = async (message) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationHistory: conversationHistoryRef.current })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.reply;
  };

  // Inizializza la sessione avatar (CUSTOM mode)
  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sessionToken = await getSessionToken();

      // Crea sessione LiveAvatar in CUSTOM mode (no voice chat SDK)
      sessionRef.current = new LiveAvatarSession(sessionToken);

      const session = sessionRef.current;
      welcomeSentRef.current = false;

      // Event listeners - Sessione
      session.on(SessionEvent.SESSION_STATE_CHANGED, (state) => {
        console.log('Session state changed:', state);
        if (state === SessionState.CONNECTED) {
          setIsConnected(true);
          setIsLoading(false);
        } else if (state === SessionState.DISCONNECTED) {
          setIsConnected(false);
        }
      });

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        console.log('Stream ready');
        // Invia messaggio di benvenuto quando lo stream è pronto
        if (!welcomeSentRef.current) {
          welcomeSentRef.current = true;
          setTimeout(async () => {
            console.log('Sending welcome message');
            try {
              await speakWithTTS(session, WELCOME_MESSAGE);
              console.log('Welcome message sent successfully');
            } catch (err) {
              console.error('Error sending welcome message:', err);
            }
          }, 1000);
        }
      });

      session.on(SessionEvent.SESSION_DISCONNECTED, (reason) => {
        console.log('Session disconnected:', reason);
        setIsConnected(false);
      });

      // Avvia sessione
      await session.start();

    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, []);

  // Collega il video element alla sessione
  const attachVideo = useCallback((videoElement) => {
    if (sessionRef.current && videoElement) {
      sessionRef.current.attach(videoElement);
      setMediaElement(videoElement);
    }
  }, []);

  // Avvia voice chat (Web Speech API)
  const startVoiceChat = useCallback(async () => {
    if (!sessionRef.current || !isConnected) return;

    try {
      // Inizializza Web Speech API se non già fatto
      if (!recognitionRef.current) {
        recognitionRef.current = setupSpeechRecognition();
      }

      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsMuted(false);
        console.log('Voice chat started (Web Speech API)');
      }
    } catch (err) {
      console.error('Voice chat error:', err);
      setError(err.message);
    }
  }, [isConnected]);

  // Ferma voice chat
  const stopVoiceChat = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    console.log('Voice chat stopped');
  }, []);

  // Invia messaggio testuale
  const sendMessage = useCallback(async (text) => {
    if (!sessionRef.current || !isConnected || !text.trim()) return;

    // Aggiorna history
    setConversationHistory(prev => [...prev, { role: 'user', content: text }]);

    try {
      const reply = await getChatResponse(text);

      // Aggiorna history
      setConversationHistory(prev => [...prev, { role: 'assistant', content: reply }]);

      // Fai parlare Azzurra con TTS + repeatAudio
      await speakWithTTS(sessionRef.current, reply);
    } catch (err) {
      console.error('Send message error:', err);
      setError(err.message);
    }
  }, [isConnected]);

  // Interrompi avatar
  const interrupt = useCallback(() => {
    if (!sessionRef.current) return;
    try {
      sessionRef.current.interrupt();
    } catch (err) {
      console.error('Interrupt error:', err);
    }
  }, []);

  // Toggle mute microfono (Web Speech API)
  const toggleMute = useCallback(() => {
    if (!isConnected) return;

    if (isMuted) {
      // Unmute: riavvia recognition
      if (!recognitionRef.current) {
        recognitionRef.current = setupSpeechRecognition();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsMuted(false);
          console.log('Microphone unmuted');
        } catch (e) {
          console.log('Already listening');
        }
      }
    } else {
      // Mute: ferma recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsMuted(true);
      setIsListening(false);
      console.log('Microphone muted');
    }
  }, [isConnected, isMuted]);

  // Disconnetti
  const disconnect = useCallback(async () => {
    // Ferma Web Speech API
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (!sessionRef.current) return;

    try {
      await sessionRef.current.stop();
      sessionRef.current = null;
      setIsConnected(false);
      setIsListening(false);
      setIsMuted(false);
      setMediaElement(null);
      setConversationHistory([]);
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (sessionRef.current) {
        sessionRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return {
    // State
    isLoading,
    isConnected,
    isTalking,
    isListening,
    isMuted,
    error,
    mediaElement,
    conversationHistory,

    // Actions
    connect,
    disconnect,
    attachVideo,
    startVoiceChat,
    stopVoiceChat,
    sendMessage,
    interrupt,
    toggleMute
  };
}
