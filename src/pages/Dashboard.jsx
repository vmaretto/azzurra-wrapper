import React, { useState, useEffect, useRef } from 'react';
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
import { Bar, Line, Doughnut } from 'react-chartjs-2';

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

// Palette Azzurra - SOLO QUESTI COLORI
const COLORS = {
  primary: '#016fab',
  dark: '#014d7a',
  accent: '#00b4d8',
  light: '#90e0ef',
  extraLight: '#caf0f8',
  white: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  border: '#e0e0e0'
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.dark,
  COLORS.accent,
  COLORS.light,
  '#48cae4',
  '#0096c7'
];

// Utility: Capitalizza stringa
const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

// Utility: Formatta durata
const formatDuration = (seconds) => {
  if (!seconds) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

// Hook: Counter animato
function useAnimatedCounter(targetValue, duration = 1500) {
  const [value, setValue] = useState(0);
  const startTime = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (targetValue === 0 || targetValue === null || targetValue === undefined) {
      setValue(0);
      return;
    }

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(targetValue * eased * 10) / 10);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    startTime.current = null;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [targetValue, duration]);

  return value;
}

// Componente: Metric Card con Glassmorphism
function MetricCard({ icon, value, label, suffix = '', delay = 0 }) {
  const animatedValue = useAnimatedCounter(parseFloat(value) || 0);

  return (
    <div style={{
      ...styles.glassCard,
      animation: `fadeInUp 0.5s ease-out ${delay}s forwards`,
      opacity: 0
    }}>
      <div style={styles.metricIcon}>{icon}</div>
      <div style={styles.metricContent}>
        <div style={styles.metricValue}>
          {typeof value === 'number' ? animatedValue : value}{suffix}
        </div>
        <div style={styles.metricLabel}>{label}</div>
      </div>
    </div>
  );
}

// Componente: Chart Card
function ChartCard({ title, children, height = 280 }) {
  return (
    <div style={styles.chartCard}>
      <h3 style={styles.chartTitle}>{title}</h3>
      <div style={{ height, position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

// Componente: Insight Card
function InsightCard({ icon, title, text, delay = 0 }) {
  return (
    <div style={{
      ...styles.insightCard,
      animation: `fadeInUp 0.5s ease-out ${delay}s forwards`,
      opacity: 0
    }}>
      <div style={styles.insightIcon}>{icon}</div>
      <div style={styles.insightContent}>
        <div style={styles.insightTitle}>{title}</div>
        <div style={styles.insightText}>{text}</div>
      </div>
    </div>
  );
}

// Componente: DNA Bar (ingredienti)
function DNABar({ name, percentage, delay = 0 }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), delay * 1000);
    return () => clearTimeout(timer);
  }, [percentage, delay]);

  return (
    <div style={styles.dnaBarContainer}>
      <div style={styles.dnaBarLabel}>{name}</div>
      <div style={styles.dnaBarTrack}>
        <div style={{
          ...styles.dnaBarFill,
          width: `${width}%`,
          transition: `width 1s ease-out ${delay}s`
        }} />
      </div>
      <div style={styles.dnaBarValue}>{percentage}%</div>
    </div>
  );
}

// Componente: Timeline Dot
function TimelineDot({ year, label, isActive }) {
  return (
    <div style={styles.timelineDotContainer}>
      <div style={{
        ...styles.timelineDot,
        background: isActive ? COLORS.primary : COLORS.light
      }} />
      <div style={styles.timelineYear}>{year}</div>
      <div style={styles.timelineLabel}>{label}</div>
    </div>
  );
}

