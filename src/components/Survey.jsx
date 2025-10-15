import React, { useState } from 'react';

/**
 * Survey presents a summary of the user's session and collects
 * optional feedback.  The duration of the session, the profile
 * information and any output received from the Azzurra iframe are
 * displayed.  When the user submits their feedback, the data is
 * persisted to localStorage and the parent component is notified to
 * restart or close the flow.
 */
export default function Survey({ duration, profile, output, onRestart }) {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    const result = { duration, profile, output, feedback };
    // Persist results for future analysis.  This could be replaced with
    // a real API call or other storage mechanism as needed.
    try {
      localStorage.setItem('azzurraWrapperSurvey', JSON.stringify(result));
    } catch (err) {
      console.warn('Unable to persist survey results to localStorage', err);
    }
    alert('Grazie per aver partecipato!');
    // Reset the flow via the callback from the parent component.
    if (onRestart) {
      onRestart();
    }
  };

  return (
    <section className="screen">
      <h2>Comè andata la tua esperienza?</h2>
      {duration != null && <p>Durata: {duration} secondi</p>}
      {profile && (
        <p>
          {profile.name} ({profile.age} anni)
        </p>
      )}
      {output && (
        <pre
          style={{
            backgroundColor: '#eef5ee',
            padding: '1rem',
            borderRadius: '0.5rem',
            maxWidth: '100%',
            overflowX: 'auto',
          }}
        >
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
      <textarea
        rows={5}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Lascia un commento..."
        style={{ width: '100%', maxWidth: '320px' }}
      />
      <button onClick={handleSubmit}>Invia</button>
    </section>
  );
}
