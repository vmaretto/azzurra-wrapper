import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';

// Registra i componenti Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Dashboard Premium - Analytics avanzate senza password
 * Design moderno con Chart.js
 */
export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [curiosities, setCuriosities] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [animatedValues, setAnimatedValues] = useState({});

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Animazione counter
  useEffect(() => {
    if (!stats?.stats && !analytics?.generalStats) return;

    const targets = {
      totalExperiences: parseInt(stats?.stats?.total_experiences) || 0,
      avgRating: parseFloat(analytics?.generalStats?.avg_rating) || 0,
      totalRecipes: parseInt(curiosities?.totalRecipes) || 0,
      avgDuration: parseInt(stats?.stats?.avg_duration) || 0
    };

    const duration = 1500;
    const steps = 60;
    const stepTime = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const eased = 1 - Math.pow(1 - progress, 3);

      setAnimatedValues({
        totalExperiences: Math.round(targets.totalExperiences * eased),
        avgRating: (targets.avgRating * eased).toFixed(1),
        totalRecipes: Math.round(targets.totalRecipes * eased),
        avgDuration: Math.round(targets.avgDuration * eased)
      });

      if (currentStep >= steps) clearInterval(interval);
    }, stepTime);

    return () => clearInterval(interval);
  }, [stats, analytics, curiosities]);

  const sections = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'recipes', label: 'Ricette', icon: '🍰' },
    { id: 'users', label: 'Utenti', icon: '👥' },
    { id: 'feedback', label: 'Feedback', icon: '💬' }
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🍰</span>
            <div>
              <h1 style={styles.title}>Azzurra Analytics</h1>
              <p style={styles.subtitle}>Dashboard Interattiva</p>
            </div>
          </div>
          <a href="/" style={styles.backBtn}>
            Torna all'app
          </a>
        </div>
      </header>

      {/* Navigation */}
      <nav style={styles.nav}>
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={{
              ...styles.navBtn,
              ...(activeSection === section.id ? styles.navBtnActive : {})
            }}
          >
            <span style={styles.navIcon}>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={styles.main}>
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeSection === 'overview' && (
              <OverviewSection
                stats={stats}
                analytics={analytics}
                curiosities={curiosities}
                animatedValues={animatedValues}
              />
            )}
            {activeSection === 'recipes' && (
              <RecipesSection curiosities={curiosities} />
            )}
            {activeSection === 'users' && (
              <UsersSection analytics={analytics} stats={stats} />
            )}
            {activeSection === 'feedback' && (
              <FeedbackSection analytics={analytics} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>Dashboard Azzurra - Tradizione Dolciaria Italiana</p>
      </footer>
    </div>
  );
}

