import React, { useState, useEffect } from 'react';

/**
 * SmartInsights - Insights personalizzati e globali sui dolci italiani
 * UI premium con animazioni e design sofisticato
 *
 * Props:
 * - conversationHistory: array di messaggi della conversazione
 * - discussedRecipes: array di titoli ricette discusse
 */
export default function SmartInsights({ conversationHistory = [], discussedRecipes = [] }) {
  const [insights, setInsights] = useState({ personalized: [], global: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('personalized');

  useEffect(() => {
    async function fetchInsights() {
      try {
        const response = await fetch('/api/smart-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discussedRecipes,
            conversationHistory
          })
        });

        if (!response.ok) {
          throw new Error('Errore nel recupero degli insights');
        }

        const data = await response.json();
        setInsights({
          personalized: data.personalized || [],
          global: data.global || []
        });
      } catch (err) {
        console.error('Errore:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [discussedRecipes, conversationHistory]);

  // Se sta caricando, mostra skeleton
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerIcon}>✨</span>
          <span style={styles.headerTitle}>Scopri di più</span>
        </div>
        <div style={styles.skeletonContainer}>
          {[1, 2, 3].map(i => (
            <div key={i} style={styles.skeletonCard}>
              <div style={styles.skeletonIcon} />
              <div style={styles.skeletonText} />
              <div style={{ ...styles.skeletonText, width: '60%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Se c'è un errore o nessun insight, non mostrare nulla
  if (error || (insights.personalized.length === 0 && insights.global.length === 0)) {
    return null;
  }

  const hasPersonalized = insights.personalized.length > 0;
  const hasGlobal = insights.global.length > 0;

  // Se abbiamo solo globali, mostriamo quelli
  const showTabs = hasPersonalized && hasGlobal;
  const currentInsights = activeTab === 'personalized' && hasPersonalized
    ? insights.personalized
    : insights.global;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>✨</span>
        <span style={styles.headerTitle}>
          {hasPersonalized ? 'La tua scoperta' : 'Lo sapevi?'}
        </span>
      </div>

      {/* Tabs se abbiamo entrambi i tipi */}
      {showTabs && (
        <div style={styles.tabContainer}>
          <button
            onClick={() => setActiveTab('personalized')}
            style={{
              ...styles.tab,
              ...(activeTab === 'personalized' ? styles.tabActive : {})
            }}
          >
            Per te
          </button>
          <button
            onClick={() => setActiveTab('global')}
            style={{
              ...styles.tab,
              ...(activeTab === 'global' ? styles.tabActive : {})
            }}
          >
            Curiosità
          </button>
        </div>
      )}

      {/* Insights Cards */}
      <div style={styles.insightsGrid}>
        {currentInsights.map((insight, index) => (
          <div
            key={index}
            style={{
              ...styles.insightCard,
              animationDelay: `${index * 0.1}s`
            }}
          >
            <div style={styles.insightIconContainer}>
              <span style={styles.insightIcon}>{insight.icon}</span>
            </div>
            <div style={styles.insightContent}>
              <p style={styles.insightText}>{insight.text}</p>
              {insight.detail && (
                <p style={styles.insightDetail}>{insight.detail}</p>
              )}
              {insight.recipe && (
                <span style={styles.recipeTag}>{insight.recipe}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Animazioni CSS */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    marginTop: '0.5rem',
    marginBottom: '0.5rem'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem'
  },
  headerIcon: {
    fontSize: '1.5rem',
    animation: 'pulse 2s ease-in-out infinite'
  },
  headerTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #016fab 0%, #00b4d8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  tabContainer: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
    background: '#f0f4f8',
    borderRadius: '12px',
    padding: '4px'
  },
  tab: {
    flex: 1,
    padding: '0.6rem 1rem',
    border: 'none',
    borderRadius: '10px',
    background: 'transparent',
    color: '#666',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  tabActive: {
    background: 'white',
    color: '#016fab',
    boxShadow: '0 2px 8px rgba(1, 111, 171, 0.15)'
  },
  insightsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  insightCard: {
    display: 'flex',
    gap: '0.75rem',
    padding: '1rem',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    borderRadius: '16px',
    border: '1px solid rgba(1, 111, 171, 0.1)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
    animation: 'fadeInUp 0.4s ease-out forwards',
    opacity: 0,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  insightIconContainer: {
    flexShrink: 0,
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #e8f4fc 0%, #d0ebfa 100%)',
    borderRadius: '12px'
  },
  insightIcon: {
    fontSize: '1.4rem'
  },
  insightContent: {
    flex: 1,
    minWidth: 0
  },
  insightText: {
    margin: 0,
    fontSize: '0.92rem',
    lineHeight: '1.5',
    color: '#2d3748',
    fontWeight: '500'
  },
  insightDetail: {
    margin: '0.4rem 0 0 0',
    fontSize: '0.8rem',
    color: '#718096',
    fontStyle: 'italic'
  },
  recipeTag: {
    display: 'inline-block',
    marginTop: '0.5rem',
    padding: '0.2rem 0.6rem',
    background: 'linear-gradient(135deg, #016fab 0%, #014d7a 100%)',
    color: 'white',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.3px'
  },
  skeletonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  skeletonCard: {
    display: 'flex',
    gap: '0.75rem',
    padding: '1rem',
    background: '#f0f4f8',
    borderRadius: '16px'
  },
  skeletonIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite'
  },
  skeletonText: {
    height: '14px',
    borderRadius: '7px',
    background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    marginBottom: '8px',
    width: '100%'
  }
};
