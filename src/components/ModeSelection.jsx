// src/components/ModeSelection.jsx
// Schermata di scelta tra Avatar Video e Chat Vocale

import './ModeSelection.css';

export function ModeSelection({ onSelectMode }) {
  return (
    <div className="mode-selection-container">
      <div className="mode-selection-header">
        <img
          src="/logo-azzurra.png"
          alt="Azzurra"
          className="mode-logo"
        />
        <h1 className="mode-title">Come vuoi parlare con Azzurra?</h1>
        <p className="mode-subtitle">Scegli la modalità che preferisci</p>
      </div>

      <div className="mode-options">
        {/* Opzione Avatar Video */}
        <div
          className="mode-card avatar-mode"
          onClick={() => onSelectMode('avatar')}
        >
          <div className="mode-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/>
            </svg>
          </div>
          <h2 className="mode-card-title">Avatar Video</h2>
          <p className="mode-card-description">
            Parla con Azzurra attraverso un avatar video interattivo.
            Esperienza più immersiva con lip-sync in tempo reale.
          </p>
          <div className="mode-card-badge premium">
            <span>Premium</span>
          </div>
        </div>

        {/* Opzione Chat Vocale */}
        <div
          className="mode-card chat-mode"
          onClick={() => onSelectMode('chat')}
        >
          <div className="mode-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
          </div>
          <h2 className="mode-card-title">Chat Vocale</h2>
          <p className="mode-card-description">
            Conversa con Azzurra tramite voce e testo.
            Stessa conoscenza, interfaccia più leggera.
          </p>
          <div className="mode-card-badge recommended">
            <span>Consigliato</span>
          </div>
        </div>
      </div>

      <p className="mode-footer">
        Entrambe le modalità offrono la stessa esperienza di conversazione con Azzurra
      </p>
    </div>
  );
}

export default ModeSelection;