// Sezione Overview con KPI principali
function OverviewSection({ stats, analytics, curiosities, animatedValues }) {
  const g = analytics?.generalStats || {};

  return (
    <div style={styles.section}>
      {/* Hero KPI Cards */}
      <div style={styles.kpiGrid}>
        <KPICard
          icon="👥"
          value={animatedValues.totalExperiences || 0}
          label="Esperienze Totali"
          trend="+12%"
          trendUp={true}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
        <KPICard
          icon="⭐"
          value={animatedValues.avgRating || '0.0'}
          label="Rating Medio"
          suffix="/5"
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        />
        <KPICard
          icon="🍰"
          value={animatedValues.totalRecipes || 0}
          label="Ricette Esplorate"
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        />
        <KPICard
          icon="⏱️"
          value={animatedValues.avgDuration || 0}
          label="Durata Media"
          suffix="s"
          gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        />
      </div>

      {/* Charts Row */}
      <div style={styles.chartsRow}>
        {/* Rating Distribution */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Distribuzione Rating</h3>
          {analytics?.ratingDistribution && (
            <div style={styles.chartContainer}>
              <Doughnut
                data={{
                  labels: analytics.ratingDistribution.map(r => `${r.rating} stelle`),
                  datasets: [{
                    data: analytics.ratingDistribution.map(r => parseInt(r.count)),
                    backgroundColor: [
                      '#dc3545',
                      '#fd7e14',
                      '#ffc107',
                      '#20c997',
                      '#016fab'
                    ],
                    borderWidth: 0
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { padding: 15, usePointStyle: true }
                    }
                  },
                  cutout: '65%'
                }}
              />
            </div>
          )}
        </div>

        {/* Daily Trend */}
        <div style={{ ...styles.chartCard, flex: 2 }}>
          <h3 style={styles.chartTitle}>Trend Ultimi 30 Giorni</h3>
          {analytics?.dailyTrend && analytics.dailyTrend.length > 0 && (
            <div style={styles.chartContainer}>
              <Line
                data={{
                  labels: analytics.dailyTrend.slice().reverse().map(d =>
                    new Date(d.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
                  ),
                  datasets: [{
                    label: 'Sessioni',
                    data: analytics.dailyTrend.slice().reverse().map(d => parseInt(d.count)),
                    borderColor: '#016fab',
                    backgroundColor: 'rgba(1, 111, 171, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#016fab',
                    pointRadius: 4,
                    pointHoverRadius: 6
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                      grid: { display: false }
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sezione Ricette con analytics dolci
function RecipesSection({ curiosities }) {
  if (!curiosities) return <EmptyState message="Dati ricette non disponibili" />;

  return (
    <div style={styles.section}>
      <div style={styles.kpiGrid}>
        <KPICard
          icon="📚"
          value={curiosities.totalVersions || 0}
          label="Versioni Totali"
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
        <KPICard
          icon="🔥"
          value={curiosities.avgCalories || 0}
          label="Calorie Medie"
          suffix=" kcal"
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        />
        <KPICard
          icon="📖"
          value={curiosities.cookbooksCount || 0}
          label="Ricettari"
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        />
      </div>

      <div style={styles.chartsRow}>
        {/* Distribuzione Famiglie */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Categorie Dolci</h3>
          {curiosities.familyDistribution && (
            <div style={styles.chartContainer}>
              <Pie
                data={{
                  labels: curiosities.familyDistribution.map(f => f.famiglia),
                  datasets: [{
                    data: curiosities.familyDistribution.map(f => parseInt(f.count)),
                    backgroundColor: [
                      '#016fab',
                      '#00b4d8',
                      '#90e0ef',
                      '#48cae4',
                      '#0096c7',
                      '#023e8a'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: { padding: 10, usePointStyle: true }
                    }
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Ricette Storiche */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Ricette Iconiche</h3>
          <div style={styles.recipeHighlights}>
            {curiosities.oldestRecipe && (
              <div style={styles.recipeCard}>
                <span style={styles.recipeEmoji}>🏛️</span>
                <div>
                  <p style={styles.recipeLabel}>Piu Antica</p>
                  <p style={styles.recipeName}>{curiosities.oldestRecipe.titolo}</p>
                  <p style={styles.recipeDetail}>{curiosities.oldestRecipe.anno}</p>
                </div>
              </div>
            )}
            {curiosities.newestRecipe && (
              <div style={styles.recipeCard}>
                <span style={styles.recipeEmoji}>✨</span>
                <div>
                  <p style={styles.recipeLabel}>Piu Recente</p>
                  <p style={styles.recipeName}>{curiosities.newestRecipe.titolo}</p>
                  <p style={styles.recipeDetail}>{curiosities.newestRecipe.anno}</p>
                </div>
              </div>
            )}
            {curiosities.mostCaloric && (
              <div style={styles.recipeCard}>
                <span style={styles.recipeEmoji}>🔥</span>
                <div>
                  <p style={styles.recipeLabel}>Piu Calorico</p>
                  <p style={styles.recipeName}>{curiosities.mostCaloric.titolo}</p>
                  <p style={styles.recipeDetail}>{curiosities.mostCaloric.calorie} kcal</p>
                </div>
              </div>
            )}
            {curiosities.leastCaloric && (
              <div style={styles.recipeCard}>
                <span style={styles.recipeEmoji}>🥗</span>
                <div>
                  <p style={styles.recipeLabel}>Piu Leggero</p>
                  <p style={styles.recipeName}>{curiosities.leastCaloric.titolo}</p>
                  <p style={styles.recipeDetail}>{curiosities.leastCaloric.calorie} kcal</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sezione Utenti con demographics
function UsersSection({ analytics, stats }) {
  return (
    <div style={styles.section}>
      <div style={styles.chartsRow}>
        {/* Per Fascia Eta */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Distribuzione per Eta</h3>
          {analytics?.ageDistribution && (
            <div style={styles.chartContainer}>
              <Bar
                data={{
                  labels: analytics.ageDistribution.map(a => a.fascia_eta || 'N/A'),
                  datasets: [{
                    label: 'Utenti',
                    data: analytics.ageDistribution.map(a => parseInt(a.count)),
                    backgroundColor: 'rgba(1, 111, 171, 0.8)',
                    borderRadius: 8,
                    borderSkipped: false
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { color: 'rgba(0,0,0,0.05)' } },
                    y: { grid: { display: false } }
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Per Sesso */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Distribuzione per Sesso</h3>
          {analytics?.genderDistribution && (
            <div style={styles.chartContainer}>
              <Doughnut
                data={{
                  labels: analytics.genderDistribution.map(g => g.sesso || 'Non specificato'),
                  datasets: [{
                    data: analytics.genderDistribution.map(g => parseInt(g.count)),
                    backgroundColor: ['#016fab', '#f093fb', '#90e0ef'],
                    borderWidth: 0
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '60%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { usePointStyle: true }
                    }
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Distribuzione Oraria */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Attivita per Ora</h3>
          {analytics?.hourlyDistribution && (
            <div style={styles.chartContainer}>
              <Bar
                data={{
                  labels: analytics.hourlyDistribution.map(h => `${h.hour}:00`),
                  datasets: [{
                    label: 'Sessioni',
                    data: analytics.hourlyDistribution.map(h => parseInt(h.count)),
                    backgroundColor: analytics.hourlyDistribution.map((h, i) => {
                      const hour = parseInt(h.hour);
                      if (hour >= 8 && hour <= 12) return 'rgba(67, 233, 123, 0.8)';
                      if (hour >= 14 && hour <= 18) return 'rgba(1, 111, 171, 0.8)';
                      return 'rgba(144, 224, 239, 0.6)';
                    }),
                    borderRadius: 4
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Top Regioni */}
      {stats?.topRegions && stats.topRegions.length > 0 && (
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Top Regioni</h3>
          <div style={styles.regionsList}>
            {stats.topRegions.slice(0, 8).map((region, i) => (
              <div key={i} style={styles.regionItem}>
                <div style={styles.regionRank}>{i + 1}</div>
                <div style={styles.regionInfo}>
                  <span style={styles.regionName}>{region.region || 'Non specificata'}</span>
                  <div style={styles.regionBarContainer}>
                    <div
                      style={{
                        ...styles.regionBar,
                        width: `${(parseInt(region.count) / parseInt(stats.topRegions[0].count)) * 100}%`
                      }}
                    />
                  </div>
                </div>
                <span style={styles.regionCount}>{region.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Sezione Feedback
function FeedbackSection({ analytics }) {
  const g = analytics?.generalStats || {};

  return (
    <div style={styles.section}>
      {/* KPI Feedback */}
      <div style={styles.kpiGrid}>
        <KPICard
          icon="😊"
          value={g.positive_ratings || 0}
          label="Feedback Positivi (4-5)"
          gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
        />
        <KPICard
          icon="😐"
          value={(parseInt(g.total_conversations) || 0) - (parseInt(g.positive_ratings) || 0) - (parseInt(g.negative_ratings) || 0)}
          label="Feedback Neutri (3)"
          gradient="linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
        />
        <KPICard
          icon="😟"
          value={g.negative_ratings || 0}
          label="Feedback Negativi (1-2)"
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        />
        <KPICard
          icon="📝"
          value={g.with_comments || 0}
          label="Con Commento"
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
      </div>

      {/* Ultimi Feedback */}
      {analytics?.recentFeedback && analytics.recentFeedback.length > 0 && (
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Ultimi Commenti</h3>
          <div style={styles.feedbackList}>
            {analytics.recentFeedback.map((feedback, i) => (
              <div key={i} style={styles.feedbackItem}>
                <div style={styles.feedbackHeader}>
                  <div style={styles.feedbackStars}>
                    {'★'.repeat(feedback.rating || 0)}
                    {'☆'.repeat(5 - (feedback.rating || 0))}
                  </div>
                  <span style={styles.feedbackDate}>
                    {new Date(feedback.timestamp).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <p style={styles.feedbackText}>{feedback.feedback}</p>
                {feedback.fascia_eta && (
                  <span style={styles.feedbackTag}>{feedback.fascia_eta}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente KPI Card
function KPICard({ icon, value, label, suffix = '', trend, trendUp, gradient }) {
  return (
    <div style={{ ...styles.kpiCard, background: gradient }}>
      <div style={styles.kpiIcon}>{icon}</div>
      <div style={styles.kpiContent}>
        <div style={styles.kpiValue}>
          {value}{suffix}
        </div>
        <div style={styles.kpiLabel}>{label}</div>
        {trend && (
          <div style={{
            ...styles.kpiTrend,
            color: trendUp ? '#2ecc71' : '#e74c3c'
          }}>
            {trendUp ? '↑' : '↓'} {trend}
          </div>
        )}
      </div>
    </div>
  );
}

// Loading State
function LoadingState() {
  return (
    <div style={styles.loadingContainer}>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>Caricamento analytics...</p>
    </div>
  );
}

// Empty State
function EmptyState({ message }) {
  return (
    <div style={styles.emptyState}>
      <span style={styles.emptyIcon}>📊</span>
      <p>{message}</p>
    </div>
  );
}

// Stili
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f4f8',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: 'linear-gradient(135deg, #016fab 0%, #014d7a 100%)',
    padding: '1.5rem 2rem',
    boxShadow: '0 4px 20px rgba(1, 77, 122, 0.3)'
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  logoIcon: {
    fontSize: '2.5rem'
  },
  title: {
    margin: 0,
    color: 'white',
    fontSize: '1.75rem',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.9rem'
  },
  backBtn: {
    background: 'rgba(255,255,255,0.15)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background 0.2s ease',
    border: '1px solid rgba(255,255,255,0.2)'
  },
  nav: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    gap: '0.5rem',
    padding: '1rem 2rem',
    overflowX: 'auto'
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '12px',
    background: 'white',
    color: '#666',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    whiteSpace: 'nowrap'
  },
  navBtnActive: {
    background: 'linear-gradient(135deg, #016fab 0%, #014d7a 100%)',
    color: 'white',
    boxShadow: '0 4px 15px rgba(1, 111, 171, 0.4)'
  },
  navIcon: {
    fontSize: '1.2rem'
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 2rem 2rem'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem'
  },
  kpiCard: {
    borderRadius: '16px',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    color: 'white'
  },
  kpiIcon: {
    fontSize: '2.5rem',
    opacity: 0.9
  },
  kpiContent: {
    flex: 1
  },
  kpiValue: {
    fontSize: '2rem',
    fontWeight: '700',
    lineHeight: 1.2
  },
  kpiLabel: {
    fontSize: '0.85rem',
    opacity: 0.9,
    marginTop: '0.25rem'
  },
  kpiTrend: {
    fontSize: '0.8rem',
    fontWeight: '600',
    marginTop: '0.5rem'
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1.5rem'
  },
  chartCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
  },
  chartTitle: {
    margin: '0 0 1rem 0',
    color: '#2d3748',
    fontSize: '1rem',
    fontWeight: '600'
  },
  chartContainer: {
    height: '280px',
    position: 'relative'
  },
  recipeHighlights: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },
  recipeCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  recipeEmoji: {
    fontSize: '1.75rem'
  },
  recipeLabel: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  recipeName: {
    margin: '0.25rem 0',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#2d3748'
  },
  recipeDetail: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#016fab'
  },
  regionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  regionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  regionRank: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #016fab 0%, #014d7a 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: '600'
  },
  regionInfo: {
    flex: 1
  },
  regionName: {
    fontSize: '0.9rem',
    color: '#2d3748',
    display: 'block',
    marginBottom: '0.25rem'
  },
  regionBarContainer: {
    height: '6px',
    background: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  regionBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #016fab 0%, #00b4d8 100%)',
    borderRadius: '3px',
    transition: 'width 0.5s ease'
  },
  regionCount: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#016fab',
    minWidth: '40px',
    textAlign: 'right'
  },
  feedbackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  feedbackItem: {
    padding: '1rem',
    background: '#f8fafc',
    borderRadius: '12px',
    borderLeft: '4px solid #016fab'
  },
  feedbackHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  feedbackStars: {
    color: '#ffc107',
    fontSize: '1rem',
    letterSpacing: '2px'
  },
  feedbackDate: {
    fontSize: '0.8rem',
    color: '#718096'
  },
  feedbackText: {
    margin: 0,
    color: '#4a5568',
    fontSize: '0.9rem',
    lineHeight: '1.6'
  },
  feedbackTag: {
    display: 'inline-block',
    marginTop: '0.5rem',
    padding: '0.25rem 0.75rem',
    background: '#e2e8f0',
    borderRadius: '20px',
    fontSize: '0.75rem',
    color: '#4a5568'
  },
  footer: {
    textAlign: 'center',
    padding: '2rem',
    color: '#718096',
    fontSize: '0.85rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    gap: '1rem'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #016fab',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: '#718096',
    fontSize: '1rem'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    background: 'white',
    borderRadius: '16px',
    color: '#718096'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
    opacity: 0.5
  }
};

// Aggiungi keyframes per spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
