import React from 'react';

/**
 * WelcomeScreen displays a friendly introduction to the user along with
 * a button that moves the application to the next step.
 *
 * Enhanced with improved visual design.
 */
export default function WelcomeScreen({ onNext }) {
  return (
    <div className="screen">
      <div className="card">
        <img
          src="/logo-azzurra.png"
          alt="Azzurra Logo"
          style={{
            width: '100px',
            height: 'auto',
            marginBottom: '1rem',
            display: 'block',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}
        />
        <h1>Benvenuto in Azzurra</h1>
        <p style={{ fontSize: '1.15rem', marginTop: '1rem' }}>
          Scopri una originale esperienza immersiva e lasciati guidare attraverso le dolcezze della Cucina italiana, patrimonio Unesco.
        </p>
        <p style={{ color: '#777', fontSize: '0.95rem' }}>
          Preparati ad esplorare sapori autentici e ricette tradizionali tra storia, gastronomia e scienza.
        </p>
        <button onClick={onNext}>Inizia l'avventura</button>
      </div>
    </div>
  );
}
