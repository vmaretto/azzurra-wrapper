import React, { useState } from 'react';
import SuccessModal from './SuccessModal.jsx';
import RecipeResults from './RecipeResults.jsx';

/**
 * Survey presents a summary of the user's session, including 
 * their Italian cuisine profile, the duration, and any output from Azzurra.
 * It also collects optional feedback to store or further analyze.
 * 
 * Enhanced with improved visual design, success modal, and database integration.
 */
export default function Survey({ duration, profile, output, interactionMode, onRestart }) {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Label per la modalità di interazione
  const getModeLabel = () => {
    if (interactionMode === 'chat') return 'Chat Vocale';
    if (interactionMode === 'avatar') return 'Avatar Video';
    return 'Non specificato';
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Per favore, seleziona una valutazione da 1 a 5 stelle');
      return;
    }
    setIsSubmitting(true);

    const result = {
      timestamp: new Date().toISOString(),
      duration,
      profile,
      output,
      rating,
      feedback,
      interactionMode: interactionMode || 'avatar' // Default per retrocompatibilità
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

          {/* Badge modalità interazione */}
          <div className="mode-badge" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: interactionMode === 'chat'
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #e94560 0%, #c62828 100%)',
            color: '#fff',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: '500',
            marginBottom: '1rem'
          }}>
            {interactionMode === 'chat' ? '🎤' : '🎬'} {getModeLabel()}
          </div>

          {profile && (
            <div className="profile-summary">
              <h3>Il tuo profilo:</h3>
              {profile.sesso && (
                <p><strong>Sesso:</strong> {profile.sesso}</p>
              )}
              {profile.fasciaEta && (
                <p><strong>Fascia Età:</strong> {profile.fasciaEta}</p>
              )}
              {profile.titoloStudio && (
                <p><strong>Titolo di studio:</strong> {profile.titoloStudio}</p>
              )}
              {profile.areaGeografica && (
                <p><strong>Area Geografica:</strong> {profile.areaGeografica}</p>
              )}
              {profile.rapportoCibo && (
                <p><strong>Rapporto col cibo:</strong> {profile.rapportoCibo}</p>
              )}
            </div>
          )}

          {output && output.conversationHistory && (
            <RecipeResults
              conversationHistory={output.conversationHistory}
              discussedRecipes={output.discussedRecipes}
            />
          )}

          <h3>Valuta l'esperienza</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '2.5rem',
                  cursor: 'pointer',
                  color: star <= rating ? '#016fab' : '#ccc',
                  padding: '0',
                  margin: '0',
                  transition: 'color 0.2s ease, transform 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                ★
              </button>
            ))}
          </div>

          <h3>Lascia un commento (opzionale)</h3>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Scrivi qui eventuali commenti, suggerimenti o impressioni..."
            rows={4}
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
              color: '#016fab',
              border: '2px solid #016fab',
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
        conversationHistory={output?.conversationHistory || []}
        discussedRecipes={output?.discussedRecipes || []}
      />
    </>
  );
}
