import React, { useState } from 'react';

/**
 * Survey presents a summary of the user's session, including 
 * their Italian cuisine profile, the duration, and any output from Azzurra.
 * It also collects optional feedback to store or further analyze.
 */
export default function Survey({ duration, profile, output, onRestart }) {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    const result = { duration, profile, output, feedback };
    try {
      localStorage.setItem('azzurraWrapperSurvey', JSON.stringify(result));
    } catch (err) {
      console.warn('Unable to persist survey results to localStorage', err);
    }
    alert('Grazie per aver partecipato!');
    if (onRestart) {
      onRestart();
    }
  };

  return (
    <section className="screen">
      <div className="card">
        <h2>Comè andata la tua esperienza?</h2>
        <p><strong>Durata:</strong> {duration != null ? `${duration} secondi` : 'N/A'}</p>

        {profile && (
          <>
            <h3>Il tuo profilo culinario:</h3>
            {profile.experience && (
              <p><strong>Livello di esperienza:</strong> {profile.experience}</p>
            )}
            {profile.favouriteDish && (
              <p><strong>Piatto preferito:</strong> {profile.favouriteDish}</p>
            )}
            {profile.dietaryPref && (
              <p><strong>Preferenze dietetiche:</strong> {profile.dietaryPref}</p>
            )}
            {profile.region && (
              <p><strong>Regione di interesse:</strong> {profile.region}</p>
            )}
          </>
        )}

        {output && (
          <>
            <h3>Risultato Azzurra:</h3>
            <pre>{JSON.stringify(output, null, 2)}</pre>
          </>
        )}

        <h3>Lascia un feedback</h3>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Commenti sulla tua esperienza..."
          rows={4}
          required
        />
        <button type="button" onClick={handleSubmit}>Invia</button>
      </div>
    </section>
  );
}
