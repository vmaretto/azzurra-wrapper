// src/hooks/useAzzurra.js
import { useState, useRef, useCallback, useEffect } from 'react';
import StreamingAvatar, { 
  AvatarQuality, 
  StreamingEvents, 
  TaskType,
  TaskMode,
  VoiceEmotion 
} from '@heygen/streaming-avatar';

const AVATAR_ID = 'eeb15a59-7cf3-4ac6-8bf6-4dc0dc61871c';

export function useAzzurra() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  
  const avatarRef = useRef(null);

  // Ottieni token HeyGen dal backend
  const getHeyGenToken = async () => {
    const response = await fetch('/api/heygen-token', { method: 'POST' });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.token;
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
      const token = await getHeyGenToken();
      
      avatarRef.current = new StreamingAvatar({ token });

      // Event listeners
      avatarRef.current.on(StreamingEvents.STREAM_READY, (event) => {
        console.log('Stream ready');
        setStream(event.detail);
        setIsConnected(true);
        setIsLoading(false);
      });

      avatarRef.current.on(StreamingEvents.AVATAR_START_TALKING, () => {
        console.log('Avatar started talking');
        setIsTalking(true);
      });

      avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        console.log('Avatar stopped talking');
        setIsTalking(false);
      });

      avatarRef.current.on(StreamingEvents.USER_START, () => {
        console.log('User started talking');
        setIsListening(true);
      });

      avatarRef.current.on(StreamingEvents.USER_STOP, () => {
        console.log('User stopped talking');
        setIsListening(false);
      });

      avatarRef.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log('Stream disconnected');
        setIsConnected(false);
        setStream(null);
      });

      // Gestione messaggi utente (da voice chat)
      avatarRef.current.on(StreamingEvents.USER_END_MESSAGE, async (event) => {
        const userMessage = event.detail?.message;
        if (!userMessage) return;
        
        console.log('User message:', userMessage);
        
        // Aggiorna history
        setConversationHistory(prev => [...prev, { role: 'user', content: userMessage }]);
        
        try {
          // Ottieni risposta da Claude
          const reply = await getChatResponse(userMessage);
          console.log('Claude reply:', reply);
          
          // Aggiorna history
          setConversationHistory(prev => [...prev, { role: 'assistant', content: reply }]);
          
          // Fai parlare Azzurra
          await avatarRef.current.speak({
            text: reply,
            task_type: TaskType.REPEAT,
            taskMode: TaskMode.ASYNC
          });
        } catch (err) {
          console.error('Error getting response:', err);
          // Risposta di fallback
          await avatarRef.current.speak({
            text: "Scusami, non ho capito bene. Puoi ripetere?",
            task_type: TaskType.REPEAT
          });
        }
      });

      // Avvia sessione
      await avatarRef.current.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: AVATAR_ID,
        voice: {
          rate: 1.0,
          emotion: VoiceEmotion.FRIENDLY
        },
        language: 'it',
        activityIdleTimeout: 300 // 5 minuti
      });

    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [conversationHistory]);

  // Avvia voice chat
  const startVoiceChat = useCallback(async () => {
    if (!avatarRef.current || !isConnected) return;
    
    try {
      await avatarRef.current.startVoiceChat({
        useSilencePrompt: false,
        isInputAudioMuted: false
      });
      console.log('Voice chat started');
    } catch (err) {
      console.error('Voice chat error:', err);
      setError(err.message);
    }
  }, [isConnected]);

  // Invia messaggio testuale
  const sendMessage = useCallback(async (text) => {
    if (!avatarRef.current || !isConnected || !text.trim()) return;
    
    // Aggiorna history
    setConversationHistory(prev => [...prev, { role: 'user', content: text }]);
    
    try {
      const reply = await getChatResponse(text);
      
      // Aggiorna history
      setConversationHistory(prev => [...prev, { role: 'assistant', content: reply }]);
      
      // Fai parlare Azzurra
      await avatarRef.current.speak({
        text: reply,
        task_type: TaskType.REPEAT,
        taskMode: TaskMode.ASYNC
      });
    } catch (err) {
      console.error('Send message error:', err);
      setError(err.message);
    }
  }, [isConnected, conversationHistory]);

  // Interrompi avatar
  const interrupt = useCallback(async () => {
    if (!avatarRef.current) return;
    try {
      await avatarRef.current.interrupt();
    } catch (err) {
      console.error('Interrupt error:', err);
    }
  }, []);

  // Disconnetti
  const disconnect = useCallback(async () => {
    if (!avatarRef.current) return;
    
    try {
      await avatarRef.current.stopAvatar();
      avatarRef.current = null;
      setIsConnected(false);
      setStream(null);
      setConversationHistory([]);
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (avatarRef.current) {
        avatarRef.current.stopAvatar().catch(console.error);
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
    stream,
    conversationHistory,
    
    // Actions
    connect,
    disconnect,
    startVoiceChat,
    sendMessage,
    interrupt
  };
}
