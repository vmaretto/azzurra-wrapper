// src/components/AzzurraAvatar.jsx
// UI ottimizzata per totem verticale 55"
import { useEffect, useRef } from 'react';
import { useAzzurra } from '../hooks/useAzzurra';
import './AzzurraAvatar.css';

export function AzzurraAvatar({ onFinish }) {
  const videoRef = useRef(null);

  const {
    isLoading,
    isConnected,
    isTalking,
    isListening,
    isMuted,
    error,
    conversationHistory,
    connect,
    disconnect,
    attachVideo,
    startVoiceChat,
    toggleMute
  } = useAzzurra();

  // Collega il video element alla sessione LiveAvatar
  useEffect(() => {
    if (isConnected && videoRef.current) {
      attachVideo(videoRef.current);
    }
  }, [isConnected, attachVideo]);

  // Auto-start voice chat quando connesso
  useEffect(() => {
    if (isConnected) {
      // Piccolo delay per assicurarsi che la sessione sia pronta
      const timer = setTimeout(() => {
        startVoiceChat();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, startVoiceChat]);

  // Tap to start - connette l'avatar
  const handleTapToStart = async () => {
    if (!isLoading && !isConnected) {
      // Avvia play subito nel contesto user gesture (muted per garantire autoplay)
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
      await connect();
    }
  };

  // Unmute video dopo che la connessione è stabilita
  useEffect(() => {
    if (isConnected && videoRef.current) {
      // Piccolo delay per assicurarsi che lo stream sia pronto
      const timer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.muted = false;
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  // Termina esperienza
  const handleDisconnect = async () => {
    await disconnect();
    if (onFinish) {
      onFinish({ conversationHistory });
    }
  };

  return (
    <div className="totem-container">
      {/* Schermata iniziale - Tap to Start */}
      {!isConnected && !isLoading && (
        <div className="start-screen" onClick={handleTapToStart}>
          <img
            src="/logo-azzurra.png"
            alt="Azzurra"
            className="start-logo"
          />
          <p className="start-text">Tocca per iniziare</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="loading-screen">
          <div className="spinner"></div>
          <p className="loading-text">Sto svegliando Azzurra...</p>
        </div>
      )}

      {/* Avatar Video Fullscreen */}
      <video
        ref={videoRef}
        className={`avatar-video ${isConnected ? 'visible' : ''}`}
        autoPlay
        playsInline
        muted
      />

      {/* Indicatore di stato - sopra i controlli */}
      {isConnected && (
        <div className="status-indicator">
          {isTalking ? (
            <span className="status-talking">Azzurra sta parlando...</span>
          ) : isListening ? (
            <span className="status-listening">Ti sto ascoltando...</span>
          ) : (
            <span className="status-ready">Pronta</span>
          )}
        </div>
      )}

      {/* Controlli circolari - solo quando connesso */}
      {isConnected && (
        <div className="totem-controls">
          {/* Pulsante Mute con etichetta */}
          <div className="btn-with-label">
            <button
              className={`circle-btn ${isMuted ? 'muted' : 'active'}`}
              onClick={toggleMute}
              aria-label={isMuted ? 'Attiva microfono' : 'Disattiva microfono'}
            >
              {isMuted ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              )}
            </button>
            <span className="btn-label">{isMuted ? 'Microfono OFF' : 'Microfono ON'}</span>
          </div>

          {/* Pulsante Disconnetti con etichetta */}
          <div className="btn-with-label">
            <button
              className="circle-btn disconnect"
              onClick={handleDisconnect}
              aria-label="Termina esperienza"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
            <span className="btn-label">Esci</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="error-overlay">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

export default AzzurraAvatar;
