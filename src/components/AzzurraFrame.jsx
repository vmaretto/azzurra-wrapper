import React, { useEffect } from 'react';

export default function AzzurraFrame({ src, onFinish }) {
  useEffect(() => {
    function handleMessage(event) {
      // accetta solo messaggi provenienti dal dominio posti.world
      if (!event.origin || !event.origin.includes('posti.world')) return;
      const data = event.data;
      if (data && typeof data === 'object' && data.type === 'finished') {
        onFinish(data.output);  // termina l’esperienza quando Azzurra invia type = 'finished'
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onFinish]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* pulsante di uscita spostato in alto a sinistra */}
      <button
        onClick={() => onFinish(null)}
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          zIndex: 10,
          padding: '0.5rem 1rem',
          backgroundColor: '#ffffffcc',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Esci
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
