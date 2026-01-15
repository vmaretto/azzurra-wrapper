// src/components/AzzurraChat.jsx
// UI Chat vocale/testuale con logo Azzurra animato

import { useState, useEffect, useRef } from 'react';
import { useAzzurraChat } from '../hooks/useAzzurraChat';
import './AzzurraChat.css';

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
  }, [conversationHistory]);

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

  // Determina stato avatar per animazione
  const getAvatarState = () => {
    if (isTalking) return 'talking';
    if (isListening) return 'listening';
    if (isProcessing) return 'processing';
    return 'idle';
  };

  return (
    <div className="chat-container">
      {/* Schermata iniziale - Tap to Start */}
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
          {/* Header con Avatar Animato */}
          <div className="chat-header">
            <div className={`avatar-circle ${getAvatarState()}`}>
              <img
                src="/logo-azzurra.png"
                alt="Azzurra"
                className="avatar-image"
              />
              <div className="avatar-pulse"></div>
              <div className="avatar-pulse delay"></div>
            </div>
            <div className="avatar-status">
              {isTalking && <span className="status-talking">Azzurra sta parlando...</span>}
              {isListening && <span className="status-listening">Ti sto ascoltando...</span>}
              {isProcessing && <span className="status-processing">Sto elaborando...</span>}
              {!isTalking && !isListening && !isProcessing && <span className="status-ready">Pronta</span>}
            </div>
          </div>

          {/* Area Messaggi */}
          <div className="chat-messages">
            {conversationHistory.map((msg, index) => (
              <div
                key={index}
                className={`chat-message ${msg.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className="message-bubble">
                  {msg.content}
                </div>
              </div>
            ))}
            {/* Messaggio corrente in riproduzione */}
            {isTalking && currentMessage && (
              <div className="chat-message assistant speaking">
                <div className="message-bubble">
                  {currentMessage}
                  <span className="speaking-indicator">...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Controlli fissi in basso */}
          <div className="chat-controls">
            {/* Input stile chatbot moderno */}
            <form onSubmit={handleSendText} className="chat-input-container">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Scrivi un messaggio..."
                disabled={isProcessing || isTalking}
                className="text-input"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isProcessing || isTalking}
                className="send-button"
                aria-label="Invia messaggio"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </form>

            {/* Pulsanti azione */}
            <div className="action-buttons">
              {/* Pulsante Microfono */}
              <div className="action-btn-wrapper">
                <button
                  className={`mic-button ${isListening ? 'recording' : ''}`}
                  onClick={handleMicToggle}
                  disabled={isProcessing || isTalking}
                  aria-label={isListening ? 'Ferma registrazione' : 'Parla'}
                >
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
                <span className="action-btn-label">
                  {isListening ? 'Stop' : 'Parla'}
                </span>
              </div>

              {/* Pulsante Stop Audio (solo se sta parlando) */}
              {isTalking && (
                <div className="action-btn-wrapper">
                  <button
                    className="stop-button"
                    onClick={stopAudio}
                    aria-label="Ferma audio"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  </button>
                  <span className="action-btn-label">Muto</span>
                </div>
              )}

              {/* Pulsante Esci */}
              <div className="action-btn-wrapper">
                <button
                  className="exit-button"
                  onClick={handleDisconnect}
                  aria-label="Termina esperienza"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                  </svg>
                </button>
                <span className="action-btn-label">Esci</span>
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
