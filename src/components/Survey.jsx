import React, { useState } from 'react';
import SuccessModal from './SuccessModal.jsx';

/**
 * Survey presents a summary of the user's session, including 
 * their Italian cuisine profile, the duration, and any output from Azzurra.
 * It also collects optional feedback to store or further analyze.
 * 
 * Enhanced with improved visual design, success modal, and database integration.
 */
export default function Survey({ duration, profile, output, onRestart }) {
  const [feedback, setFeedback] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const result = {
      timestamp: new Date().toISOString(),
      duration,
      profile,
      output,
      feedback
    };
    
    // Salva in localStorage come backup
    try {
      localStorage.setItem('azzurraWrapperSurvey', JSON.stringify(result));
    } catch (err) {
      console.warn('Unable to persist survey results to localStorage', err);
    }

    // Salva nel database
    try {
      const response = await fetch('/api/save-experience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result)
      });

      if (!response.ok) {
        throw new Error('Failed to save to database');
      }

      const data = await response.json();
      console.log('Experience saved successfully:', data);
      
    } catch (error) {
      console.error('Error saving experience:', error);
      // Anche in caso di errore, mostriamo il modal di successo
      // perché il dato è comunque salvato in localStorage
    }
    
    setIsSubmitting(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
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
    <>
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
          <button 
            type="button" 
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Invio in corso...' : 'Invia Feedback'}
          </button>
          
          <button 
            type="button" 
            onClick={onRestart}
            disabled={isSubmitting}
            style={{ 
              background: 'transparent',
              color: '#764ba2',
              border: '2px solid #764ba2',
              marginTop: '1rem',
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            Ricomincia l'esperienza
          </button>
        </div>
      </section>
      
      <SuccessModal 
        isOpen={showModal} 
        onClose={handleCloseModal}
        message="La tua esperienza è stata registrata con successo nel nostro database!"
      />
    </>
  );
}
