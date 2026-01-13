// src/hooks/useAzzurra.js
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  LiveAvatarSession,
  SessionEvent,
  SessionState,
  AgentEventsEnum,
  TaskType,
  TaskMode
} from '@heygen/liveavatar-web-sdk';

export function useAzzurra() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [mediaElement, setMediaElement] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  const sessionRef = useRef(null);
  const welcomeSentRef = useRef(false);

  // Messaggio di benvenuto
  const WELCOME_MESSAGE = "Ciao sono Azzurra, l'avatar digitale di ECI, l'enciclopedia della Cucina Italiana, messo a punto da CREA, l'ente Italiano di ricerca sull'agroalimentare, con gli esperti di FIB per accompagnarti nell'affascinante mondo dell'alimentazione italiana. Oggi si parte per un viaggio all'insegna della dolcezza! Iniziamo!";

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
      body: JSON.stringify({ message, conversationHistory })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.reply;
  };

  // Inizializza la sessione avatar
  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sessionToken = await getSessionToken();

      // Crea sessione LiveAvatar con voice chat abilitato
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
              // Usa speak con TaskType.REPEAT per far parlare l'avatar
              session.speak({
                text: WELCOME_MESSAGE,
                taskType: TaskType.REPEAT,
                taskMode: TaskMode.SYNC
              });
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

      // Event listeners - Agent (avatar e utente)
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        console.log('Avatar started talking');
        setIsTalking(true);
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        console.log('Avatar stopped talking');
        setIsTalking(false);
      });

      session.on(AgentEventsEnum.USER_SPEAK_STARTED, () => {
        console.log('User started talking');
        setIsListening(true);
      });

      session.on(AgentEventsEnum.USER_SPEAK_ENDED, () => {
        console.log('User stopped talking');
        setIsListening(false);
      });

      // Gestione trascrizione utente (da voice chat)
      session.on(AgentEventsEnum.USER_TRANSCRIPTION, async (event) => {
        console.log('USER_TRANSCRIPTION event received:', event);
        const userMessage = event.text || event.transcript;
        if (!userMessage) {
          console.log('No text in transcription event');
          return;
        }

        console.log('User message:', userMessage);

        // Aggiorna history
        setConversationHistory(prev => [...prev, { role: 'user', content: userMessage }]);

        try {
          // Ottieni risposta da Claude
          const reply = await getChatResponse(userMessage);
          console.log('Claude reply:', reply);

          // Aggiorna history
          setConversationHistory(prev => [...prev, { role: 'assistant', content: reply }]);

          // Fai parlare Azzurra con speak()
          try {
            session.speak({
              text: reply,
              taskType: TaskType.REPEAT,
              taskMode: TaskMode.SYNC
            });
            console.log('Reply sent to avatar');
          } catch (speakErr) {
            console.error('Error sending reply to avatar:', speakErr);
          }
        } catch (err) {
          console.error('Error getting response:', err);
          // Risposta di fallback
          try {
            session.speak({
              text: "Scusami, non ho capito bene. Puoi ripetere?",
              taskType: TaskType.REPEAT,
              taskMode: TaskMode.SYNC
            });
          } catch (fallbackErr) {
            console.error('Error sending fallback:', fallbackErr);
          }
        }
      });

      // Avvia sessione
      await session.start();

    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [conversationHistory]);

  // Collega il video element alla sessione
  const attachVideo = useCallback((videoElement) => {
    if (sessionRef.current && videoElement) {
      sessionRef.current.attach(videoElement);
      setMediaElement(videoElement);
    }
  }, []);

  // Avvia voice chat (inizia ad ascoltare)
  const startVoiceChat = useCallback(async () => {
    if (!sessionRef.current || !isConnected) return;

    try {
      sessionRef.current.startListening();
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

      // Fai parlare Azzurra con speak()
      sessionRef.current.speak({
        text: reply,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC
      });
    } catch (err) {
      console.error('Send message error:', err);
      setError(err.message);
    }
  }, [isConnected, conversationHistory]);

  // Interrompi avatar
  const interrupt = useCallback(() => {
    if (!sessionRef.current) return;
    try {
      sessionRef.current.interrupt();
    } catch (err) {
      console.error('Interrupt error:', err);
    }
  }, []);

  // Disconnetti
  const disconnect = useCallback(async () => {
    if (!sessionRef.current) return;

    try {
      await sessionRef.current.stop();
      sessionRef.current = null;
      setIsConnected(false);
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
    interrupt
  };
}
