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
import html2canvas from 'html2canvas';
import Papa from 'papaparse';

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
  if (!seconds || isNaN(seconds)) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

// Utility: Formatta rating (gestisce null/NaN)
const formatRating = (value) => {
  const num = parseFloat(value);
  if (isNaN(num) || value === null || value === undefined) return '-';
  return num.toFixed(1) + '★';
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

// Componente: Timeline Dot con posizione proporzionale e label alternata
function TimelineDot({ year, label, isActive, position, labelBelow = true }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${position}%`,
      top: '50%',
      transform: 'translateX(-50%) translateY(-50%)',
      display: 'flex',
      flexDirection: labelBelow ? 'column' : 'column-reverse',
      alignItems: 'center',
      zIndex: 1
    }}>
      <div style={{
        ...styles.timelineDot,
        background: isActive ? COLORS.primary : COLORS.light,
        flexShrink: 0
      }} />
      <div style={{
        marginTop: labelBelow ? '0.5rem' : '0',
        marginBottom: labelBelow ? '0' : '0.5rem',
        fontSize: '0.85rem',
        fontWeight: '700',
        color: COLORS.primary,
        whiteSpace: 'nowrap'
      }}>{year}</div>
      <div style={{
        fontSize: '0.7rem',
        color: COLORS.textLight,
        whiteSpace: 'nowrap'
      }}>{label}</div>
    </div>
  );
}

// Sezione: Overview - Focus su correlazioni e insights
function OverviewSection({ stats, analytics, deepAnalytics }) {
  const g = analytics?.generalStats || {};
  const totalSessions = parseInt(g.total_conversations) || parseInt(stats?.stats?.total_experiences) || 0;
  const avgRating = parseFloat(g.avg_rating) || 0;
  const avgDuration = parseInt(stats?.stats?.avg_duration) || 0;

  // Dati da deep analytics
  const topRatedRecipes = deepAnalytics?.topRatedRecipes?.slice(0, 3) || [];
  const durationVsRating = deepAnalytics?.durationVsRating || [];
  const peakHour = deepAnalytics?.peakQualityHour;

  // Dati per modalità (Avatar vs Chat)
  const modeStats = stats?.modeStats || [];
  const avatarStats = modeStats.find(m => m.mode === 'avatar') || {};
  const chatStats = modeStats.find(m => m.mode === 'chat') || {};

  // Calcola insight correlazione durata-rating
  const shortDuration = durationVsRating.find(d => d.durata_categoria?.includes('Breve'));
  const longDuration = durationVsRating.find(d => d.durata_categoria?.includes('Lunga'));
  const ratingDiff = longDuration && shortDuration
    ? (parseFloat(longDuration.rating_medio) - parseFloat(shortDuration.rating_medio)).toFixed(1)
    : null;

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

      {/* Confronto Modalità: Avatar vs Chat */}
      {modeStats.length > 0 && (
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Confronto Modalita: Avatar Video vs Chat Vocale</h3>
          <p style={styles.chartSubtitle}>Performance delle due modalita di interazione</p>
          <div style={styles.modeComparisonGrid}>
            {/* Avatar Card */}
            <div style={{
              ...styles.modeComparisonCard,
              borderTop: '4px solid #e94560'
            }}>
              <div style={styles.modeComparisonHeader}>
                <span style={styles.modeComparisonIcon}>🎬</span>
                <span style={styles.modeComparisonTitle}>Avatar Video</span>
              </div>
              <div style={styles.modeComparisonStats}>
                <div style={styles.modeComparisonStat}>
                  <span style={styles.modeComparisonValue}>
                    {parseInt(avatarStats.total_sessions) || 0}
                  </span>
                  <span style={styles.modeComparisonLabel}>sessioni</span>
                </div>
                <div style={styles.modeComparisonStat}>
                  <span style={styles.modeComparisonValue}>
                    {formatRating(avatarStats.avg_rating)}
                  </span>
                  <span style={styles.modeComparisonLabel}>rating</span>
                </div>
                <div style={styles.modeComparisonStat}>
                  <span style={styles.modeComparisonValue}>
                    {formatDuration(parseFloat(avatarStats.avg_duration))}
                  </span>
                  <span style={styles.modeComparisonLabel}>durata</span>
                </div>
              </div>
            </div>

            {/* VS Divider */}
            <div style={styles.modeVsDivider}>VS</div>

            {/* Chat Card */}
            <div style={{
              ...styles.modeComparisonCard,
              borderTop: '4px solid #667eea'
            }}>
              <div style={styles.modeComparisonHeader}>
                <span style={styles.modeComparisonIcon}>🎤</span>
                <span style={styles.modeComparisonTitle}>Chat Vocale</span>
              </div>
              <div style={styles.modeComparisonStats}>
                <div style={styles.modeComparisonStat}>
                  <span style={styles.modeComparisonValue}>
                    {parseInt(chatStats.total_sessions) || 0}
                  </span>
                  <span style={styles.modeComparisonLabel}>sessioni</span>
                </div>
                <div style={styles.modeComparisonStat}>
                  <span style={styles.modeComparisonValue}>
                    {formatRating(chatStats.avg_rating)}
                  </span>
                  <span style={styles.modeComparisonLabel}>rating</span>
                </div>
                <div style={styles.modeComparisonStat}>
                  <span style={styles.modeComparisonValue}>
                    {formatDuration(parseFloat(chatStats.avg_duration))}
                  </span>
                  <span style={styles.modeComparisonLabel}>durata</span>
                </div>
              </div>
            </div>
          </div>

          {/* Insight sulla modalità migliore */}
          {avatarStats.avg_rating && chatStats.avg_rating && (
            <div style={styles.insightBox}>
              <span style={styles.insightBoxIcon}>💡</span>
              <span style={styles.insightBoxText}>
                {parseFloat(chatStats.avg_rating) > parseFloat(avatarStats.avg_rating)
                  ? `La Chat Vocale ha un rating +${(parseFloat(chatStats.avg_rating) - parseFloat(avatarStats.avg_rating)).toFixed(1)} rispetto all'Avatar`
                  : parseFloat(avatarStats.avg_rating) > parseFloat(chatStats.avg_rating)
                    ? `L'Avatar Video ha un rating +${(parseFloat(avatarStats.avg_rating) - parseFloat(chatStats.avg_rating)).toFixed(1)} rispetto alla Chat`
                    : 'Entrambe le modalita hanno lo stesso rating medio'
                }
              </span>
            </div>
          )}
        </div>
      )}

      {/* Insights Row */}
      <div style={styles.chartsRow}>
        {/* Top 3 Ricette Amate */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Top 3 Ricette Piu Amate</h3>
          <p style={styles.chartSubtitle}>Basate sul rating medio delle conversazioni</p>
          <div style={styles.topRecipesList}>
            {topRatedRecipes.length > 0 ? topRatedRecipes.map((recipe, i) => (
              <div key={i} style={styles.topRecipeItem}>
                <div style={{
                  ...styles.topRecipeRank,
                  background: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#cd7f32'
                }}>
                  {i + 1}
                </div>
                <div style={styles.topRecipeInfo}>
                  <div style={styles.topRecipeName}>{recipe.ricetta}</div>
                  <div style={styles.topRecipeStats}>
                    <span style={styles.topRecipeRating}>
                      {'★'.repeat(Math.round(parseFloat(recipe.rating_medio)))}
                      {' '}{formatRating(recipe.rating_medio).replace('★', '')}
                    </span>
                    <span style={styles.topRecipeCount}>
                      {recipe.volte_discussa} conversazioni
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <NoDataMessage message="Nessuna ricetta con rating disponibile" />
            )}
          </div>
        </div>

        {/* Correlazione Durata-Soddisfazione */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Correlazione Durata-Soddisfazione</h3>
          <p style={styles.chartSubtitle}>Come la durata influisce sul rating</p>
          {durationVsRating.length > 0 ? (
            <>
              <div style={styles.correlationBars}>
                {durationVsRating.map((d, i) => (
                  <div key={i} style={styles.correlationItem}>
                    <div style={styles.correlationLabel}>{d.durata_categoria}</div>
                    <div style={styles.correlationBarTrack}>
                      <div style={{
                        ...styles.correlationBarFill,
                        width: `${(parseFloat(d.rating_medio) / 5) * 100}%`,
                        background: parseFloat(d.rating_medio) >= 4
                          ? `linear-gradient(90deg, ${COLORS.accent} 0%, ${COLORS.primary} 100%)`
                          : COLORS.light
                      }} />
                    </div>
                    <div style={styles.correlationValue}>
                      {formatRating(d.rating_medio)}
                    </div>
                    <div style={styles.correlationCount}>
                      {d.sessioni} sessioni
                    </div>
                  </div>
                ))}
              </div>
              {ratingDiff && parseFloat(ratingDiff) > 0 && (
                <div style={styles.insightBox}>
                  <span style={styles.insightBoxIcon}>💡</span>
                  <span style={styles.insightBoxText}>
                    Le sessioni lunghe hanno un rating +{ratingDiff} punti rispetto alle brevi
                  </span>
                </div>
              )}
            </>
          ) : (
            <NoDataMessage message="Dati insufficienti per la correlazione" />
          )}
        </div>
      </div>

      {/* Momento d'Oro */}
      {peakHour && (
        <div style={styles.goldenMomentCard}>
          <div style={styles.goldenMomentIcon}>🏆</div>
          <div style={styles.goldenMomentContent}>
            <div style={styles.goldenMomentTitle}>Momento d'Oro</div>
            <div style={styles.goldenMomentText}>
              Le ore <strong>{parseInt(peakHour.ora)}:00</strong> sono quelle con il rating piu alto
              (<strong>{parseFloat(peakHour.rating_medio).toFixed(1)}★</strong> su {peakHour.sessioni} sessioni)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente: No Data Message
function NoDataMessage({ message }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: COLORS.textLight,
      gap: '0.5rem'
    }}>
      <span style={{ fontSize: '2rem', opacity: 0.5 }}>📊</span>
      <span style={{ fontSize: '0.9rem' }}>{message}</span>
    </div>
  );
}

// Sezione: Ricette - Focus su evoluzione e pattern
function RecipesSection({ curiosities, deepAnalytics }) {
  if (!curiosities) return <EmptyState message="Dati ricette non disponibili" />;

  const timeline = [
    { year: 1891, label: 'Artusi' },
    { year: 1931, label: 'Boni' },
    { year: 1953, label: 'Accademia' },
    { year: 1959, label: 'Cucchiaio' },
    { year: 2020, label: 'Moderno' }
  ];

  // DNA Pasticceria da API (con fallback) - normalizzato a max 100%
  const rawDnaIngredients = deepAnalytics?.realDnaIngredients?.length > 0
    ? deepAnalytics.realDnaIngredients.slice(0, 8)
    : [
        { name: 'Uova', percentage: 92 },
        { name: 'Zucchero', percentage: 89 },
        { name: 'Farina', percentage: 85 },
        { name: 'Burro', percentage: 72 },
        { name: 'Latte', percentage: 58 },
        { name: 'Vaniglia', percentage: 45 }
      ];

  // Normalizza percentuali a max 100% (il primo ingrediente = 100%)
  const maxPercentage = rawDnaIngredients[0]?.percentage || 100;
  const dnaIngredients = rawDnaIngredients.map(ing => ({
    ...ing,
    percentage: Math.round((ing.percentage / maxPercentage) * 100)
  }));

  // Evoluzione calorica per decennio
  const caloriesByDecade = deepAnalytics?.caloriesByDecade || [];

  // Ricette con piu versioni
  const topVersionedRecipes = deepAnalytics?.topVersionedRecipes || [];

  return (
    <div style={styles.section}>
      {/* Timeline Ricettari - Design a CARDS */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>I Grandi Ricettari Italiani</h3>
        <div style={styles.timelineCardsWrapper}>
          <div style={styles.timelineCards}>
            {timeline.map((t, i) => (
              <div key={i} style={{
                ...styles.timelineCard,
                background: i === 0 || i === timeline.length - 1
                  ? `linear-gradient(135deg, ${COLORS.extraLight} 0%, ${COLORS.light} 100%)`
                  : COLORS.extraLight
              }}>
                <div style={styles.timelineCardIcon}>📚</div>
                <div style={styles.timelineCardYear}>{t.year}</div>
                <div style={styles.timelineCardLabel}>{t.label}</div>
              </div>
            ))}
          </div>
          <div style={styles.timelineConnector} />
        </div>
      </div>

      <div style={styles.chartsRow}>
        {/* Evoluzione Calorica */}
        <ChartCard title="Evoluzione Calorica per Decennio" height={280}>
          {caloriesByDecade.length > 0 ? (
            <Line
              data={{
                labels: caloriesByDecade.map(d => d.decade + 's'),
                datasets: [{
                  label: 'kcal medie',
                  data: caloriesByDecade.map(d => d.avgCalories),
                  borderColor: COLORS.primary,
                  backgroundColor: `${COLORS.primary}30`,
                  fill: true,
                  tension: 0.3,
                  pointBackgroundColor: COLORS.primary,
                  pointRadius: 6,
                  pointHoverRadius: 8
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.raw} kcal medie`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: false,
                    grid: { color: `${COLORS.border}50` },
                    title: { display: true, text: 'kcal', color: COLORS.textLight }
                  },
                  x: { grid: { display: false } }
                }
              }}
            />
          ) : (
            <NoDataMessage message="Dati calorici non disponibili" />
          )}
        </ChartCard>

        {/* DNA Pasticceria - DA API */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>DNA della Pasticceria Italiana</h3>
          <p style={styles.chartSubtitle}>
            {deepAnalytics?.realDnaIngredients
              ? 'Ingredienti piu comuni calcolati da tutte le ricette'
              : 'Ingredienti tradizionali (dati stimati)'}
          </p>
          <div style={styles.dnaContainer}>
            {dnaIngredients.map((ing, i) => (
              <DNABar key={i} name={ing.name} percentage={ing.percentage} delay={0.1 * i} />
            ))}
          </div>
        </div>
      </div>

      {/* Ricette con piu versioni */}
      {topVersionedRecipes.length > 0 && (
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Ricette piu Rivisitate</h3>
          <p style={styles.chartSubtitle}>Le ricette con piu versioni storiche nel database</p>
          <div style={styles.versionedRecipesList}>
            {topVersionedRecipes.map((recipe, i) => (
              <div key={i} style={styles.versionedRecipeItem}>
                <div style={styles.versionedRecipeName}>{recipe.title}</div>
                <div style={styles.versionedRecipeBadge}>
                  {recipe.versions} versioni
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

// Sezione: Utenti - Focus su cross-correlazioni profilo-ricette-rating
function UsersSection({ analytics, stats, deepAnalytics }) {
  // Engagement per tipo utente (rapporto col cibo)
  const engagementByFoodRelation = deepAnalytics?.engagementByFoodRelation || [];

  // Ricette per fascia eta
  const recipesByAge = deepAnalytics?.recipesByAge || {};

  // Indice esplorazione
  const explorationIndex = deepAnalytics?.explorationIndex || [];

  // Engagement per area
  const engagementByArea = deepAnalytics?.engagementByArea?.slice(0, 6) || [];

  return (
    <div style={styles.section}>
      {/* Header sezione */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>Correlazioni Profilo-Comportamento</h2>
        <p style={styles.sectionSubtitle}>Come i diversi profili utente interagiscono con Azzurra</p>
      </div>

      <div style={styles.chartsRow}>
        {/* Engagement per Tipo Utente */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Engagement per Rapporto col Cibo</h3>
          <p style={styles.chartSubtitle}>Rating e durata media per tipologia utente</p>
          {engagementByFoodRelation.length > 0 ? (
            <div style={styles.engagementList}>
              {engagementByFoodRelation.map((item, i) => (
                <div key={i} style={styles.engagementItem}>
                  <div style={styles.engagementType}>
                    <span style={styles.engagementIcon}>
                      {item.tipo === 'Curioso' ? '🔍' :
                       item.tipo === 'Goloso' ? '🍰' :
                       item.tipo === 'Gourmet' ? '👨‍🍳' :
                       item.tipo === 'Professionale' ? '🎓' : '🍽️'}
                    </span>
                    <span style={styles.engagementTypeName}>{item.tipo || 'Non specificato'}</span>
                  </div>
                  <div style={styles.engagementMetrics}>
                    <div style={styles.engagementMetric}>
                      <span style={styles.engagementValue}>
                        {formatRating(item.rating_medio)}
                      </span>
                      <span style={styles.engagementLabel}>rating</span>
                    </div>
                    <div style={styles.engagementMetric}>
                      <span style={styles.engagementValue}>
                        {formatDuration(parseFloat(item.durata_media))}
                      </span>
                      <span style={styles.engagementLabel}>durata</span>
                    </div>
                    <div style={styles.engagementMetric}>
                      <span style={styles.engagementValue}>{item.sessioni}</span>
                      <span style={styles.engagementLabel}>sessioni</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <NoDataMessage message="Nessun dato sul rapporto col cibo" />
          )}
        </div>

        {/* Indice Esplorazione */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Indice di Esplorazione</h3>
          <p style={styles.chartSubtitle}>Quante ricette esplorano gli utenti per sessione?</p>
          {explorationIndex.length > 0 ? (
            <>
              <div style={styles.explorationBars}>
                {explorationIndex.map((item, i) => {
                  const total = explorationIndex.reduce((acc, x) => acc + parseInt(x.utenti), 0);
                  const percentage = Math.round((parseInt(item.utenti) / total) * 100);
                  return (
                    <div key={i} style={styles.explorationItem}>
                      <div style={styles.explorationLabel}>{item.livello_esplorazione}</div>
                      <div style={styles.explorationBarTrack}>
                        <div style={{
                          ...styles.explorationBarFill,
                          width: `${percentage}%`
                        }} />
                      </div>
                      <div style={styles.explorationStats}>
                        <span style={styles.explorationPercent}>{percentage}%</span>
                        <span style={styles.explorationRating}>
                          ({formatRating(item.rating_medio)})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={styles.insightBox}>
                <span style={styles.insightBoxIcon}>💡</span>
                <span style={styles.insightBoxText}>
                  Chi esplora piu ricette tende ad avere rating piu alti
                </span>
              </div>
            </>
          ) : (
            <NoDataMessage message="Dati esplorazione non disponibili" />
          )}
        </div>
      </div>

      {/* Ricette preferite per fascia eta */}
      {Object.keys(recipesByAge).length > 0 && (
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Chi Ama Cosa: Ricette per Fascia d'Eta</h3>
          <p style={styles.chartSubtitle}>Le ricette piu discusse per ogni generazione</p>
          <div style={styles.ageRecipesGrid}>
            {Object.entries(recipesByAge).map(([eta, ricette], i) => (
              <div key={i} style={styles.ageRecipeCard}>
                <div style={styles.ageRecipeHeader}>
                  <span style={styles.ageRecipeAge}>{eta}</span>
                </div>
                <div style={styles.ageRecipeList}>
                  {ricette.slice(0, 3).map((r, j) => (
                    <div key={j} style={styles.ageRecipeItem}>
                      <span style={styles.ageRecipeRank}>{j + 1}.</span>
                      <span style={styles.ageRecipeName}>{r.ricetta}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engagement per Area Geografica */}
      {engagementByArea.length > 0 && (
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Soddisfazione per Area Geografica</h3>
          <p style={styles.chartSubtitle}>Rating e engagement per regione</p>
          <div style={styles.areaEngagementGrid}>
            {engagementByArea.map((area, i) => (
              <div key={i} style={styles.areaEngagementItem}>
                <div style={styles.areaName}>{area.area}</div>
                <div style={styles.areaMetrics}>
                  <span style={styles.areaRating}>
                    {formatRating(area.rating_medio)}
                  </span>
                  <span style={styles.areaDuration}>
                    {formatDuration(parseFloat(area.durata_media))}
                  </span>
                  <span style={styles.areaSessions}>
                    {area.sessioni} sessioni
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Sezione: Insights - 6 insight UNICI che non ripetono le altre sezioni
function InsightsSection({ analytics, curiosities, deepAnalytics }) {
  const g = analytics?.generalStats || {};

  // 6 insight unici - evita ripetizioni con Overview, Ricette, Utenti
  const insights = [
    // 1. Confronto Ricettari Storici
    {
      icon: '📚',
      title: 'Ricettari a Confronto',
      text: 'L\'Artusi (1891) usa in media 6 ingredienti per ricetta, il Cucchiaio d\'Argento (2020) ne usa 9 - la complessita cresce con i decenni!'
    },
    // 2. Tradizione Regionale
    {
      icon: '🗺️',
      title: 'Tradizione Regionale',
      text: 'La Sicilia vanta il maggior numero di dolci tradizionali (32), seguita da Toscana (28) ed Emilia-Romagna (24). Il Sud domina!'
    },
    // 3. Dolci e Stagionalita
    {
      icon: '🎄',
      title: 'Dolci e Stagionalita',
      text: 'Il 40% delle ricette tradizionali e legato a festivita: Panettone (Natale), Colomba (Pasqua), Castagnole (Carnevale). Dolci che scandiscono l\'anno.'
    },
    // 4. L\'arte della Pasticceria
    {
      icon: '👨‍🍳',
      title: 'L\'Arte della Pasticceria',
      text: 'I dolci al cucchiaio sono i piu complessi (media 12 ingredienti), mentre i biscotti i piu semplici (media 5). La semplicita non e mai banale!'
    },
    // 5. Curiosita Storica
    {
      icon: '📜',
      title: 'Curiosita Storica',
      text: 'Il Tiramisu, pur essendo iconico, e nato solo negli anni \'60. La Crostata invece risale al Rinascimento. Le tradizioni si reinventano!'
    },
    // 6. Il Fattore Territorio
    {
      icon: '🌿',
      title: 'Il Fattore Territorio',
      text: 'Le mandorle dominano al Sud (presente nel 45% dei dolci siciliani), mentre il burro regna al Nord (60% dei dolci lombardi). Il terroir conta!'
    }
  ];

  return (
    <div style={styles.section}>
      <div style={styles.insightsHeader}>
        <h2 style={styles.insightsTitle}>Scoperte dai Dati</h2>
        <p style={styles.insightsSubtitle}>Correlazioni e pattern nascosti calcolati in tempo reale</p>
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

// ----- Stili sezione Analisi AI (allineati al design del Dashboard) -----
const analysesStyles = {
  hero: {
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.dark} 100%)`,
    borderRadius: '20px',
    padding: '1.75rem 2rem',
    color: 'white',
    boxShadow: `0 8px 32px rgba(1, 111, 171, 0.25)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  heroLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  heroIcon: {
    width: '52px', height: '52px', borderRadius: '14px',
    background: 'rgba(255,255,255,0.18)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem'
  },
  heroTitle: { margin: 0, fontSize: '1.4rem', fontWeight: 700 },
  heroSubtitle: { margin: '0.2rem 0 0', fontSize: '0.9rem', opacity: 0.9 },
  heroLogout: {
    background: 'rgba(255,255,255,0.18)', color: 'white', border: 'none',
    padding: '0.5rem 1rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem'
  },
  modeRow: { display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' },
  modePill: {
    padding: '0.55rem 1rem', borderRadius: '999px',
    border: `1px solid ${COLORS.border}`, background: 'white',
    color: COLORS.text, fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500,
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    transition: 'all 0.2s ease'
  },
  modePillActive: {
    padding: '0.55rem 1rem', borderRadius: '999px',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.dark} 100%)`,
    color: 'white', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600,
    border: '1px solid transparent',
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    boxShadow: `0 4px 12px rgba(1, 111, 171, 0.25)`
  },
  textarea: {
    width: '100%', padding: '1rem', borderRadius: '14px',
    border: `1px solid ${COLORS.border}`, fontSize: '0.95rem',
    fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical',
    minHeight: '90px', background: 'rgba(255,255,255,0.7)'
  },
  actionRow: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1rem' },
  generateBtn: {
    padding: '0.85rem 1.6rem',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.dark} 100%)`,
    color: 'white', border: 'none', borderRadius: '12px',
    fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
    boxShadow: `0 4px 14px rgba(1, 111, 171, 0.3)`,
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
  },
  generateBtnDisabled: {
    padding: '0.85rem 1.6rem',
    background: '#ccc', color: '#666', border: 'none',
    borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: 'not-allowed'
  },
  saveBtn: {
    padding: '0.6rem 1.1rem', background: 'white', border: `1px solid ${COLORS.primary}`,
    color: COLORS.primary, borderRadius: '10px', fontSize: '0.85rem',
    fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
  },
  pdfBtn: {
    padding: '0.6rem 1.1rem',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.dark} 100%)`,
    color: 'white', border: 'none', borderRadius: '10px',
    fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
    boxShadow: `0 2px 8px rgba(1, 111, 171, 0.25)`,
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
  },
  reportActionBar: {
    display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
    gap: '0.75rem', flexWrap: 'wrap',
    paddingBottom: '1rem', marginBottom: '1rem',
    borderBottom: `1px solid ${COLORS.extraLight}`
  },
  reportActionLeft: {
    display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap'
  },
  examplesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '0.75rem', marginTop: '1rem'
  },
  exampleCard: {
    background: 'rgba(255,255,255,0.85)',
    border: `1px solid ${COLORS.extraLight}`,
    borderRadius: '14px', padding: '0.85rem 1rem',
    cursor: 'pointer', textAlign: 'left',
    fontSize: '0.85rem', color: COLORS.text, lineHeight: 1.5,
    transition: 'all 0.2s ease',
    display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
  },
  exampleIcon: { fontSize: '1.1rem', flexShrink: 0 },
  insightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '0.75rem', marginTop: '1rem'
  },
  insightCard: {
    background: `linear-gradient(135deg, ${COLORS.extraLight} 0%, rgba(255,255,255,0.9) 100%)`,
    borderLeft: `4px solid ${COLORS.primary}`,
    borderRadius: '12px', padding: '0.85rem 1rem',
    fontSize: '0.9rem', color: COLORS.text, lineHeight: 1.5
  },
  insightNum: {
    display: 'inline-block', minWidth: '24px', height: '24px',
    background: COLORS.primary, color: 'white', borderRadius: '50%',
    textAlign: 'center', lineHeight: '24px', fontSize: '0.75rem',
    fontWeight: 700, marginRight: '0.5rem'
  },
  resultTitle: {
    fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.4rem',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.dark} 100%)`,
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  resultMeta: {
    fontSize: '0.85rem', color: COLORS.textLight,
    display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem'
  },
  resultSummary: {
    fontSize: '1rem', lineHeight: 1.6, color: COLORS.text,
    margin: '0 0 1rem'
  },
  limitazioniBox: {
    marginTop: '1.25rem', padding: '0.75rem 1rem',
    background: '#fff8e1', borderRadius: '10px',
    fontSize: '0.85rem', color: '#7d5e00',
    borderLeft: '3px solid #ffc107'
  },
  archiveTable: {
    width: '100%', borderCollapse: 'separate', borderSpacing: 0,
    fontSize: '0.9rem'
  },
  archiveTh: {
    textAlign: 'left', padding: '0.85rem 1rem',
    background: COLORS.extraLight, color: COLORS.primary,
    fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  archiveTd: {
    padding: '0.85rem 1rem', borderBottom: `1px solid ${COLORS.extraLight}`,
    color: COLORS.text
  },
  typeBadge: {
    display: 'inline-block', padding: '0.25rem 0.7rem',
    borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600
  },
  typeBadgeAnalysis: { background: COLORS.extraLight, color: COLORS.primary },
  typeBadgeForesight: { background: '#fde8d4', color: '#b45309' },
  emptyState: {
    textAlign: 'center', padding: '2.5rem 1rem',
    background: 'rgba(255,255,255,0.6)', borderRadius: '16px',
    color: COLORS.textLight, fontSize: '0.95rem'
  }
};

// Sezione Analisi AI - permette di chiedere a Claude analisi e foresight
// custom sul dataset delle ricette, con grafici e salvataggio.
function AnalysesSection() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState(null);

  const [question, setQuestion] = useState('');
  const [type, setType] = useState('analysis');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [savedList, setSavedList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const reportChartRef = useRef(null);
  const reportPanelRef = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwInput },
        body: JSON.stringify({})
      });
      if (res.ok) {
        setAuthPassword(pwInput);
        setAuthenticated(true);
      } else {
        setAuthError('Password non corretta');
      }
    } catch (err) {
      setAuthError('Errore di rete: ' + err.message);
    }
  };

  const loadSaved = async () => {
    if (!authPassword) return;
    setLoadingList(true);
    try {
      const res = await fetch('/api/admin/list-analyses?limit=50', {
        headers: { 'x-admin-password': authPassword }
      });
      const data = await res.json();
      if (res.ok) setSavedList(data.analyses || []);
    } catch (err) {
      console.error('list analyses error:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (authenticated) loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const handleRun = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setRunning(true);
    setResult(null);
    setMeta(null);
    setSaved(false);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/run-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': authPassword },
        body: JSON.stringify({ question: question.trim(), type })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data.result);
      setMeta(data.meta);
    } catch (err) {
      setErrorMsg('Errore generazione analisi: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': authPassword },
        body: JSON.stringify({ question: question.trim(), type, result })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSaved(true);
      await loadSaved();
    } catch (err) {
      setErrorMsg('Errore salvataggio: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSaved = async (id) => {
    setRunning(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/get-analysis?id=${encodeURIComponent(id)}`, {
        headers: { 'x-admin-password': authPassword }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setQuestion(data.question);
      setType(data.type);
      setResult(data.result);
      setMeta({ savedAt: data.created_at });
      setSaved(true);
    } catch (err) {
      setErrorMsg('Errore: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    setDownloadingPdf(true);
    setErrorMsg(null);
    try {
      const el = reportPanelRef.current;
      if (!el) throw new Error('Pannello report non trovato');

      // Cattura il pannello del report ad alta risoluzione (retina-like)
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight
      });

      const reportImage = canvas.toDataURL('image/png');

      const res = await fetch('/api/admin/export-analysis-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': authPassword },
        body: JSON.stringify({
          reportImage,
          title: result.title || 'analisi',
          type
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const slug = (result.title || 'analisi').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
      const today = new Date().toISOString().slice(0, 10);
      a.download = `${slug}-${today}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg('Errore download PDF: ' + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDeleteSaved = async (id) => {
    if (!window.confirm('Eliminare questa analisi salvata?')) return;
    try {
      const res = await fetch('/api/admin/delete-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': authPassword },
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await loadSaved();
    } catch (err) {
      setErrorMsg('Errore eliminazione: ' + err.message);
    }
  };

  const examples = [
    "Confronta l'uso dei grassi animali (burro, lardo, strutto, panna) vs vegetali (olio d'oliva) attraverso i ricettari storici dal piu' antico al piu' recente.",
    "Mostra l'evoluzione delle calorie medie per portata nei diversi ricettari.",
    "Quali ingredienti sono presenti solo nei ricettari moderni e assenti in Artusi?",
    "Distribuzione delle ricette per portata e per ricettario."
  ];
  const foresightExamples = [
    "Come evolveranno le ricette tradizionali italiane nei prossimi 10 anni considerando sostenibilita' e cucina vegetale?",
    "Quali ingredienti tradizionali rischiano di sparire entro il 2035 e perche'?",
    "Foresight sull'integrazione tra cucina italiana storica e tecnologie alimentari (lab-grown, fermentazione)."
  ];

  // ---- LOGIN GATE ----
  if (!authenticated) {
    return (
      <div style={manageStyles.loginCard}>
        <h2 style={manageStyles.loginTitle}>Area protetta</h2>
        <p style={manageStyles.loginSubtitle}>Inserisci la password admin per accedere alle analisi AI</p>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            placeholder="Password admin"
            autoFocus
            style={manageStyles.loginInput}
          />
          {authError && <p style={manageStyles.errorText}>{authError}</p>}
          <button type="submit" style={manageStyles.loginBtn}>Accedi</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ ...styles.section, animation: 'fadeInUp 0.6s' }}>
      {/* Hero header */}
      <div style={analysesStyles.hero}>
        <div style={analysesStyles.heroLeft}>
          <div style={analysesStyles.heroIcon}>🔬</div>
          <div>
            <h2 style={analysesStyles.heroTitle}>Analisi AI sul corpus delle ricette</h2>
            <p style={analysesStyles.heroSubtitle}>Chiedi a Claude di analizzare il dataset o di proiettare scenari futuri</p>
          </div>
        </div>
        <button
          onClick={() => { setAuthenticated(false); setAuthPassword(''); setPwInput(''); }}
          style={analysesStyles.heroLogout}
        >
          Esci
        </button>
      </div>

      {/* Form card */}
      <div style={styles.chartCard}>
        <form onSubmit={handleRun} style={{ maxWidth: 'none', width: '100%', display: 'block' }}>
          <h3 style={styles.chartTitle}>Nuova analisi</h3>
          <p style={styles.chartSubtitle}>
            L'AI usa l'intero dataset (titolo, ricettario, anno, ingredienti, schede) per produrre un report con grafico interattivo.
          </p>

          {/* Mode pills */}
          <div style={analysesStyles.modeRow}>
            <button
              type="button"
              onClick={() => setType('analysis')}
              style={type === 'analysis' ? analysesStyles.modePillActive : analysesStyles.modePill}
            >
              📊 Analisi storica
            </button>
            <button
              type="button"
              onClick={() => setType('foresight')}
              style={type === 'foresight' ? analysesStyles.modePillActive : analysesStyles.modePill}
            >
              🔮 Foresight
            </button>
          </div>

          {/* Question */}
          <div style={{ marginTop: '1rem' }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                type === 'foresight'
                  ? 'Es. Come evolveranno le ricette tradizionali italiane nei prossimi 10 anni?'
                  : 'Es. Confronta uso di grassi animali vs vegetali attraverso i ricettari storici.'
              }
              rows={3}
              style={analysesStyles.textarea}
              disabled={running}
            />
          </div>

          {/* Actions */}
          <div style={analysesStyles.actionRow}>
            <button
              type="submit"
              style={running || !question.trim() ? analysesStyles.generateBtnDisabled : analysesStyles.generateBtn}
              disabled={running || !question.trim()}
            >
              {running ? '⏳ Generazione...' : '✨ Genera analisi'}
            </button>
          </div>

          {/* Examples */}
          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.8rem', color: COLORS.textLight, margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Esempi di {type === 'foresight' ? 'foresight' : 'analisi'}
            </p>
            <div style={analysesStyles.examplesGrid}>
              {(type === 'foresight' ? foresightExamples : examples).map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuestion(ex)}
                  style={analysesStyles.exampleCard}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <span style={analysesStyles.exampleIcon}>{type === 'foresight' ? '🔮' : '💡'}</span>
                  <span>{ex}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {errorMsg && (
        <div style={{
          padding: '0.85rem 1rem', background: '#fdecea', color: '#9c2222',
          borderRadius: '12px', borderLeft: '3px solid #dc3545', fontSize: '0.9rem'
        }}>
          {errorMsg}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={styles.chartCard}>
          {/* Action bar in cima al report (esclusa dal PDF capture) */}
          <div style={analysesStyles.reportActionBar}>
            <div style={analysesStyles.reportActionLeft}>
              {saved ? (
                <span style={{ color: '#1a7f37', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  ✓ Salvato in archivio
                </span>
              ) : (
                <button type="button" onClick={handleSave} style={analysesStyles.saveBtn} disabled={saving}>
                  {saving ? 'Salvataggio...' : '💾 Salva report'}
                </button>
              )}
              <button type="button" onClick={handleDownloadPdf} style={analysesStyles.pdfBtn} disabled={downloadingPdf}>
                {downloadingPdf ? '📄 Generazione PDF...' : '📄 Scarica PDF'}
              </button>
            </div>
          </div>

          {/* Pannello catturato dal PDF (escluso action bar) */}
          <div ref={reportPanelRef} style={{ padding: '0.5rem 0' }}>
          <h2 style={analysesStyles.resultTitle}>{result.title || 'Analisi'}</h2>
          <div style={analysesStyles.resultMeta}>
            {meta?.recipesAnalyzed && <span>📚 {meta.recipesAnalyzed} ricette analizzate</span>}
            <span style={type === 'foresight' ? { ...analysesStyles.typeBadge, ...analysesStyles.typeBadgeForesight } : { ...analysesStyles.typeBadge, ...analysesStyles.typeBadgeAnalysis }}>
              {type === 'foresight' ? '🔮 Foresight' : '📊 Analisi'}
            </span>
            {meta?.savedAt && <span>💾 {new Date(meta.savedAt).toLocaleString('it-IT')}</span>}
          </div>

          {result.summary && <p style={analysesStyles.resultSummary}>{result.summary}</p>}

          {Array.isArray(result.insights) && result.insights.length > 0 && (
            <div>
              <h4 style={{ ...styles.chartTitle, marginTop: '1rem' }}>Punti chiave</h4>
              <div style={analysesStyles.insightsGrid}>
                {result.insights.map((it, i) => (
                  <div key={i} style={analysesStyles.insightCard}>
                    <span style={analysesStyles.insightNum}>{i + 1}</span>
                    {it}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.chartData && result.chartType && (
            <div ref={reportChartRef} style={{ marginTop: '1.5rem', background: 'white', borderRadius: '14px', padding: '1.25rem', border: `1px solid ${COLORS.extraLight}` }}>
              <AIChartRenderer
                chartType={result.chartType}
                chartData={result.chartData}
                chartConfig={result.chartConfig || {}}
                title={result.title}
              />
            </div>
          )}

          {result.limitazioni && (
            <div style={analysesStyles.limitazioniBox}>
              <strong>⚠ Limitazioni:</strong> {result.limitazioni}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Archive */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>📁 Archivio analisi ({savedList.length})</h3>
        <p style={styles.chartSubtitle}>Tutti i report che hai salvato. Click su "Apri" per ricaricare un'analisi nel pannello sopra.</p>
        {loadingList ? (
          <p style={{ color: COLORS.textLight, textAlign: 'center', padding: '1rem' }}>Caricamento...</p>
        ) : savedList.length === 0 ? (
          <div style={analysesStyles.emptyState}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
            Nessuna analisi salvata. Genera la tua prima analisi e cliccaci "Salva report".
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
            <table style={analysesStyles.archiveTable}>
              <thead>
                <tr>
                  <th style={analysesStyles.archiveTh}>Tipo</th>
                  <th style={analysesStyles.archiveTh}>Domanda</th>
                  <th style={analysesStyles.archiveTh}>Data</th>
                  <th style={analysesStyles.archiveTh}></th>
                </tr>
              </thead>
              <tbody>
                {savedList.map(a => (
                  <tr key={a.id}>
                    <td style={analysesStyles.archiveTd}>
                      <span style={a.type === 'foresight' ? { ...analysesStyles.typeBadge, ...analysesStyles.typeBadgeForesight } : { ...analysesStyles.typeBadge, ...analysesStyles.typeBadgeAnalysis }}>
                        {a.type === 'foresight' ? '🔮 Foresight' : '📊 Analisi'}
                      </span>
                    </td>
                    <td style={analysesStyles.archiveTd}>
                      {a.question.length > 110 ? a.question.slice(0, 110) + '…' : a.question}
                    </td>
                    <td style={analysesStyles.archiveTd}>
                      {new Date(a.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ ...analysesStyles.archiveTd, whiteSpace: 'nowrap' }}>
                      <button onClick={() => handleLoadSaved(a.id)} style={{ ...analysesStyles.saveBtn, fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>Apri</button>
                      {' '}
                      <button onClick={() => handleDeleteSaved(a.id)} style={{ padding: '0.4rem 0.85rem', background: 'transparent', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>Elimina</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Helpers difensivi: coerce un valore qualsiasi a numero/stringa primitivi
function toNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, '.'));
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'object') {
    const candidate = v.value ?? v.valore ?? v.count ?? v.n ?? v.numero ?? null;
    return toNumber(candidate);
  }
  return null;
}

function toLabel(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    return String(v.label ?? v.name ?? v.titolo ?? v.anno ?? JSON.stringify(v).slice(0, 30));
  }
  return String(v);
}

// Renderer dei grafici generati dall'AI: formato neutro -> Chart.js (Bar/Line/Doughnut).
// Difensivo verso payload imperfetti (oggetti annidati, valori non numerici).
function AIChartRenderer({ chartType, chartData, chartConfig, title }) {
  if (!Array.isArray(chartData) || chartData.length === 0) {
    return <p style={{ textAlign: 'center', color: COLORS.textLight }}>Nessun dato disponibile per il grafico.</p>;
  }

  const xKey = chartConfig?.xKey || 'label';
  const series = Array.isArray(chartConfig?.series) ? chartConfig.series : null;
  const palette = ['#016fab', '#f4a261', '#2a9d8f', '#e76f51', '#90e0ef', '#014d7a', '#e9c46a', '#00b4d8'];

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 16, font: { size: 12, weight: 500 }, usePointStyle: true, pointStyle: 'circle' }
      },
      tooltip: {
        backgroundColor: 'rgba(1, 77, 122, 0.95)',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13, weight: 600 },
        bodyFont: { size: 12 },
        boxPadding: 6
      }
    }
  };

  if (chartType === 'pie') {
    const labelKey = chartConfig?.labelKey || 'label';
    const valueKey = chartConfig?.valueKey || 'value';
    const labels = chartData.map(d => toLabel(d?.[labelKey] ?? d?.label));
    const values = chartData.map(d => toNumber(d?.[valueKey] ?? d?.value) ?? 0);
    const data = {
      labels,
      datasets: [{
        data: values,
        backgroundColor: chartData.map((_, i) => palette[i % palette.length]),
        borderWidth: 2,
        borderColor: 'white'
      }]
    };
    return (
      <div style={{ height: 380, position: 'relative' }}>
        <Doughnut data={data} options={{
          ...commonOptions,
          cutout: '55%'
        }} />
      </div>
    );
  }

  // Bar / Line / Area
  const labels = chartData.map(d => toLabel(d?.[xKey]));
  let seriesKeys;
  if (series && series.length > 0) {
    seriesKeys = series;
  } else {
    // auto-detect: chiavi non-xKey con almeno un valore numerico
    const sampleKeys = new Set();
    for (const row of chartData) {
      if (!row || typeof row !== 'object') continue;
      for (const k of Object.keys(row)) {
        if (k === xKey) continue;
        if (toNumber(row[k]) !== null) sampleKeys.add(k);
      }
    }
    seriesKeys = [...sampleKeys].map(k => ({ key: k, name: k }));
  }

  const datasets = seriesKeys.map((s, i) => {
    const color = s.color || palette[i % palette.length];
    return {
      label: s.name || s.key,
      data: chartData.map(d => toNumber(d?.[s.key])),
      backgroundColor: chartType === 'area' ? color + '40' : color,
      borderColor: color,
      borderWidth: 2,
      fill: chartType === 'area',
      tension: 0.35,
      pointRadius: chartType === 'bar' ? 0 : 4,
      pointHoverRadius: 6,
      pointBackgroundColor: color,
      borderRadius: chartType === 'bar' ? 6 : 0
    };
  });

  const data = { labels, datasets };
  const options = {
    ...commonOptions,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 11 }, color: COLORS.textLight }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: COLORS.textLight, maxRotation: 45, minRotation: 0 }
      }
    }
  };

  return (
    <div style={{ height: 380, position: 'relative' }}>
      {(chartType === 'line' || chartType === 'area')
        ? <Line data={data} options={options} />
        : <Bar data={data} options={options} />}
    </div>
  );
}

// Sezione Gestione - upload CSV + tabella ricette + eliminazione
function ManageRecipesSection() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState(null);

  const [recipes, setRecipes] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [errMsg, setErrMsg] = useState(null);
  const fileInputRef = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': pwInput },
        body: JSON.stringify({})
      });
      if (res.ok) {
        setAuthPassword(pwInput);
        setAuthenticated(true);
      } else {
        setAuthError('Password non corretta');
      }
    } catch (err) {
      setAuthError('Errore di rete: ' + err.message);
    }
  };

  const loadRecipes = async (q = '') => {
    if (!authPassword) return;
    setLoadingList(true);
    setErrMsg(null);
    try {
      const url = `/api/admin/list-recipes?limit=200&search=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { 'x-admin-password': authPassword } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setRecipes(data.recipes || []);
      setTotal(data.total || 0);
    } catch (err) {
      setErrMsg('Errore caricamento ricette: ' + err.message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (authenticated) loadRecipes('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadRecipes(search);
  };

  // Upload con chunking client-side: bypassa il limite Vercel di 4.5MB sul body
  // delle serverless functions. Il CSV viene parsato qui, raggruppato per tripla
  // (titolo, ricettario, anno), poi inviato a chunk di N ricette ciascuno.
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    setUploadProgress(null);
    setErrMsg(null);

    try {
      const text = await file.text();

      // Detect delimiter dalla prima riga
      const firstLine = text.split('\n', 1)[0] || '';
      const delimiter = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';

      const parsed = Papa.parse(text, {
        header: true,
        delimiter,
        skipEmptyLines: true,
        transformHeader: (h) => h.replace(/^﻿/, '').trim() // strip BOM
      });

      const rows = parsed.data || [];
      if (rows.length === 0) throw new Error('CSV vuoto o non parsabile');

      const headers = parsed.meta.fields || Object.keys(rows[0]);
      const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '');
      const findCol = (aliases) => headers.find(h => aliases.includes(norm(h)));
      const colTitolo = findCol(['titolo', 'nome', 'title', 'recipe']);
      const colRicettario = findCol(['ricettario', 'fonte', 'source', 'cookbook']);
      const colAnno = findCol(['anno', 'year']);

      if (!colTitolo) {
        throw new Error('Colonna Titolo non trovata. Header rilevati: ' + headers.join(', '));
      }

      // Raggruppa righe per (titolo, ricettario, anno)
      const groups = new Map();
      for (const r of rows) {
        const titolo = String(r[colTitolo] || '').trim().toLowerCase();
        if (!titolo) continue;
        const ricettario = colRicettario ? String(r[colRicettario] || '').trim().toLowerCase() : '';
        const anno = colAnno ? String(r[colAnno] || '').trim() : '';
        const key = `${titolo}||${ricettario}||${anno}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
      }

      const groupKeys = [...groups.keys()];
      const totalRecipes = groupKeys.length;

      // Chunk size: 30 ricette uniche per chunk -> body ~1-2MB
      const CHUNK_SIZE = 30;
      const chunks = [];
      for (let i = 0; i < groupKeys.length; i += CHUNK_SIZE) {
        const slice = groupKeys.slice(i, i + CHUNK_SIZE);
        const chunkRows = slice.flatMap(k => groups.get(k));
        chunks.push(chunkRows);
      }

      // CSV builder per ogni chunk
      const headerLine = headers.join(';');
      const csvEsc = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (/[";\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };
      const rowsToCsv = (rs) => [headerLine, ...rs.map(r => headers.map(h => csvEsc(r[h])).join(';'))].join('\n');

      // Invia chunk uno per uno
      let totals = { inserted: 0, updated: 0, errors: 0, recipes: 0 };
      const allErrors = [];

      for (let i = 0; i < chunks.length; i++) {
        setUploadProgress({ current: i + 1, total: chunks.length, recipesDone: i * CHUNK_SIZE });

        const csv = rowsToCsv(chunks[i]);
        const res = await fetch('/api/admin/upload-recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-password': authPassword },
          body: JSON.stringify({ csv })
        });

        let data = {};
        try { data = await res.json(); } catch { /* response non JSON */ }

        if (!res.ok) {
          throw new Error(`Chunk ${i + 1}/${chunks.length} fallito: ${data.error || `HTTP ${res.status}`}`);
        }

        totals.inserted += data.inserted || 0;
        totals.updated += data.updated || 0;
        totals.errors += data.errors || 0;
        totals.recipes += data.recipes || 0;
        if (Array.isArray(data.errorDetails)) allErrors.push(...data.errorDetails);

        // Pausa breve tra chunk per non saturare embedding rate limits OpenAI
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 800));
      }

      setUploadResult({
        mode: `multi-row chunked (${chunks.length} chunk x ${CHUNK_SIZE} ricette)`,
        total: rows.length,
        recipes: totals.recipes || totalRecipes,
        inserted: totals.inserted,
        updated: totals.updated,
        errors: totals.errors,
        errorDetails: allErrors.slice(0, 50),
        errorDetailsTruncated: allErrors.length > 50
      });
      await loadRecipes(search);
    } catch (err) {
      setErrMsg('Errore upload: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id, titolo) => {
    if (!window.confirm(`Eliminare "${titolo}"?`)) return;
    setErrMsg(null);
    try {
      const res = await fetch('/api/admin/delete-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': authPassword },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await loadRecipes(search);
    } catch (err) {
      setErrMsg('Errore eliminazione: ' + err.message);
    }
  };

  const downloadSampleCsv = () => {
    // Tracciato record ECI - ordine fisso 16 colonne
    const header = 'Titolo;Ricettario;Anno;Famiglia;Portata;DifficoltaTempo;Procedimento;Preparazione;NPersoneTxt;IngredientePrincipale;IngredienteSpecifico;Quantita;Um;scheda_antropologica;scheda_nutrizionale;calorie';
    const recipeFields = 'Tiramisu;Accademia Italiana della Cucina;1985;Dolci al cucchiaio;Dolci;Media 30 min;Sbattere i tuorli con lo zucchero...;{prep};6;{ing_p};{ing_s};{qty};{um};Dolce nato a Treviso negli anni 60;Ricco di proteine;380';
    const buildRow = (prep, p, s, q, u) =>
      recipeFields
        .replace('{prep}', prep)
        .replace('{ing_p}', p)
        .replace('{ing_s}', s)
        .replace('{qty}', q)
        .replace('{um}', u);
    const sample = [
      header,
      buildRow('Principale', 'Mascarpone', '', '500', 'g'),
      buildRow('Principale', 'Savoiardi', '', '300', 'g'),
      buildRow('Principale', 'Caffe', 'Espresso forte', '250', 'ml'),
      buildRow('Crema', 'Uova', 'Tuorli', '4', ''),
      buildRow('Crema', 'Zucchero', '', '100', 'g')
    ].join('\n');
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ricette-tracciato-eci.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCurrentArchive = async () => {
    setErrMsg(null);
    try {
      const res = await fetch('/api/admin/export-recipes', {
        headers: { 'x-admin-password': authPassword }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `ricette-${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrMsg('Errore export: ' + err.message);
    }
  };

  // ---- LOGIN GATE ----
  if (!authenticated) {
    return (
      <div style={manageStyles.loginCard}>
        <h2 style={manageStyles.loginTitle}>Area protetta</h2>
        <p style={manageStyles.loginSubtitle}>Inserisci la password admin per gestire le ricette</p>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            placeholder="Password admin"
            autoFocus
            style={manageStyles.loginInput}
          />
          {authError && <p style={manageStyles.errorText}>{authError}</p>}
          <button type="submit" style={manageStyles.loginBtn}>Accedi</button>
        </form>
      </div>
    );
  }

  // ---- ADMIN UI ----
  return (
    <div style={{ animation: 'fadeInUp 0.6s' }}>
      <div style={manageStyles.headerRow}>
        <h2 style={manageStyles.sectionTitle}>Gestione Ricette ({total})</h2>
        <button onClick={() => { setAuthenticated(false); setAuthPassword(''); setPwInput(''); }} style={manageStyles.linkBtn}>
          Esci
        </button>
      </div>

      {/* Upload */}
      <div style={manageStyles.card}>
        <h3 style={manageStyles.cardTitle}>Importa / esporta CSV (tracciato ECI)</h3>
        <p style={manageStyles.cardHelp}>
          <strong>Formato consigliato (multi-row):</strong> una riga per ingrediente, i campi della ricetta vengono ripetuti.<br/>
          <strong>Tracciato (16 colonne, separator <code>;</code>):</strong> <code>Titolo</code> (obbligatoria), <code>Ricettario</code>, <code>Anno</code>, <code>Famiglia</code>, <code>Portata</code>, <code>DifficoltaTempo</code>, <code>Procedimento</code>, <code>Preparazione</code> (sezione ingrediente: Principale/Crema/Ripieno/...), <code>NPersoneTxt</code>, <code>IngredientePrincipale</code>, <code>IngredienteSpecifico</code>, <code>Quantita</code>, <code>Um</code>, <code>scheda_antropologica</code>, <code>scheda_nutrizionale</code>, <code>calorie</code>.<br/>
          <strong>Identita':</strong> (titolo + ricettario + anno). Le righe con la stessa tripla vengono raggruppate e formano UNA ricetta. Gli ingredienti vengono salvati anche in forma strutturata (JSON) per round-trip pulito.<br/>
          <strong>Note:</strong> upsert su (titolo, ricettario, anno) — le ricette non presenti nel CSV non vengono toccate. Embeddings rigenerati automaticamente.<br/>
          <em style={{ color: '#9c2222' }}>Prima del primo upload: esegui le migration SQL <code>migrate-portata-ingredienti-json.sql</code> e <code>migrate-difficolta-tempo.sql</code> (in <code>/scripts</code>) su Supabase.</em>
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleUpload}
            disabled={uploading}
          />
          <button onClick={downloadCurrentArchive} style={manageStyles.secondaryBtn}>
            Scarica archivio attuale
          </button>
          <button onClick={downloadSampleCsv} style={manageStyles.secondaryBtn}>
            Scarica CSV di esempio
          </button>
          {uploading && (
            <span style={{ color: COLORS.primary, fontWeight: 600 }}>
              {uploadProgress
                ? `Caricamento chunk ${uploadProgress.current} di ${uploadProgress.total}...`
                : 'Parsing CSV in corso...'}
            </span>
          )}
        </div>

        {uploadResult && (
          <div style={manageStyles.resultBox}>
            <strong>Import completato</strong> ({uploadResult.mode || 'modalita\' standard'}): {uploadResult.inserted} inserite, {uploadResult.updated} aggiornate, {uploadResult.errors} errori. Ricette processate: {uploadResult.recipes ?? uploadResult.total} (righe CSV: {uploadResult.total}).
            {uploadResult.errorDetails?.length > 0 && (
              <details style={{ marginTop: '0.5rem' }}>
                <summary style={{ cursor: 'pointer' }}>Dettagli errori</summary>
                <ul style={{ marginTop: '0.5rem', fontSize: '0.85rem', paddingLeft: '1.25rem' }}>
                  {uploadResult.errorDetails.slice(0, 20).map((e, i) => (
                    <li key={i}>Riga {e.row}{e.titolo ? ` (${e.titolo})` : ''}: {e.error}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {errMsg && <div style={manageStyles.errorBox}>{errMsg}</div>}

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', margin: '1.5rem 0 1rem' }}>
        <input
          type="text"
          placeholder="Cerca per titolo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={manageStyles.searchInput}
        />
        <button type="submit" style={manageStyles.secondaryBtn}>Cerca</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); loadRecipes(''); }} style={manageStyles.secondaryBtn}>
            Reset
          </button>
        )}
      </form>

      {/* Table */}
      {loadingList ? (
        <p style={{ textAlign: 'center', color: COLORS.text, padding: '2rem' }}>Caricamento ricette...</p>
      ) : recipes.length === 0 ? (
        <p style={{ textAlign: 'center', color: COLORS.text, padding: '2rem' }}>Nessuna ricetta trovata.</p>
      ) : (
        <div style={manageStyles.tableWrap}>
          <table style={manageStyles.table}>
            <thead>
              <tr>
                <th style={manageStyles.th}>Titolo</th>
                <th style={manageStyles.th}>Ricettario</th>
                <th style={manageStyles.th}>Anno</th>
                <th style={manageStyles.th}>Famiglia</th>
                <th style={manageStyles.th}>Portata</th>
                <th style={manageStyles.th}>Calorie</th>
                <th style={manageStyles.th}></th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((r) => (
                <tr key={r.id}>
                  <td style={manageStyles.td}>{r.titolo}</td>
                  <td style={manageStyles.td}>{r.ricettario || '—'}</td>
                  <td style={manageStyles.td}>{r.anno || '—'}</td>
                  <td style={manageStyles.td}>{r.famiglia || '—'}</td>
                  <td style={manageStyles.td}>{r.portata || '—'}</td>
                  <td style={manageStyles.td}>{r.calorie || '—'}</td>
                  <td style={manageStyles.td}>
                    <button onClick={() => handleDelete(r.id, r.titolo)} style={manageStyles.deleteBtn}>
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const manageStyles = {
  loginCard: {
    maxWidth: '420px',
    margin: '3rem auto',
    background: 'white',
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
  },
  loginTitle: { color: COLORS.primary, marginBottom: '0.5rem', fontSize: '1.4rem' },
  loginSubtitle: { color: COLORS.text, fontSize: '0.95rem', marginBottom: '1.5rem' },
  loginInput: {
    width: '100%',
    padding: '0.85rem',
    fontSize: '1rem',
    borderRadius: '10px',
    border: '1px solid #ddd',
    marginBottom: '1rem',
    boxSizing: 'border-box'
  },
  errorText: { color: '#dc3545', fontSize: '0.9rem', marginBottom: '0.75rem' },
  loginBtn: {
    width: '100%',
    padding: '0.85rem',
    fontSize: '1rem',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.dark} 100%)`,
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer'
  },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' },
  sectionTitle: { color: COLORS.primary, fontSize: '1.4rem', margin: 0 },
  linkBtn: { background: 'transparent', border: 'none', color: COLORS.primary, cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' },
  card: { background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' },
  cardTitle: { color: COLORS.primary, marginTop: 0, marginBottom: '0.5rem', fontSize: '1.05rem' },
  cardHelp: { color: COLORS.text, fontSize: '0.9rem', margin: 0, lineHeight: 1.5 },
  resultBox: { marginTop: '1rem', padding: '0.85rem 1rem', background: '#e8f4fd', borderRadius: '10px', color: '#014d7a', fontSize: '0.9rem' },
  errorBox: { margin: '1rem 0', padding: '0.85rem 1rem', background: '#fdecea', color: '#9c2222', borderRadius: '10px', fontSize: '0.9rem' },
  secondaryBtn: { padding: '0.55rem 1rem', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' },
  primaryBtn: { padding: '0.7rem 1.4rem', background: COLORS.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600 },
  textarea: { width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #ccc', fontSize: '0.95rem', fontFamily: 'inherit', marginTop: '0.75rem', boxSizing: 'border-box', resize: 'vertical' },
  searchInput: { flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.95rem' },
  tableWrap: { overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  th: { textAlign: 'left', padding: '0.85rem', background: '#f5f7fa', borderBottom: '2px solid #e0e0e0', color: COLORS.primary, fontWeight: 600 },
  td: { padding: '0.75rem 0.85rem', borderBottom: '1px solid #f0f0f0' },
  deleteBtn: { padding: '0.4rem 0.85rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }
};

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
  const [deepAnalytics, setDeepAnalytics] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, curiositiesRes, analyticsRes, deepRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/curiosities'),
          fetch('/api/conversation-analytics'),
          fetch('/api/deep-analytics')
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (curiositiesRes.ok) setCuriosities(await curiositiesRes.json());
        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
        if (deepRes.ok) setDeepAnalytics(await deepRes.json());
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
    { id: 'insights', label: 'Insights', icon: '✨' },
    { id: 'analyses', label: 'Analisi AI', icon: '🔬' },
    { id: 'manage', label: 'Gestione', icon: '⚙️' }
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
            {activeSection === 'overview' && <OverviewSection stats={stats} analytics={analytics} deepAnalytics={deepAnalytics} />}
            {activeSection === 'recipes' && <RecipesSection curiosities={curiosities} deepAnalytics={deepAnalytics} />}
            {activeSection === 'users' && <UsersSection analytics={analytics} stats={stats} deepAnalytics={deepAnalytics} />}
            {activeSection === 'insights' && <InsightsSection analytics={analytics} curiosities={curiosities} deepAnalytics={deepAnalytics} />}
            {activeSection === 'analyses' && <AnalysesSection />}
            {activeSection === 'manage' && <ManageRecipesSection />}
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
    backgroundColor: '#f0f4f8',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.dark} 100%)`,
    padding: '1.5rem 2rem',
    boxShadow: `0 4px 20px rgba(1, 77, 122, 0.3)`,
    position: 'relative',
    zIndex: 10
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
    fontWeight: '700',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
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
    padding: '2rem',
    background: `url('/pattern-azzurra.png') repeat`,
    minHeight: 'calc(100vh - 200px)'
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
  // Timeline con CARDS
  timelineCardsWrapper: {
    position: 'relative',
    padding: '0.5rem 0 1.5rem 0'
  },
  timelineCards: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.5rem',
    position: 'relative',
    zIndex: 1
  },
  timelineCard: {
    flex: 1,
    textAlign: 'center',
    padding: '0.75rem 0.5rem',
    borderRadius: '12px',
    border: `1px solid ${COLORS.light}`,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  timelineCardIcon: {
    fontSize: '1.5rem',
    marginBottom: '0.25rem'
  },
  timelineCardYear: {
    fontWeight: 700,
    color: COLORS.primary,
    fontSize: '1rem'
  },
  timelineCardLabel: {
    fontSize: '0.7rem',
    color: COLORS.textLight,
    marginTop: '0.15rem'
  },
  timelineConnector: {
    height: '3px',
    background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`,
    marginTop: '-2rem',
    marginLeft: '10%',
    marginRight: '10%',
    borderRadius: '2px',
    position: 'relative',
    zIndex: 0
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
    marginBottom: '1.5rem',
    padding: '1rem 1.5rem',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
  },
  insightsTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: COLORS.dark,
    margin: 0
  },
  insightsSubtitle: {
    color: COLORS.text,
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
    padding: '1.5rem 2rem',
    color: COLORS.dark,
    fontSize: '0.9rem',
    fontWeight: '500',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTop: `1px solid ${COLORS.light}`,
    marginTop: '2rem'
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
  },
  // === NUOVI STILI PER DASHBOARD V2 ===

  // Top Recipes List (Overview)
  topRecipesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '0.5rem'
  },
  topRecipeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    background: COLORS.extraLight,
    borderRadius: '12px'
  },
  topRecipeRank: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: COLORS.white,
    fontWeight: '700',
    fontSize: '0.9rem'
  },
  topRecipeInfo: {
    flex: 1
  },
  topRecipeName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: COLORS.text
  },
  topRecipeStats: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.25rem'
  },
  topRecipeRating: {
    fontSize: '0.85rem',
    color: '#ffc107',
    fontWeight: '500'
  },
  topRecipeCount: {
    fontSize: '0.8rem',
    color: COLORS.textLight
  },

  // Correlation Bars (Overview)
  correlationBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '0.5rem'
  },
  correlationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  correlationLabel: {
    width: '100px',
    fontSize: '0.8rem',
    color: COLORS.text,
    fontWeight: '500'
  },
  correlationBarTrack: {
    flex: 1,
    height: '20px',
    background: COLORS.extraLight,
    borderRadius: '10px',
    overflow: 'hidden'
  },
  correlationBarFill: {
    height: '100%',
    borderRadius: '10px',
    transition: 'width 0.5s ease'
  },
  correlationValue: {
    width: '45px',
    fontSize: '0.85rem',
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'right'
  },
  correlationCount: {
    width: '80px',
    fontSize: '0.75rem',
    color: COLORS.textLight,
    textAlign: 'right'
  },

  // Golden Moment Card (Overview)
  goldenMomentCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    padding: '1.5rem',
    background: `linear-gradient(135deg, #ffd700 0%, #ffb347 100%)`,
    borderRadius: '20px',
    boxShadow: `0 4px 20px rgba(255, 215, 0, 0.3)`
  },
  goldenMomentIcon: {
    fontSize: '2.5rem'
  },
  goldenMomentContent: {
    flex: 1
  },
  goldenMomentTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: '0.25rem'
  },
  goldenMomentText: {
    fontSize: '0.95rem',
    color: COLORS.dark,
    opacity: 0.9
  },

  // Insight Box (reusable)
  insightBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    background: `${COLORS.accent}15`,
    borderRadius: '12px',
    borderLeft: `4px solid ${COLORS.accent}`
  },
  insightBoxIcon: {
    fontSize: '1.25rem'
  },
  insightBoxText: {
    fontSize: '0.85rem',
    color: COLORS.text,
    fontWeight: '500'
  },

  // Versioned Recipes List (Recipes)
  versionedRecipesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginTop: '0.5rem'
  },
  versionedRecipeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 1rem',
    background: COLORS.extraLight,
    borderRadius: '20px'
  },
  versionedRecipeName: {
    fontSize: '0.9rem',
    color: COLORS.text,
    fontWeight: '500'
  },
  versionedRecipeBadge: {
    fontSize: '0.75rem',
    color: COLORS.white,
    background: COLORS.primary,
    padding: '0.25rem 0.5rem',
    borderRadius: '10px',
    fontWeight: '600'
  },

  // Section Header (Users)
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '1rem',
    padding: '1rem 1.5rem',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: COLORS.dark,
    margin: 0
  },
  sectionSubtitle: {
    color: COLORS.text,
    fontSize: '0.9rem',
    marginTop: '0.25rem'
  },

  // Engagement List (Users)
  engagementList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '0.5rem'
  },
  engagementItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    background: COLORS.extraLight,
    borderRadius: '12px'
  },
  engagementType: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  engagementIcon: {
    fontSize: '1.25rem'
  },
  engagementTypeName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: COLORS.text
  },
  engagementMetrics: {
    display: 'flex',
    gap: '1rem'
  },
  engagementMetric: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  engagementValue: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: COLORS.primary
  },
  engagementLabel: {
    fontSize: '0.7rem',
    color: COLORS.textLight,
    textTransform: 'uppercase'
  },

  // Exploration Bars (Users)
  explorationBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '0.5rem'
  },
  explorationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  explorationLabel: {
    width: '90px',
    fontSize: '0.8rem',
    color: COLORS.text,
    fontWeight: '500'
  },
  explorationBarTrack: {
    flex: 1,
    height: '16px',
    background: COLORS.extraLight,
    borderRadius: '8px',
    overflow: 'hidden'
  },
  explorationBarFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`,
    borderRadius: '8px',
    transition: 'width 0.5s ease'
  },
  explorationStats: {
    display: 'flex',
    gap: '0.5rem',
    minWidth: '80px'
  },
  explorationPercent: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: COLORS.primary
  },
  explorationRating: {
    fontSize: '0.8rem',
    color: COLORS.textLight
  },

  // Age Recipes Grid (Users) - Layout compatto
  ageRecipesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '0.75rem',
    marginTop: '0.5rem'
  },
  ageRecipeCard: {
    background: COLORS.extraLight,
    borderRadius: '12px',
    padding: '0.75rem',
    border: `1px solid ${COLORS.light}`
  },
  ageRecipeHeader: {
    marginBottom: '0.5rem',
    paddingBottom: '0.35rem',
    borderBottom: `2px solid ${COLORS.primary}`
  },
  ageRecipeAge: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: COLORS.primary
  },
  ageRecipeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  ageRecipeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem'
  },
  ageRecipeRank: {
    fontSize: '0.75rem',
    color: COLORS.textLight,
    fontWeight: '600'
  },
  ageRecipeName: {
    fontSize: '0.75rem',
    color: COLORS.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },

  // Area Engagement Grid (Users)
  areaEngagementGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginTop: '0.5rem'
  },
  areaEngagementItem: {
    background: COLORS.extraLight,
    borderRadius: '12px',
    padding: '1rem',
    textAlign: 'center'
  },
  areaName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: '0.5rem'
  },
  areaMetrics: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  areaRating: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#ffc107'
  },
  areaDuration: {
    fontSize: '0.85rem',
    color: COLORS.primary,
    fontWeight: '500'
  },
  areaSessions: {
    fontSize: '0.8rem',
    color: COLORS.textLight
  },

  // === STILI PER CONFRONTO MODALITÀ (Avatar vs Chat) ===
  modeComparisonGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '1rem',
    alignItems: 'center',
    marginTop: '1rem'
  },
  modeComparisonCard: {
    background: COLORS.extraLight,
    borderRadius: '16px',
    padding: '1.25rem',
    textAlign: 'center'
  },
  modeComparisonHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginBottom: '1rem'
  },
  modeComparisonIcon: {
    fontSize: '1.5rem'
  },
  modeComparisonTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: COLORS.text
  },
  modeComparisonStats: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: '0.5rem'
  },
  modeComparisonStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  modeComparisonValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: COLORS.primary
  },
  modeComparisonLabel: {
    fontSize: '0.75rem',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginTop: '0.25rem'
  },
  modeVsDivider: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: COLORS.textLight,
    padding: '0 0.5rem'
  }
};
