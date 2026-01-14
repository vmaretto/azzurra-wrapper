// src/hooks/useAzzurra.js
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  LiveAvatarSession,
  SessionEvent,
  SessionState,
  AgentEventsEnum
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
  const isProcessingRef = useRef(false);
  const isTalkingRef = useRef(false);
  const conversationHistoryRef = useRef([]);
  const transcriptionBufferRef = useRef('');
  const fallbackTimeoutRef = useRef(null);
  const processDelayRef = useRef(null);

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
      throw err;
    }
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

  // Inizializza la sessione avatar (FULL mode)
  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sessionToken = await getSessionToken();

      // Crea sessione LiveAvatar FULL mode con voice chat
      sessionRef.current = new LiveAvatarSession(sessionToken, {
        voiceChat: {
          defaultMuted: false
        }
      });

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
          setTimeout(() => {
            console.log('Sending welcome message');
            try {
              // FULL mode: usa repeat() con TTS integrato
              session.repeat(WELCOME_MESSAGE);
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

      // Event listeners - Avatar
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        console.log('🔊 Avatar inizia a parlare');
        isTalkingRef.current = true;
        setIsTalking(true);
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        console.log('🔇 Avatar ha finito di parlare');
        isTalkingRef.current = false;
        setIsTalking(false);

        // Se c'è qualcosa nel buffer, processa ora che avatar ha finito
        if (transcriptionBufferRef.current.length > 3) {
          console.log('📝 Buffer da processare dopo avatar:', transcriptionBufferRef.current);
          if (processDelayRef.current) {
            clearTimeout(processDelayRef.current);
          }
          processDelayRef.current = setTimeout(() => processBuffer(), 500);
        }
      });

      // Event listeners - Utente
      session.on(AgentEventsEnum.USER_SPEAK_STARTED, () => {
        console.log('User started talking');
        setIsListening(true);
      });

      // Funzione per processare il buffer con retry
      const processBuffer = async () => {
        // Cancella timeout fallback
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }

        // Copia atomica del buffer
        const message = transcriptionBufferRef.current;
        transcriptionBufferRef.current = '';

        if (!message || message.length < 3) {
          console.log('⏭️ Buffer vuoto o troppo corto, skip');
          return;
        }

        // Aspetta se avatar sta parlando
        if (isTalkingRef.current) {
          console.log('⏳ Avatar sta parlando, attendo...');
          transcriptionBufferRef.current = message;
          setTimeout(() => processBuffer(), 1000);
          return;
        }

        // Aspetta se stiamo già processando
        if (isProcessingRef.current) {
          console.log('⏳ Processing in corso, attendo...');
          transcriptionBufferRef.current = message;
          setTimeout(() => processBuffer(), 1000);
          return;
        }

        console.log('📥 DOMANDA RICEVUTA:', message);
        isProcessingRef.current = true;

        // Aggiorna history
        setConversationHistory(prev => [...prev, { role: 'user', content: message }]);

        try {
          // Ottieni risposta da Claude
          const reply = await getChatResponse(message);
          console.log('📤 RISPOSTA CLAUDE:', reply.substring(0, 100) + '...');

          // Aggiorna history
          setConversationHistory(prev => [...prev, { role: 'assistant', content: reply }]);

          // FULL mode: usa repeat() con TTS integrato
          console.log('🔊 Invio risposta all\'avatar');
          session.repeat(reply);
        } catch (err) {
          console.error('❌ Errore risposta:', err);
          try {
            session.repeat("Scusami, non ho capito bene. Puoi ripetere?");
          } catch (fallbackErr) {
            console.error('❌ Errore fallback:', fallbackErr);
          }
        } finally {
          isProcessingRef.current = false;
        }
      };

      // USER_SPEAK_ENDED: trigger veloce per processare
      session.on(AgentEventsEnum.USER_SPEAK_ENDED, () => {
        console.log('User stopped talking');
        setIsListening(false);

        // Delay 500ms prima di processare (aspetta ultime trascrizioni)
        if (processDelayRef.current) {
          clearTimeout(processDelayRef.current);
        }
        processDelayRef.current = setTimeout(() => {
          console.log('Processing after USER_SPEAK_ENDED delay');
          processBuffer();
        }, 500);
      });

      // USER_TRANSCRIPTION: accumula + gestisce timeout fallback
      session.on(AgentEventsEnum.USER_TRANSCRIPTION, (event) => {
        // INTERRUPT IMMEDIATO - cancella qualsiasi risposta LLM automatica
        try {
          session.interrupt();
        } catch (e) {
          // Ignora errori interrupt
        }

        const text = event.text || event.transcript;
        if (!text) return;

        console.log('🎤 Trascrizione:', text);

        // Accumula il testo nel buffer
        transcriptionBufferRef.current += ' ' + text;
        transcriptionBufferRef.current = transcriptionBufferRef.current.trim();
        console.log('📝 Buffer attuale:', transcriptionBufferRef.current);

        // Cancella processDelay se arriva nuova trascrizione (utente sta ancora parlando)
        if (processDelayRef.current) {
          clearTimeout(processDelayRef.current);
          processDelayRef.current = null;
        }

        // Reset fallback timeout (5s) - processa se USER_SPEAK_ENDED non arriva
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
        }
        fallbackTimeoutRef.current = setTimeout(() => {
          console.log('⏰ Fallback timeout (5s) - processo buffer');
          processBuffer();
        }, 5000);
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

  // Avvia voice chat (SDK FULL mode)
  const startVoiceChat = useCallback(async () => {
    if (!sessionRef.current || !isConnected) return;

    try {
      sessionRef.current.startListening();
      setIsMuted(false);
      console.log('Voice chat started');
    } catch (err) {
      console.error('Voice chat error:', err);
      setError(err.message);
    }
  }, [isConnected]);

  // Ferma voice chat
  const stopVoiceChat = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.stopListening();
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

      // FULL mode: usa repeat() con TTS integrato
      sessionRef.current.repeat(reply);
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

  // Toggle mute microfono
  const toggleMute = useCallback(() => {
    if (!sessionRef.current || !isConnected) return;

    if (isMuted) {
      sessionRef.current.startListening();
      setIsMuted(false);
      console.log('Microphone unmuted');
    } else {
      sessionRef.current.stopListening();
      setIsMuted(true);
      console.log('Microphone muted');
    }
  }, [isConnected, isMuted]);

  // Disconnetti
  const disconnect = useCallback(async () => {
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
