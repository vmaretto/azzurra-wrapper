import React, { useState } from 'react';

/**
 * Survey presents a summary of the user's session, including 
 * their Italian cuisine profile, the duration, and any output from Azzurra.
 * It also collects optional feedback to store or further analyze.
 * 
 * Enhanced with improved visual design and better information layout.
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
    alert('Grazie per aver partecipato! 🎉');
    if (onRestart) {
      onRestart();
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes} minut${minutes !== 1 ? 'i' : 'o'} e ${secs} second${secs !== 1 ? 'i' : 'o'}`;
    }
    return `${secs} second${secs !== 1 ? 'i' : 'o'}`;
  };

  return (
    <section className="screen">
      <div className="card">
        <h2>Come è andata la tua esperienza? 🌟</h2>
        
        <div className="duration-badge">
          ⏱️ Durata: {formatDuration(duration)}
        </div>

        {profile && (
          <div className="profile-summary">
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
          </div>
        )}

        {output && (
          <>
            <h3>Risultato Azzurra:</h3>
            <pre>{JSON.stringify(output, null, 2)}</pre>
          </>
        )}

        <h3>Lascia un feedback 💭</h3>
        <p style={{ fontSize: '0.95rem', color: '#777', textAlign: 'left', marginBottom: '0.5rem' }}>
          Raccontaci cosa ne pensi della tua esperienza con Azzurra
        </p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Scrivi qui i tuoi commenti, suggerimenti o impressioni..."
          rows={4}
          required
        />
        <button type="button" onClick={handleSubmit}>Invia Feedback</button>
        
        <button 
          type="button" 
          onClick={onRestart}
          style={{ 
            background: 'transparent',
            color: '#764ba2',
            border: '2px solid #764ba2',
            marginTop: '1rem'
          }}
        >
          Ricomincia l'esperienza
        </button>
      </div>
    </section>
  );
}
