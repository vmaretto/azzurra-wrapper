// src/components/AzzurraChatPremium.jsx
// Chat vocale con design premium - animazioni e avatar
import { useState, useRef, useEffect } from 'react';
import { useAzzurraChat } from '../hooks/useAzzurraChat';
import './AzzurraChatPremium.css';

export function AzzurraChatPremium({ onFinish }) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const {
    isLoading,
    isReady,
    isTalking,
    isListening,
    isProcessing,
    error,
    conversationHistory,
    discussedRecipes,
    currentMessage,
    initialize,
    startListening,
    stopListening,
    sendMessage,
    stopAudio,
    disconnect
  } = useAzzurraChat();

  // Auto-scroll ai messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Tap to start
  const handleStart = async () => {
    if (!isLoading && !isReady) {
      await initialize();
    }
  };

  // Invio messaggio testuale
  const handleSendText = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    const text = inputText.trim();
    setInputText('');
    await sendMessage(text);
  };

  // Toggle registrazione vocale
  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      if (isTalking) stopAudio();
      startListening();
    }
  };

  // Termina esperienza
  const handleFinish = () => {
    disconnect();
    if (onFinish) {
      onFinish({ conversationHistory, discussedRecipes });
    }
  };

  return (
    <div className="premium-container">
      {/* Schermata iniziale - Tap to Start */}
      {!isReady && !isLoading && (
        <div className="premium-start" onClick={handleStart}>
          <div className="premium-start-content">
            <div className="premium-logo-wrapper">
              <img
                src="/logo-azzurra.png"
                alt="Azzurra"
                className="premium-start-logo"
              />
              <div className="premium-logo-glow"></div>
            </div>
            <h1 className="premium-title">Azzurra</h1>
            <p className="premium-subtitle">Il tuo assistente della cucina italiana</p>
            <button className="premium-start-btn">
              <span>Inizia la conversazione</span>
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="premium-loading">
          <div className="premium-loading-logo">
            <img src="/logo-azzurra.png" alt="Azzurra" />
            <div className="premium-loading-ring"></div>
          </div>
          <p className="premium-loading-text">Sto svegliando Azzurra...</p>
        </div>
      )}

      {/* Chat Interface */}
      {isReady && (
        <div className="premium-chat">
          {/* Header con logo animato */}
          <header className="premium-header">
            <div className={`premium-avatar-main ${isTalking ? 'talking' : ''}`}>
              <img src="/logo-azzurra.png" alt="Azzurra" />
              {/* Onde sonore animate */}
              <div className="sound-waves">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className="premium-header-info">
              <h2>Azzurra</h2>
              <span className={`premium-status ${isTalking ? 'talking' : isProcessing ? 'processing' : isListening ? 'listening' : 'ready'}`}>
                {isTalking ? 'Sta parlando...' :
                 isProcessing ? 'Elaborando...' :
                 isListening ? 'Ti ascolto...' :
                 'Pronta'}
              </span>
            </div>
            <button className="premium-exit-btn" onClick={handleFinish}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </header>

          {/* Area messaggi */}
          <div className="premium-messages">
            {conversationHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`premium-message ${msg.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className="premium-message-avatar">
                  {msg.role === 'assistant' ? (
                    <img src="/logo-azzurra.png" alt="Azzurra" />
                  ) : (
                    <div className="guest-avatar">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="premium-message-content">
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Indicatore di elaborazione */}
            {isProcessing && (
              <div className="premium-message assistant">
                <div className="premium-message-avatar">
                  <img src="/logo-azzurra.png" alt="Azzurra" />
                </div>
                <div className="premium-message-content typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="premium-input-area">
            <form onSubmit={handleSendText} className="premium-input-form">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Scrivi un messaggio..."
                disabled={isProcessing || isTalking}
                className="premium-input"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isProcessing || isTalking}
                className="premium-send-btn"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </form>

            {/* Pulsante microfono grande */}
            <button
              className={`premium-mic-btn ${isListening ? 'recording' : ''} ${isProcessing || isTalking ? 'disabled' : ''}`}
              onClick={handleMicToggle}
              disabled={isProcessing || isTalking}
            >
              <div className="mic-pulse"></div>
              {isListening ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h12v12H6z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="premium-error">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default AzzurraChatPremium;