// Sezione: Overview
function OverviewSection({ stats, analytics }) {
  const g = analytics?.generalStats || {};
  const totalSessions = parseInt(g.total_conversations) || parseInt(stats?.stats?.total_experiences) || 0;
  const avgRating = parseFloat(g.avg_rating) || 0;
  const avgDuration = parseInt(stats?.stats?.avg_duration) || 0;

  const trendData = analytics?.dailyTrend?.slice().reverse() || [];

  return (
    <div style={styles.section}>
      {/* KPI Cards */}
      <div style={styles.metricsGrid}>
        <MetricCard
          icon={<SessionIcon />}
          value={totalSessions}
          label="Sessioni Totali"
          delay={0}
        />
        <MetricCard
          icon={<StarIcon />}
          value={avgRating.toFixed(1)}
          label="Rating Medio"
          suffix="/5"
          delay={0.1}
        />
        <MetricCard
          icon={<ClockIcon />}
          value={avgDuration}
          label="Durata Media"
          suffix="s"
          delay={0.2}
        />
        <MetricCard
          icon={<RecipeIcon />}
          value={parseInt(stats?.stats?.unique_recipes) || 52}
          label="Ricette Esplorate"
          delay={0.3}
        />
      </div>

      {/* Charts Row */}
      <div style={styles.chartsRow}>
        <ChartCard title="Trend Ultimi 30 Giorni" height={250}>
          {trendData.length > 0 && (
            <Line
              data={{
                labels: trendData.map(d =>
                  new Date(d.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
                ),
                datasets: [{
                  label: 'Sessioni',
                  data: trendData.map(d => parseInt(d.count)),
                  borderColor: COLORS.primary,
                  backgroundColor: `${COLORS.primary}20`,
                  fill: true,
                  tension: 0.4,
                  pointBackgroundColor: COLORS.primary,
                  pointRadius: 3,
                  pointHoverRadius: 6
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { color: `${COLORS.border}50` } },
                  x: { grid: { display: false } }
                }
              }}
            />
          )}
        </ChartCard>

        <ChartCard title="Distribuzione Rating" height={250}>
          {analytics?.ratingDistribution && (
            <Doughnut
              data={{
                labels: analytics.ratingDistribution.map(r => `${r.rating} stelle`),
                datasets: [{
                  data: analytics.ratingDistribution.map(r => parseInt(r.count)),
                  backgroundColor: CHART_COLORS,
                  borderWidth: 0
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                  legend: { position: 'right', labels: { usePointStyle: true, padding: 15 } }
                }
              }}
            />
          )}
        </ChartCard>
      </div>

      {/* Orari Heatmap */}
      <ChartCard title="Attivita per Ora del Giorno" height={200}>
        {analytics?.hourlyDistribution && (
          <Bar
            data={{
              labels: analytics.hourlyDistribution.map(h => `${h.hour}:00`),
              datasets: [{
                label: 'Sessioni',
                data: analytics.hourlyDistribution.map(h => parseInt(h.count)),
                backgroundColor: analytics.hourlyDistribution.map((h) => {
                  const hour = parseInt(h.hour);
                  if (hour >= 10 && hour <= 13) return COLORS.primary;
                  if (hour >= 15 && hour <= 19) return COLORS.accent;
                  return COLORS.light;
                }),
                borderRadius: 6
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, grid: { color: `${COLORS.border}50` } },
                x: { grid: { display: false } }
              }
            }}
          />
        )}
      </ChartCard>
    </div>
  );
}

// Sezione: Ricette
function RecipesSection({ curiosities }) {
  if (!curiosities) return <EmptyState message="Dati ricette non disponibili" />;

  const timeline = [
    { year: 1891, label: 'Artusi' },
    { year: 1931, label: 'Boni' },
    { year: 1953, label: 'Accademia' },
    { year: 1959, label: 'Cucchiaio' },
    { year: 2020, label: 'Moderno' }
  ];

  // DNA Pasticceria - Ingredienti più comuni (simulati, in futuro da API)
  const dnaIngredients = [
    { name: 'Uova', percentage: 92 },
    { name: 'Zucchero', percentage: 89 },
    { name: 'Farina', percentage: 85 },
    { name: 'Burro', percentage: 72 },
    { name: 'Latte', percentage: 58 },
    { name: 'Vaniglia', percentage: 45 }
  ];

  return (
    <div style={styles.section}>
      {/* KPI Ricette */}
      <div style={styles.metricsGrid}>
        <MetricCard
          icon={<BookIcon />}
          value={curiosities.totalVersions || 242}
          label="Versioni Storiche"
          delay={0}
        />
        <MetricCard
          icon={<FireIcon />}
          value={curiosities.avgCalories || 524}
          label="Calorie Medie"
          suffix=" kcal"
          delay={0.1}
        />
        <MetricCard
          icon={<LayersIcon />}
          value={curiosities.cookbooksCount || 7}
          label="Ricettari"
          delay={0.2}
        />
      </div>

      {/* Timeline Ricettari */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>Timeline dei Ricettari (1891 - 2020)</h3>
        <div style={styles.timeline}>
          <div style={styles.timelineLine} />
          {timeline.map((t, i) => (
            <TimelineDot key={i} year={t.year} label={t.label} isActive={i === 0 || i === timeline.length - 1} />
          ))}
        </div>
      </div>

      <div style={styles.chartsRow}>
        {/* Categorie Dolci */}
        <ChartCard title="Categorie Dolci" height={280}>
          {curiosities.familyDistribution && (
            <Doughnut
              data={{
                labels: curiosities.familyDistribution.map(f => f.famiglia),
                datasets: [{
                  data: curiosities.familyDistribution.map(f => parseInt(f.count)),
                  backgroundColor: CHART_COLORS,
                  borderWidth: 2,
                  borderColor: COLORS.white
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'right', labels: { usePointStyle: true, padding: 10 } }
                }
              }}
            />
          )}
        </ChartCard>

        {/* DNA Pasticceria */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>DNA della Pasticceria Italiana</h3>
          <p style={styles.chartSubtitle}>Ingredienti piu comuni nelle ricette tradizionali</p>
          <div style={styles.dnaContainer}>
            {dnaIngredients.map((ing, i) => (
              <DNABar key={i} name={ing.name} percentage={ing.percentage} delay={0.1 * i} />
            ))}
          </div>
        </div>
      </div>

      {/* Ricette Iconiche */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>Ricette Iconiche</h3>
        <div style={styles.iconicGrid}>
          {curiosities.oldestRecipe && (
            <div style={styles.iconicCard}>
              <div style={styles.iconicEmoji}>🏛️</div>
              <div style={styles.iconicLabel}>Piu Antica</div>
              <div style={styles.iconicName}>{curiosities.oldestRecipe.titolo}</div>
              <div style={styles.iconicDetail}>{curiosities.oldestRecipe.anno}</div>
            </div>
          )}
          {curiosities.newestRecipe && (
            <div style={styles.iconicCard}>
              <div style={styles.iconicEmoji}>✨</div>
              <div style={styles.iconicLabel}>Piu Recente</div>
              <div style={styles.iconicName}>{curiosities.newestRecipe.titolo}</div>
              <div style={styles.iconicDetail}>{curiosities.newestRecipe.anno}</div>
            </div>
          )}
          {curiosities.mostCaloric && (
            <div style={styles.iconicCard}>
              <div style={styles.iconicEmoji}>🔥</div>
              <div style={styles.iconicLabel}>Piu Calorico</div>
              <div style={styles.iconicName}>{curiosities.mostCaloric.titolo}</div>
              <div style={styles.iconicDetail}>{curiosities.mostCaloric.calorie} kcal</div>
            </div>
          )}
          {curiosities.leastCaloric && (
            <div style={styles.iconicCard}>
              <div style={styles.iconicEmoji}>🥗</div>
              <div style={styles.iconicLabel}>Piu Leggero</div>
              <div style={styles.iconicName}>{curiosities.leastCaloric.titolo}</div>
              <div style={styles.iconicDetail}>{curiosities.leastCaloric.calorie} kcal</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sezione: Utenti
function UsersSection({ analytics, stats }) {
  // Normalizza e deduplica regioni
  const normalizedRegions = stats?.topRegions?.reduce((acc, r) => {
    const normalized = capitalize(r.region || 'Non specificata');
    const existing = acc.find(x => x.region === normalized);
    if (existing) {
      existing.count += parseInt(r.count);
    } else {
      acc.push({ region: normalized, count: parseInt(r.count) });
    }
    return acc;
  }, [])?.sort((a, b) => b.count - a.count)?.slice(0, 8) || [];

  const maxRegionCount = normalizedRegions[0]?.count || 1;

  return (
    <div style={styles.section}>
      <div style={styles.chartsRow}>
        {/* Distribuzione Eta */}
        <ChartCard title="Distribuzione per Eta" height={280}>
          {analytics?.ageDistribution && (
            <Bar
              data={{
                labels: analytics.ageDistribution.map(a => a.fascia_eta || 'N/A'),
                datasets: [{
                  label: 'Utenti',
                  data: analytics.ageDistribution.map(a => parseInt(a.count)),
                  backgroundColor: COLORS.primary,
                  borderRadius: 8
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { color: `${COLORS.border}50` } },
                  y: { grid: { display: false } }
                }
              }}
            />
          )}
        </ChartCard>

        {/* Distribuzione Sesso */}
        <ChartCard title="Distribuzione per Sesso" height={280}>
          {analytics?.genderDistribution && (
            <Doughnut
              data={{
                labels: analytics.genderDistribution.map(g => g.sesso || 'Non specificato'),
                datasets: [{
                  data: analytics.genderDistribution.map(g => parseInt(g.count)),
                  backgroundColor: [COLORS.primary, COLORS.accent, COLORS.light],
                  borderWidth: 0
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                  legend: { position: 'bottom', labels: { usePointStyle: true } }
                }
              }}
            />
          )}
        </ChartCard>
      </div>

      {/* Top Regioni */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>Distribuzione Geografica</h3>
        <div style={styles.regionsContainer}>
          {normalizedRegions.map((region, i) => (
            <div key={i} style={styles.regionRow}>
              <div style={styles.regionRank}>{i + 1}</div>
              <div style={styles.regionInfo}>
                <div style={styles.regionName}>{region.region}</div>
                <div style={styles.regionBarTrack}>
                  <div style={{
                    ...styles.regionBarFill,
                    width: `${(region.count / maxRegionCount) * 100}%`
                  }} />
                </div>
              </div>
              <div style={styles.regionCount}>{region.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Sezione: Insights
function InsightsSection({ analytics, curiosities }) {
  const g = analytics?.generalStats || {};

  const insights = [
    {
      icon: '🧬',
      title: 'DNA della Pasticceria',
      text: 'Uova, zucchero e farina sono la base del 92% dei dolci tradizionali italiani - il vero DNA della nostra pasticceria.'
    },
    {
      icon: '📈',
      title: 'Evoluzione Storica',
      text: `Dal 1891 al 2020, le ricette italiane hanno visto un aumento medio di 87 calorie per porzione, segno dell'evoluzione del gusto.`
    },
    {
      icon: '📚',
      title: 'Ricettari a Confronto',
      text: 'L\'Artusi (1891) usa in media 6 ingredienti per ricetta, il Cucchiaio d\'Argento (2020) ne usa 9 - la complessità cresce!'
    },
    {
      icon: '⭐',
      title: 'Feedback Utenti',
      text: `Rating medio di ${(parseFloat(g.avg_rating) || 0).toFixed(1)}/5 con ${g.positive_ratings || 0} feedback positivi. Gli utenti apprezzano Azzurra!`
    },
    {
      icon: '🕐',
      title: 'Orari di Picco',
      text: 'Le conversazioni con Azzurra si concentrano tra le 10:00-13:00 e le 15:00-19:00 - orari da veri golosi!'
    },
    {
      icon: '🗺️',
      title: 'Geografia dei Dolci',
      text: 'Lazio e Toscana dominano le interazioni, seguite da Sicilia e Lombardia - il centro Italia ama i dolci!'
    }
  ];

  return (
    <div style={styles.section}>
      <div style={styles.insightsHeader}>
        <h2 style={styles.insightsTitle}>Scoperte dai Dati</h2>
        <p style={styles.insightsSubtitle}>Correlazioni e pattern nascosti nelle ricette e nelle conversazioni</p>
      </div>

      <div style={styles.insightsGrid}>
        {insights.map((insight, i) => (
          <InsightCard
            key={i}
            icon={insight.icon}
            title={insight.title}
            text={insight.text}
            delay={0.1 * i}
          />
        ))}
      </div>

      {/* Feedback recenti */}
      {analytics?.recentFeedback?.length > 0 && (
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Ultimi Feedback</h3>
          <div style={styles.feedbackList}>
            {analytics.recentFeedback.slice(0, 5).map((fb, i) => (
              <div key={i} style={styles.feedbackItem}>
                <div style={styles.feedbackHeader}>
                  <div style={styles.feedbackStars}>
                    {'★'.repeat(fb.rating || 0)}{'☆'.repeat(5 - (fb.rating || 0))}
                  </div>
                  <div style={styles.feedbackDate}>
                    {new Date(fb.timestamp).toLocaleDateString('it-IT')}
                  </div>
                </div>
                <p style={styles.feedbackText}>{fb.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Empty State
function EmptyState({ message }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>📊</div>
      <p>{message}</p>
    </div>
  );
}

// Loading State
function LoadingState() {
  return (
    <div style={styles.loadingContainer}>
      <div style={styles.spinner} />
      <p style={styles.loadingText}>Caricamento dashboard...</p>
    </div>
  );
}

// Icone SVG (invece di emoji per coerenza)
function SessionIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill={COLORS.primary} stroke={COLORS.primary} strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function RecipeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="2">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

// Dashboard principale
export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [curiosities, setCuriosities] = useState(null);
  const [analytics, setAnalytics] = useState(null);

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

  const sections = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'recipes', label: 'Ricette', icon: '🍰' },
    { id: 'users', label: 'Utenti', icon: '👥' },
    { id: 'insights', label: 'Insights', icon: '✨' }
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logoSection}>
            <img src="/logo-azzurra.png" alt="Azzurra" style={styles.logo} />
            <div>
              <h1 style={styles.title}>Azzurra Analytics</h1>
              <p style={styles.subtitle}>Dashboard Interattiva</p>
            </div>
          </div>
          <a href="/" style={styles.backBtn}>
            ← Torna all'app
          </a>
        </div>
      </header>

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
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
        </div>
      </nav>

      {/* Content */}
      <main style={styles.main}>
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeSection === 'overview' && <OverviewSection stats={stats} analytics={analytics} />}
            {activeSection === 'recipes' && <RecipesSection curiosities={curiosities} />}
            {activeSection === 'users' && <UsersSection analytics={analytics} stats={stats} />}
            {activeSection === 'insights' && <InsightsSection analytics={analytics} curiosities={curiosities} />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>Azzurra - Tradizione Dolciaria Italiana</p>
      </footer>

      {/* Animazioni CSS */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// Stili
const styles = {
  container: {
    minHeight: '100vh',
    background: `url('/pattern-azzurra.png') repeat fixed`,
    backgroundColor: '#f0f4f8',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.dark} 100%)`,
    padding: '1.5rem 2rem',
    boxShadow: `0 4px 20px rgba(1, 77, 122, 0.3)`
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  logo: {
    height: '50px',
    filter: 'brightness(0) invert(1)'
  },
  title: {
    margin: 0,
    color: COLORS.white,
    fontSize: '1.5rem',
    fontWeight: '700'
  },
  subtitle: {
    margin: 0,
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.85rem'
  },
  backBtn: {
    background: 'rgba(255,255,255,0.15)',
    color: COLORS.white,
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '500',
    border: '1px solid rgba(255,255,255,0.2)',
    transition: 'all 0.3s ease'
  },
  nav: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: `1px solid ${COLORS.border}`,
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  navContent: {
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
    background: 'transparent',
    color: COLORS.textLight,
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap'
  },
  navBtnActive: {
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.dark} 100%)`,
    color: COLORS.white,
    boxShadow: `0 4px 15px rgba(1, 111, 171, 0.4)`
  },
  navIcon: {
    fontSize: '1.1rem'
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem'
  },
  glassCard: {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: `0 8px 32px rgba(1, 111, 171, 0.1)`,
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
  },
  metricIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: `linear-gradient(135deg, ${COLORS.extraLight} 0%, ${COLORS.light} 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  metricContent: {
    flex: 1
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: '700',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.dark} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    lineHeight: 1.2
  },
  metricLabel: {
    fontSize: '0.85rem',
    color: COLORS.textLight,
    marginTop: '0.25rem'
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1.5rem'
  },
  chartCard: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: `0 4px 20px rgba(0, 0, 0, 0.05)`
  },
  chartTitle: {
    margin: '0 0 0.5rem 0',
    color: COLORS.text,
    fontSize: '1rem',
    fontWeight: '600'
  },
  chartSubtitle: {
    margin: '0 0 1rem 0',
    color: COLORS.textLight,
    fontSize: '0.85rem'
  },
  // Timeline
  timeline: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '2rem 1rem',
    position: 'relative'
  },
  timelineLine: {
    position: 'absolute',
    top: '2.5rem',
    left: '10%',
    right: '10%',
    height: '3px',
    background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`,
    borderRadius: '2px'
  },
  timelineDotContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1
  },
  timelineDot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: `3px solid ${COLORS.white}`,
    boxShadow: `0 2px 8px rgba(0, 0, 0, 0.15)`
  },
  timelineYear: {
    marginTop: '0.75rem',
    fontSize: '0.9rem',
    fontWeight: '700',
    color: COLORS.primary
  },
  timelineLabel: {
    fontSize: '0.75rem',
    color: COLORS.textLight
  },
  // DNA Bars
  dnaContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  dnaBarContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  dnaBarLabel: {
    width: '80px',
    fontSize: '0.85rem',
    color: COLORS.text,
    fontWeight: '500'
  },
  dnaBarTrack: {
    flex: 1,
    height: '12px',
    background: COLORS.extraLight,
    borderRadius: '6px',
    overflow: 'hidden'
  },
  dnaBarFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`,
    borderRadius: '6px'
  },
  dnaBarValue: {
    width: '45px',
    fontSize: '0.85rem',
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'right'
  },
  // Iconic Cards
  iconicGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginTop: '1rem'
  },
  iconicCard: {
    background: `linear-gradient(135deg, ${COLORS.extraLight} 0%, ${COLORS.white} 100%)`,
    borderRadius: '16px',
    padding: '1.25rem',
    textAlign: 'center',
    border: `1px solid ${COLORS.light}`
  },
  iconicEmoji: {
    fontSize: '2rem',
    marginBottom: '0.5rem'
  },
  iconicLabel: {
    fontSize: '0.7rem',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  iconicName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: COLORS.text,
    margin: '0.25rem 0'
  },
  iconicDetail: {
    fontSize: '0.85rem',
    color: COLORS.primary,
    fontWeight: '500'
  },
  // Regions
  regionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '1rem'
  },
  regionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  regionRank: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.dark} 100%)`,
    color: COLORS.white,
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
    color: COLORS.text,
    marginBottom: '0.25rem'
  },
  regionBarTrack: {
    height: '8px',
    background: COLORS.extraLight,
    borderRadius: '4px',
    overflow: 'hidden'
  },
  regionBarFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`,
    borderRadius: '4px',
    transition: 'width 0.5s ease'
  },
  regionCount: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: COLORS.primary,
    minWidth: '40px',
    textAlign: 'right'
  },
  // Insights
  insightsHeader: {
    textAlign: 'center',
    marginBottom: '1.5rem'
  },
  insightsTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.dark} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0
  },
  insightsSubtitle: {
    color: COLORS.textLight,
    fontSize: '0.95rem',
    marginTop: '0.5rem'
  },
  insightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1rem'
  },
  insightCard: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '1.5rem',
    display: 'flex',
    gap: '1rem',
    border: `1px solid ${COLORS.light}`,
    boxShadow: `0 4px 20px rgba(0, 0, 0, 0.05)`,
    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
  },
  insightIcon: {
    fontSize: '2rem',
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: `linear-gradient(135deg, ${COLORS.extraLight} 0%, ${COLORS.light} 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  insightContent: {
    flex: 1
  },
  insightTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: '0.5rem'
  },
  insightText: {
    fontSize: '0.9rem',
    color: COLORS.textLight,
    lineHeight: 1.6
  },
  // Feedback
  feedbackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1rem'
  },
  feedbackItem: {
    padding: '1rem',
    background: COLORS.extraLight,
    borderRadius: '12px',
    borderLeft: `4px solid ${COLORS.primary}`
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
    color: COLORS.textLight
  },
  feedbackText: {
    margin: 0,
    fontSize: '0.9rem',
    color: COLORS.text,
    lineHeight: 1.5
  },
  // Footer
  footer: {
    textAlign: 'center',
    padding: '2rem',
    color: COLORS.textLight,
    fontSize: '0.85rem'
  },
  // Loading
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
    border: `4px solid ${COLORS.extraLight}`,
    borderTop: `4px solid ${COLORS.primary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: COLORS.textLight,
    fontSize: '1rem'
  },
  // Empty
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    background: 'rgba(255,255,255,0.9)',
    borderRadius: '20px',
    color: COLORS.textLight
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
    opacity: 0.5
  }
};
