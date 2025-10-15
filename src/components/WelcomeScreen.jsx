import React from 'react';

/**
 * WelcomeScreen displays a friendly introduction to the user along with
 * a button that moves the application to the next step.
 *
 * Now uses a card layout for improved visual appeal.
 */
export default function WelcomeScreen({ onNext }) {
  return (
    <div className="screen">
      <div className="card">
        <h1>Benvenuto in Azzurra 🌿</h1>
        <p>
          Scopri un'esperienza guidata nella cucina italiana e nella nutrizione mediterranea. Premi "Inizia" per continuare.
        </p>
        <button onClick={onNext}>Inizia</button>
      </div>
    </div>
  );
}
