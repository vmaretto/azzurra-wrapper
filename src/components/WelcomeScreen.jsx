import React from 'react';

/**
 * WelcomeScreen displays a friendly introduction to the user along with
 * a button that moves the application to the next step.  The parent
 * component supplies the onNext callback which updates the step in
 * state.
 */
export default function WelcomeScreen({ onNext }) {
  return (
    <section className="screen">
      <h1>Benvenuto in Azzurra 🌿</h1>
      <p>
        Scopri un'esperienza guidata nella nutrizione mediterranea. Premi
        "Inizia" per continuare.
      </p>
      <button onClick={onNext}>Inizia</button>
    </section>
  );
}
