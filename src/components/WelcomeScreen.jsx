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
        <h1>Benvenuto in Azzurra 🌿</h1>
        <p style={{ fontSize: '1.15rem', marginTop: '1rem' }}>
          Scopri un'esperienza guidata nella cucina italiana e nella nutrizione mediterranea.
        </p>
        <p style={{ color: '#777', fontSize: '0.95rem' }}>
          Preparati ad esplorare sapori autentici, ricette tradizionali e consigli nutrizionali personalizzati.
        </p>
        <button onClick={onNext}>Inizia l'avventura</button>
      </div>
    </div>
  );
}
