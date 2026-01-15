// src/components/AzzurraChat.jsx
// UI Chat vocale/testuale - stile chatbot come screenshot

import { useState, useEffect, useRef } from 'react';
import { useAzzurraChat } from '../hooks/useAzzurraChat';
import './AzzurraChat.css';

// Icone SVG inline per evitare problemi di rendering
const MicIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
  </svg>
);

const StopIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
  </svg>
);

const MuteIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
  </svg>
);

const ExitIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"/>
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

export function AzzurraChat({ onFinish }) {
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

  // Auto-scroll alla fine dei messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, currentMessage]);

  // Tap to Start
  const handleStart = async () => {
    if (!isLoading && !isReady) {
      await initialize();
    }
  };

  // Invia messaggio testuale
  const handleSendText = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing || isTalking) return;

    const text = inputText.trim();
    setInputText('');
    await sendMessage(text);
  };

  // Toggle registrazione vocale
  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Termina esperienza
  const handleDisconnect = () => {
    disconnect();
    if (onFinish) {
      onFinish({ conversationHistory, discussedRecipes });
    }
  };

  // Stato per lo status text
  const getStatusText = () => {
    if (isTalking) return 'Sta parlando...';
    if (isListening) return 'Ti ascolto...';
    if (isProcessing) return 'Elaboro...';
    return 'Online';
  };

  const getStatusClass = () => {
    if (isTalking) return 'talking';
    if (isListening) return 'listening';
    if (isProcessing) return 'processing';
    return '';
  };

  return (
    <div className="chat-container">
      {/* Schermata iniziale - Tap to Start con logo grande animato */}
      {!isReady && !isLoading && (
        <div className="chat-start-screen" onClick={handleStart}>
          <img
            src="/logo-azzurra.png"
            alt="Azzurra"
            className="chat-start-logo"
          />
          <p className="chat-start-text">Tocca per iniziare</p>
          <p className="chat-start-subtitle">Chat vocale con Azzurra</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="chat-loading-screen">
          <div className="chat-spinner"></div>
          <p className="chat-loading-text">Sto preparando Azzurra...</p>
        </div>
      )}

      {/* Chat Interface */}
      {isReady && (
        <div className="chat-interface">
          {/* Header con logo animato */}
          <div className="chat-header">
            <div className={`header-logo-container ${isTalking ? 'talking' : ''}`}>
              <img
                src="/logo-azzurra.png"
                alt="Azzurra"
                className="header-logo"
              />
              {/* Onde sonore animate */}
              <div className="sound-waves">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className="header-info">
              <div className="header-name">Azzurra</div>
              <div className={`header-status ${getStatusClass()}`}>
                {getStatusText()}
              </div>
            </div>
          </div>

          {/* Area Messaggi */}
          <div className="chat-messages">
            {conversationHistory.map((msg, index) => (
              <div
                key={index}
                className={`chat-message ${msg.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className="message-avatar">
                  {msg.role === 'assistant' ? (
                    <img src="/logo-azzurra.png" alt="Azzurra" />
                  ) : (
                    <div className="user-avatar-icon">
                      <UserIcon />
                    </div>
                  )}
                </div>
                <div className="message-bubble">
                  {msg.content}
                </div>
              </div>
            ))}
            {/* Messaggio corrente in riproduzione */}
            {isTalking && currentMessage && (
              <div className="chat-message assistant">
                <div className="message-avatar">
                  <img src="/logo-azzurra.png" alt="Azzurra" />
                </div>
                <div className="message-bubble">
                  {currentMessage}
                  <span className="speaking-indicator">...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Controlli fissi in basso - stile Image #10 */}
          <div className="chat-controls">
            {/* Textarea grande con pulsante invio dentro */}
            <form onSubmit={handleSendText} className="chat-input-wrapper">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Scrivi un messaggio..."
                disabled={isProcessing || isTalking}
                className="chat-text-input"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendText(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isProcessing || isTalking}
                className="chat-send-btn"
                aria-label="Invia messaggio"
              >
                <SendIcon />
              </button>
            </form>

            {/* Pulsanti azione sotto la textarea */}
            <div className="chat-action-buttons">
              {/* Pulsante Microfono */}
              <div className="chat-action-item">
                <button
                  className={`chat-circle-btn chat-mic-btn ${isListening ? 'recording' : ''}`}
                  onClick={handleMicToggle}
                  disabled={isProcessing || isTalking}
                  aria-label={isListening ? 'Ferma registrazione' : 'Parla'}
                >
                  {isListening ? <StopIcon /> : <MicIcon />}
                </button>
                <span className="chat-action-label">
                  {isListening ? 'Stop' : 'Parla'}
                </span>
              </div>

              {/* Pulsante Esci */}
              <div className="chat-action-item">
                <button
                  className="chat-circle-btn chat-exit-btn"
                  onClick={handleDisconnect}
                  aria-label="Termina esperienza"
                >
                  <ExitIcon />
                </button>
                <span className="chat-action-label">Esci</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="chat-error-overlay">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Riprova</button>
        </div>
      )}
    </div>
  );
}

export default AzzurraChat;
