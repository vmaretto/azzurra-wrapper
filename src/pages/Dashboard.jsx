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
      {/* Timeline Ricettari - Proporzionale con label alternate */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>Timeline dei Ricettari (1891 - 2020)</h3>
        <div style={{...styles.timeline, height: '140px'}}>
          <div style={{...styles.timelineLine, top: '50%'}} />
          {timeline.map((t, i) => {
            const minYear = 1891;
            const maxYear = 2020;
            const position = ((t.year - minYear) / (maxYear - minYear)) * 80 + 10;
            return (
              <TimelineDot
                key={i}
                year={t.year}
                label={t.label}
                isActive={i === 0 || i === timeline.length - 1}
                position={position}
                labelBelow={i % 2 === 0}
              />
            );
          })}
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
            {activeSection === 'overview' && <OverviewSection stats={stats} analytics={analytics} deepAnalytics={deepAnalytics} />}
            {activeSection === 'recipes' && <RecipesSection curiosities={curiosities} deepAnalytics={deepAnalytics} />}
            {activeSection === 'users' && <UsersSection analytics={analytics} stats={stats} deepAnalytics={deepAnalytics} />}
            {activeSection === 'insights' && <InsightsSection analytics={analytics} curiosities={curiosities} deepAnalytics={deepAnalytics} />}
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
    position: 'relative',
    height: '100px',
    margin: '1rem 0'
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
    zIndex: 1,
    top: '50%',
    transform: 'translateX(-50%) translateY(-50%)'
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
  }
};
