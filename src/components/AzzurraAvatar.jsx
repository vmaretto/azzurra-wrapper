// src/components/AzzurraAvatar.jsx
import { useEffect, useRef, useState } from 'react';
import { useAzzurra } from '../hooks/useAzzurra';
import './AzzurraAvatar.css';

export function AzzurraAvatar({ onFinish }) {
  const videoRef = useRef(null);
  const [inputText, setInputText] = useState('');
  const [voiceChatActive, setVoiceChatActive] = useState(false);

  const {
    isLoading,
    isConnected,
    isTalking,
    isListening,
    error,
    conversationHistory,
    connect,
    disconnect,
    attachVideo,
    startVoiceChat,
    sendMessage,
    interrupt
  } = useAzzurra();

  // Collega il video element alla sessione LiveAvatar
  useEffect(() => {
    if (isConnected && videoRef.current) {
      attachVideo(videoRef.current);
    }
  }, [isConnected, attachVideo]);

  // Avvia voice chat
  const handleStartVoiceChat = async () => {
    await startVoiceChat();
    setVoiceChatActive(true);
  };

  // Invia messaggio testuale
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      await sendMessage(inputText);
      setInputText('');
    }
  };

  // Termina esperienza
  const handleFinish = async () => {
    await disconnect();
    if (onFinish) {
      onFinish({ conversationHistory });
    }
  };

  return (
    <div className="azzurra-container">
      {/* Video Avatar */}
      <div className="avatar-wrapper">
        {!isConnected && !isLoading && (
          <div className="avatar-placeholder">
            <img src="/azzurra-placeholder.png" alt="Azzurra" />
            <p>Clicca "Connetti" per parlare con Azzurra</p>
          </div>
        )}
        
        {isLoading && (
          <div className="avatar-loading">
            <div className="spinner"></div>
            <p>Sto svegliando Azzurra...</p>
          </div>
        )}

        <video
          ref={videoRef}
          className={`avatar-video ${isConnected ? 'visible' : ''}`}
          autoPlay
          playsInline
        />

        {/* Status indicators */}
        {isConnected && (
          <div className="status-bar">
            {isTalking && <span className="status talking">🗣️ Azzurra sta parlando</span>}
            {isListening && <span className="status listening">🎤 Ti sto ascoltando</span>}
            {!isTalking && !isListening && <span className="status ready">✨ Pronta</span>}
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      {/* Controls */}
      <div className="controls">
        {!isConnected ? (
          <button 
            onClick={connect} 
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Connessione...' : '🎬 Connetti Azzurra'}
          </button>
        ) : (
          <>
            {!voiceChatActive ? (
              <button 
                onClick={handleStartVoiceChat}
                className="btn btn-voice"
              >
                🎤 Avvia conversazione vocale
              </button>
            ) : (
              <button 
                onClick={interrupt}
                className="btn btn-interrupt"
                disabled={!isTalking}
              >
                ✋ Interrompi
              </button>
            )}
            
            <button 
              onClick={disconnect}
              className="btn btn-disconnect"
            >
              ❌ Disconnetti
            </button>
          </>
        )}
      </div>

      {/* Text input (alternativa al voice) */}
      {isConnected && (
        <form onSubmit={handleSendMessage} className="text-input-form">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Oppure scrivi qui la tua domanda..."
            disabled={isTalking}
          />
          <button type="submit" disabled={!inputText.trim() || isTalking}>
            Invia
          </button>
        </form>
      )}

      {/* Conversation history */}
      {conversationHistory.length > 0 && (
        <div className="conversation-history">
          <h4>Conversazione</h4>
          <div className="messages">
            {conversationHistory.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <strong>{msg.role === 'user' ? 'Tu' : 'Azzurra'}:</strong>
                <p>{msg.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Finish button */}
      {isConnected && (
        <div className="finish-section">
          <button
            onClick={handleFinish}
            className="btn btn-finish"
          >
            Termina esperienza
          </button>
        </div>
      )}
    </div>
  );
}

export default AzzurraAvatar;
