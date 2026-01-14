// api/deep-analytics.js
// API per analytics profonde con cross-correlazioni profilo-ricette-feedback

import { neon } from '@neondatabase/serverless';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL);

    // 1. RICETTE PIÙ AMATE (rating alto) - Top 5
    const topRatedRecipes = await sql`
      SELECT
        jsonb_array_elements_text(output->'discussedRecipes') as ricetta,
        AVG(rating) as rating_medio,
        COUNT(*) as volte_discussa
      FROM azzurra_experiences
      WHERE output->'discussedRecipes' IS NOT NULL AND rating IS NOT NULL
      GROUP BY ricetta
      HAVING COUNT(*) >= 1
      ORDER BY rating_medio DESC, volte_discussa DESC
      LIMIT 5
    `;

    // 2. CORRELAZIONE durata vs rating
    const durationVsRating = await sql`
      SELECT
        CASE
          WHEN duration < 60 THEN 'Breve (<1min)'
          WHEN duration < 180 THEN 'Media (1-3min)'
          ELSE 'Lunga (>3min)'
        END as durata_categoria,
        AVG(rating) as rating_medio,
        COUNT(*) as sessioni
      FROM azzurra_experiences
      WHERE rating IS NOT NULL AND duration IS NOT NULL
      GROUP BY durata_categoria
      ORDER BY rating_medio DESC
    `;

    // 3. ENGAGEMENT per tipo utente (rapporto col cibo)
    const engagementByFoodRelation = await sql`
      SELECT
        profile->>'rapportoCibo' as tipo,
        AVG(duration) as durata_media,
        AVG(rating) as rating_medio,
        COUNT(*) as sessioni
      FROM azzurra_experiences
      WHERE profile->>'rapportoCibo' IS NOT NULL
      GROUP BY profile->>'rapportoCibo'
      ORDER BY rating_medio DESC
    `;

    // 4. ENGAGEMENT per area geografica
    const engagementByArea = await sql`
      SELECT
        COALESCE(profile->>'region', profile->>'areaGeografica') as area,
        AVG(duration) as durata_media,
        AVG(rating) as rating_medio,
        COUNT(*) as sessioni
      FROM azzurra_experiences
      WHERE COALESCE(profile->>'region', profile->>'areaGeografica') IS NOT NULL
      GROUP BY COALESCE(profile->>'region', profile->>'areaGeografica')
      ORDER BY sessioni DESC
      LIMIT 10
    `;

    // 5. RICETTE per fascia età (top 3 per fascia)
    const recipesByAge = await sql`
      SELECT
        profile->>'fasciaEta' as eta,
        jsonb_array_elements_text(output->'discussedRecipes') as ricetta,
        COUNT(*) as volte
      FROM azzurra_experiences
      WHERE output->'discussedRecipes' IS NOT NULL
        AND profile->>'fasciaEta' IS NOT NULL
      GROUP BY profile->>'fasciaEta', ricetta
      ORDER BY eta, volte DESC
    `;

    // 6. ORA con rating migliore (momento d'oro)
    const peakQualityHour = await sql`
      SELECT
        EXTRACT(HOUR FROM "timestamp") as ora,
        AVG(rating) as rating_medio,
        COUNT(*) as sessioni
      FROM azzurra_experiences
      WHERE rating IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM "timestamp")
      ORDER BY rating_medio DESC
      LIMIT 1
    `;

    // 7. INDICE ESPLORAZIONE (utenti con 1 vs 3+ ricette)
    const explorationIndex = await sql`
      SELECT
        CASE
          WHEN jsonb_array_length(output->'discussedRecipes') = 1 THEN '1 ricetta'
          WHEN jsonb_array_length(output->'discussedRecipes') = 2 THEN '2 ricette'
          ELSE '3+ ricette'
        END as livello_esplorazione,
        COUNT(*) as utenti,
        AVG(rating) as rating_medio
      FROM azzurra_experiences
      WHERE output->'discussedRecipes' IS NOT NULL
        AND jsonb_array_length(output->'discussedRecipes') > 0
      GROUP BY livello_esplorazione
      ORDER BY livello_esplorazione
    `;

    // 8. DATI RICETTE da Supabase per evoluzione calorica e DNA
    let caloriesByDecade = [];
    let realDnaIngredients = [];
    let topVersionedRecipes = [];

    try {
      // Evoluzione calorica per decennio
      const { data: recipes, error } = await supabase
        .from('ricette')
        .select('anno, calorie, ingredienti, titolo');

      if (!error && recipes) {
        // Raggruppa per decennio e calcola media calorie
        const decades = {};
        const ingredientCounts = {};
        const recipeCounts = {};

        recipes.forEach(r => {
          if (r.anno && r.calorie) {
            const decade = Math.floor(r.anno / 10) * 10;
            if (!decades[decade]) decades[decade] = { total: 0, count: 0 };
            decades[decade].total += parseFloat(r.calorie);
            decades[decade].count++;
          }

          // Conta ingredienti (parsing semplice)
          if (r.ingredienti) {
            const ingredientList = r.ingredienti
              .toLowerCase()
              .split(/[,;\n]/)
              .map(i => i.trim().split(' ')[0]) // Prima parola
              .filter(i => i.length > 2);

            ingredientList.forEach(ing => {
              // Normalizza ingrediente
              const normalized = ing
                .replace(/[0-9]/g, '')
                .replace(/gr?\.?|kg\.?|ml\.?|lt\.?|q\.?b\.?/gi, '')
                .trim();
              if (normalized.length > 2) {
                ingredientCounts[normalized] = (ingredientCounts[normalized] || 0) + 1;
              }
            });
          }

          // Conta versioni per ricetta
          if (r.titolo) {
            const normalizedTitle = r.titolo.toLowerCase().trim();
            recipeCounts[normalizedTitle] = (recipeCounts[normalizedTitle] || 0) + 1;
          }
        });

        // Formatta calorie per decennio
        caloriesByDecade = Object.entries(decades)
          .map(([decade, data]) => ({
            decade: parseInt(decade),
            avgCalories: Math.round(data.total / data.count)
          }))
          .sort((a, b) => a.decade - b.decade);

        // Top 10 ingredienti
        const totalRecipes = recipes.length;
        realDnaIngredients = Object.entries(ingredientCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            count,
            percentage: Math.round((count / totalRecipes) * 100)
          }));

        // Top ricette con più versioni
        topVersionedRecipes = Object.entries(recipeCounts)
          .filter(([_, count]) => count > 1)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([title, versions]) => ({
            title: title.charAt(0).toUpperCase() + title.slice(1),
            versions
          }));
      }
    } catch (supabaseError) {
      console.error('Supabase error:', supabaseError);
    }

    // Processa recipesByAge per ottenere top per fascia
    const processedRecipesByAge = {};
    recipesByAge.forEach(r => {
      if (!processedRecipesByAge[r.eta]) {
        processedRecipesByAge[r.eta] = [];
      }
      if (processedRecipesByAge[r.eta].length < 3) {
        processedRecipesByAge[r.eta].push({
          ricetta: r.ricetta,
          volte: parseInt(r.volte)
        });
      }
    });

    return res.status(200).json({
      success: true,

      // Metriche engagement
      topRatedRecipes,
      durationVsRating,
      engagementByFoodRelation,
      engagementByArea,

      // Pattern comportamentali
      recipesByAge: processedRecipesByAge,
      peakQualityHour: peakQualityHour[0] || null,
      explorationIndex,

      // Evoluzione ricette (da Supabase)
      caloriesByDecade,
      realDnaIngredients,
      topVersionedRecipes
    });

  } catch (error) {
    console.error('Error in deep-analytics:', error);
    return res.status(500).json({
      error: 'Failed to fetch deep analytics',
      details: error.message
    });
  }
}
