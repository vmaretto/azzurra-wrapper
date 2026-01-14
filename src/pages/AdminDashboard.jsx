import React, { useState, useEffect } from 'react';

/**
 * AdminDashboard - Dashboard per visualizzare statistiche e analytics
 * Protetta da password semplice
 */
export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dati
  const [stats, setStats] = useState(null);
  const [curiosities, setCuriosities] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  // Password semplice (in produzione usare env var)
  const ADMIN_PASSWORD = 'azzurra2024';

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError(null);
    } else {
      setError('Password non corretta');
    }
  };

  // Carica dati quando autenticato
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, curiositiesRes, analyticsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/curiosities'),
          fetch('/api/conversation-analytics')
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (curiositiesRes.ok) setCuriosities(await curiositiesRes.json());
        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      } catch (err) {
        console.error('Errore caricamento dati:', err);
        setError('Errore nel caricamento dei dati');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  // Schermata login
  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.loginTitle}>Dashboard Admin</h1>
          <p style={styles.loginSubtitle}>Inserisci la password per accedere</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={styles.input}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" style={styles.loginBtn}>Accedi</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Dashboard Azzurra</h1>
        <button onClick={() => setIsAuthenticated(false)} style={styles.logoutBtn}>
          Esci
        </button>
      </header>

      {/* Tab Navigation */}
      <nav style={styles.tabs}>
        <button
          style={activeTab === 'stats' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('stats')}
        >
          Statistiche
        </button>
        <button
          style={activeTab === 'curiosities' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('curiosities')}
        >
          Curiosita Dolci
        </button>
        <button
          style={activeTab === 'analytics' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('analytics')}
        >
          Analisi Conversazioni
        </button>
      </nav>

      {loading && <p style={styles.loading}>Caricamento...</p>}

      {/* Tab Content */}
      <main style={styles.content}>
        {activeTab === 'stats' && stats && <StatsTab data={stats} />}
        {activeTab === 'curiosities' && curiosities && <CuriositiesTab data={curiosities} />}
        {activeTab === 'analytics' && analytics && <AnalyticsTab data={analytics} />}
      </main>
    </div>
  );
}

