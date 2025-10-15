import React, { useEffect } from 'react';

export default function AzzurraFrame({ src, onFinish }) {
  useEffect(() => {
    function handleMessage(event) {
      // accetta solo messaggi provenienti dal dominio posti.world
      if (!event.origin || !event.origin.includes('posti.world')) return;
      const data = event.data;
      if (data && typeof data === 'object' && data.type === 'finished') {
        onFinish(data.output);  // termina l'esperienza quando Azzurra invia type = 'finished'
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onFinish]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* pulsante di uscita stilizzato in alto a sinistra */}
      <button
        onClick={() => onFinish(null)}
        style={{
          position: 'absolute',
          top: '1.5rem',
          left: '1.5rem',
          zIndex: 10,
          padding: '0.75rem 1.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: '600',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
        }}
      >
        ← Esci
      </button>
      {/* iframe che riempie tutto il contenitore */}
      <iframe
        src={src}
        title="Azzurra App"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
