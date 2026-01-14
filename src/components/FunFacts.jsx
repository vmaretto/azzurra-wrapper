import React, { useState, useEffect } from 'react';

/**
 * FunFacts mostra curiosità divertenti sui dolci italiani
 * Viene mostrato dopo che l'utente ha lasciato il feedback
 */
export default function FunFacts() {
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchFacts() {
      try {
        const response = await fetch('/api/fun-facts');
        if (!response.ok) {
          throw new Error('Errore nel recupero delle curiosità');
        }
        const data = await response.json();
        setFacts(data.facts || []);
      } catch (err) {
        console.error('Errore:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchFacts();
  }, []);

  if (loading) {
    return (
      <div className="fun-facts loading">
        <p>Caricamento curiosità...</p>
      </div>
    );
  }

  if (error || facts.length === 0) {
    return null; // Non mostrare nulla se c'è un errore
  }

  return (
    <div className="fun-facts">
      <h3 style={{
        color: '#016fab',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span style={{ fontSize: '1.5rem' }}>💡</span>
        Lo sapevi?
      </h3>

      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0
      }}>
        {facts.map((fact, index) => (
          <li
            key={index}
            style={{
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              borderLeft: '4px solid #016fab',
              padding: '1rem',
              marginBottom: '0.75rem',
              borderRadius: '0 8px 8px 0',
              fontSize: '0.95rem',
              lineHeight: '1.5',
              color: '#333'
            }}
          >
            {fact}
          </li>
        ))}
      </ul>
    </div>
  );
}