// Componente Tab Statistiche
function StatsTab({ data }) {
  const s = data.stats || {};
  return (
    <div>
      <h2 style={styles.sectionTitle}>Statistiche Generali</h2>
      <div style={styles.cardsGrid}>
        <Card title="Esperienze Totali" value={s.total_experiences || 0} icon="👥" />
        <Card title="Durata Media" value={`${Math.round(s.avg_duration || 0)}s`} icon="⏱️" />
        <Card title="Con Feedback" value={s.with_feedback || 0} icon="💬" />
        <Card title="Regioni Uniche" value={s.unique_regions || 0} icon="🗺️" />
      </div>

      {data.topRegions && data.topRegions.length > 0 && (
        <>
          <h3 style={styles.subsectionTitle}>Top Regioni</h3>
          <div style={styles.list}>
            {data.topRegions.map((r, i) => (
              <div key={i} style={styles.listItem}>
                <span>{r.region || 'N/A'}</span>
                <span style={styles.badge}>{r.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Componente Tab Curiosità
function CuriositiesTab({ data }) {
  return (
    <div>
      <h2 style={styles.sectionTitle}>Curiosita sui Dolci</h2>
      <div style={styles.cardsGrid}>
        <Card title="Ricette Uniche" value={data.totalRecipes || 0} icon="🍰" />
        <Card title="Versioni Totali" value={data.totalVersions || 0} icon="📚" />
        <Card title="Calorie Medie" value={data.avgCalories || 0} icon="🔥" />
        <Card title="Ricettari" value={data.cookbooksCount || 0} icon="📖" />
      </div>

      <div style={styles.twoColumns}>
        <div>
          <h3 style={styles.subsectionTitle}>Ricetta piu Antica</h3>
          {data.oldestRecipe && (
            <div style={styles.highlight}>
              <strong>{data.oldestRecipe.titolo}</strong>
              <p>{data.oldestRecipe.ricettario} ({data.oldestRecipe.anno})</p>
            </div>
          )}

          <h3 style={styles.subsectionTitle}>Piu Calorico</h3>
          {data.mostCaloric && (
            <div style={styles.highlight}>
              <strong>{data.mostCaloric.titolo}</strong>
              <p>{data.mostCaloric.calorie} kcal</p>
            </div>
          )}
        </div>

        <div>
          <h3 style={styles.subsectionTitle}>Ricetta piu Recente</h3>
          {data.newestRecipe && (
            <div style={styles.highlight}>
              <strong>{data.newestRecipe.titolo}</strong>
              <p>{data.newestRecipe.ricettario} ({data.newestRecipe.anno})</p>
            </div>
          )}

          <h3 style={styles.subsectionTitle}>Meno Calorico</h3>
          {data.leastCaloric && (
            <div style={styles.highlight}>
              <strong>{data.leastCaloric.titolo}</strong>
              <p>{data.leastCaloric.calorie} kcal</p>
            </div>
          )}
        </div>
      </div>

      {data.familyDistribution && data.familyDistribution.length > 0 && (
        <>
          <h3 style={styles.subsectionTitle}>Distribuzione per Famiglia</h3>
          <div style={styles.barChart}>
            {data.familyDistribution.map((f, i) => (
              <div key={i} style={styles.barItem}>
                <span style={styles.barLabel}>{f.famiglia}</span>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.bar,
                      width: `${(f.count / data.totalVersions) * 100}%`
                    }}
                  />
                </div>
                <span style={styles.barValue}>{f.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Componente Tab Analytics
function AnalyticsTab({ data }) {
  const g = data.generalStats || {};
  return (
    <div>
      <h2 style={styles.sectionTitle}>Analisi Conversazioni</h2>
      <div style={styles.cardsGrid}>
        <Card title="Conversazioni" value={g.total_conversations || 0} icon="💬" />
        <Card title="Rating Medio" value={(g.avg_rating || 0).toFixed(1)} icon="⭐" />
        <Card title="Positivi (4-5)" value={g.positive_ratings || 0} icon="😊" />
        <Card title="Con Commenti" value={g.with_comments || 0} icon="📝" />
      </div>

      {data.ratingDistribution && data.ratingDistribution.length > 0 && (
        <>
          <h3 style={styles.subsectionTitle}>Distribuzione Rating</h3>
          <div style={styles.barChart}>
            {data.ratingDistribution.map((r, i) => (
              <div key={i} style={styles.barItem}>
                <span style={styles.barLabel}>{'⭐'.repeat(r.rating)}</span>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.bar,
                      width: `${(r.count / g.total_conversations) * 100}%`
                    }}
                  />
                </div>
                <span style={styles.barValue}>{r.count}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {data.ageDistribution && data.ageDistribution.length > 0 && (
        <>
          <h3 style={styles.subsectionTitle}>Per Fascia Eta</h3>
          <div style={styles.list}>
            {data.ageDistribution.map((a, i) => (
              <div key={i} style={styles.listItem}>
                <span>{a.fascia_eta || 'N/A'}</span>
                <span>
                  <span style={styles.badge}>{a.count}</span>
                  <span style={styles.badgeSecondary}>⭐ {(a.avg_rating || 0).toFixed(1)}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {data.recentFeedback && data.recentFeedback.length > 0 && (
        <>
          <h3 style={styles.subsectionTitle}>Ultimi Feedback</h3>
          <div style={styles.feedbackList}>
            {data.recentFeedback.map((f, i) => (
              <div key={i} style={styles.feedbackItem}>
                <div style={styles.feedbackHeader}>
                  <span>{'⭐'.repeat(f.rating || 0)}</span>
                  <span style={styles.feedbackDate}>
                    {new Date(f.timestamp).toLocaleDateString('it-IT')}
                  </span>
                </div>
                <p style={styles.feedbackText}>{f.feedback}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Componente Card
function Card({ title, value, icon }) {
  return (
    <div style={styles.card}>
      <span style={styles.cardIcon}>{icon}</span>
      <div>
        <p style={styles.cardValue}>{value}</p>
        <p style={styles.cardTitle}>{title}</p>
      </div>
    </div>
  );
}

// Stili
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: 'linear-gradient(135deg, #016fab 0%, #014d7a 100%)',
    color: 'white',
    padding: '1.5rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '600'
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    padding: '1rem 2rem',
    backgroundColor: 'white',
    borderBottom: '1px solid #e0e0e0'
  },
  tab: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: '8px',
    color: '#666',
    fontSize: '0.95rem'
  },
  tabActive: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: '#016fab',
    color: 'white',
    cursor: 'pointer',
    borderRadius: '8px',
    fontSize: '0.95rem'
  },
  content: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    color: '#666'
  },
  sectionTitle: {
    color: '#333',
    marginBottom: '1.5rem',
    fontSize: '1.25rem'
  },
  subsectionTitle: {
    color: '#016fab',
    marginTop: '2rem',
    marginBottom: '1rem',
    fontSize: '1rem'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  cardIcon: {
    fontSize: '2rem'
  },
  cardValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#016fab',
    margin: 0
  },
  cardTitle: {
    color: '#666',
    margin: 0,
    fontSize: '0.85rem'
  },
  list: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  listItem: {
    padding: '0.75rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #f0f0f0'
  },
  badge: {
    background: '#016fab',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    marginLeft: '0.5rem'
  },
  badgeSecondary: {
    background: '#f0f0f0',
    color: '#666',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    marginLeft: '0.5rem'
  },
  twoColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem'
  },
  highlight: {
    background: 'white',
    borderRadius: '12px',
    padding: '1rem',
    borderLeft: '4px solid #016fab',
    marginBottom: '1rem'
  },
  barChart: {
    background: 'white',
    borderRadius: '12px',
    padding: '1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  barItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '0.75rem'
  },
  barLabel: {
    width: '120px',
    fontSize: '0.85rem',
    color: '#333'
  },
  barContainer: {
    flex: 1,
    height: '20px',
    background: '#f0f0f0',
    borderRadius: '10px',
    overflow: 'hidden',
    marginRight: '1rem'
  },
  bar: {
    height: '100%',
    background: 'linear-gradient(135deg, #016fab 0%, #014d7a 100%)',
    borderRadius: '10px',
    transition: 'width 0.3s ease'
  },
  barValue: {
    width: '40px',
    textAlign: 'right',
    fontSize: '0.85rem',
    color: '#666'
  },
  feedbackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  feedbackItem: {
    background: 'white',
    borderRadius: '12px',
    padding: '1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  feedbackHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem'
  },
  feedbackDate: {
    color: '#999',
    fontSize: '0.8rem'
  },
  feedbackText: {
    margin: 0,
    color: '#333',
    lineHeight: '1.5'
  },
  // Login styles
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #016fab 0%, #014d7a 100%)'
  },
  loginCard: {
    background: 'white',
    borderRadius: '24px',
    padding: '3rem',
    width: '90%',
    maxWidth: '400px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  loginTitle: {
    color: '#016fab',
    marginBottom: '0.5rem'
  },
  loginSubtitle: {
    color: '#666',
    marginBottom: '2rem'
  },
  input: {
    width: '100%',
    padding: '1rem',
    fontSize: '1rem',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    marginBottom: '1rem',
    boxSizing: 'border-box'
  },
  loginBtn: {
    width: '100%',
    padding: '1rem',
    fontSize: '1rem',
    background: 'linear-gradient(135deg, #016fab 0%, #014d7a 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer'
  },
  error: {
    color: '#dc3545',
    marginBottom: '1rem'
  }
};
