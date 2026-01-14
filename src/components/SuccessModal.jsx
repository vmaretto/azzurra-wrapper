import React from 'react';
import SmartInsights from './SmartInsights.jsx';

/**
 * SuccessModal - Modern modal popup for showing success messages
 * Include anche le curiosità sui dolci italiani
 */
export default function SuccessModal({ isOpen, onClose, message, conversationHistory = [], discussedRecipes = [] }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease-in-out',
        overflow: 'auto',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          borderRadius: '24px',
          padding: '2.5rem',
          maxWidth: '600px',
          width: '95%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          textAlign: 'center',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🎉</div>
        <h2 style={{
          background: 'linear-gradient(135deg, #016fab 0%, #014d7a 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: '1.5rem',
          fontWeight: '700',
          marginBottom: '0.75rem'
        }}>
          Grazie per il tuo feedback!
        </h2>
        <p style={{
          color: '#555',
          fontSize: '1rem',
          lineHeight: '1.5',
          marginBottom: '1.5rem'
        }}>
          {message || 'La tua esperienza è stata registrata con successo. Grazie per aver partecipato!'}
        </p>

        {/* Smart Insights personalizzati sui dolci */}
        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <SmartInsights
            conversationHistory={conversationHistory}
            discussedRecipes={discussedRecipes}
          />
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'linear-gradient(135deg, #016fab 0%, #014d7a 100%)',
            color: 'white',
            border: 'none',
            padding: '1rem 2.5rem',
            borderRadius: '12px',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(1, 111, 171, 0.4)',
            transition: 'all 0.3s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(1, 111, 171, 0.6)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(1, 111, 171, 0.4)';
          }}
        >
          Chiudi
        </button>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
