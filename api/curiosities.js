// api/curiosities.js
// Endpoint per ottenere tutte le curiosità e statistiche sui dolci (admin)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database non configurato' });
  }

  try {
    // Recupera tutte le ricette
    const { data: recipes, error } = await supabase
      .from('ricette')
      .select('titolo, famiglia, ricettario, anno, calorie, n_persone, scheda_antropologica, ingredienti');

    if (error) {
      console.error('Errore recupero ricette:', error);
      return res.status(500).json({ error: 'Errore recupero dati' });
    }

    // Ricette ordinate per anno
    const sortedByYear = recipes
      .filter(r => r.anno && !isNaN(parseInt(r.anno)))
      .sort((a, b) => parseInt(a.anno) - parseInt(b.anno));

    // Ricetta più antica e più recente
    const oldestRecipe = sortedByYear.length > 0 ? sortedByYear[0] : null;
    const newestRecipe = sortedByYear.length > 0 ? sortedByYear[sortedByYear.length - 1] : null;

    // Ricette ordinate per calorie
    const sortedByCalories = recipes
      .filter(r => r.calorie && !isNaN(parseInt(r.calorie)))
      .sort((a, b) => parseInt(b.calorie) - parseInt(a.calorie));

    const mostCaloric = sortedByCalories.length > 0 ? sortedByCalories[0] : null;
    const leastCaloric = sortedByCalories.length > 0 ? sortedByCalories[sortedByCalories.length - 1] : null;

    // Distribuzione per famiglia
    const familyCount = {};
    recipes.forEach(r => {
      if (r.famiglia) {
        familyCount[r.famiglia] = (familyCount[r.famiglia] || 0) + 1;
      }
    });
    const familyDistribution = Object.entries(familyCount)
      .map(([famiglia, count]) => ({ famiglia, count }))
      .sort((a, b) => b.count - a.count);

    // Distribuzione per ricettario
    const cookbookCount = {};
    recipes.forEach(r => {
      if (r.ricettario) {
        cookbookCount[r.ricettario] = (cookbookCount[r.ricettario] || 0) + 1;
      }
    });
    const cookbookDistribution = Object.entries(cookbookCount)
      .map(([ricettario, count]) => ({ ricettario, count }))
      .sort((a, b) => b.count - a.count);

    // Conteggio versioni per ricetta
    const recipeVersions = {};
    recipes.forEach(r => {
      recipeVersions[r.titolo] = (recipeVersions[r.titolo] || 0) + 1;
    });
    const versionDistribution = Object.entries(recipeVersions)
      .map(([titolo, versions]) => ({ titolo, versions }))
      .sort((a, b) => b.versions - a.versions);

    // Statistiche generali
    const uniqueRecipes = [...new Set(recipes.map(r => r.titolo))].length;
    const totalVersions = recipes.length;

    // Calorie medie
    const recipesWithCalories = recipes.filter(r => r.calorie && !isNaN(parseInt(r.calorie)));
    const avgCalories = recipesWithCalories.length > 0
      ? Math.round(recipesWithCalories.reduce((sum, r) => sum + parseInt(r.calorie), 0) / recipesWithCalories.length)
      : 0;

    res.status(200).json({
      // Ricette speciali
      oldestRecipe: oldestRecipe ? {
        titolo: oldestRecipe.titolo,
        anno: oldestRecipe.anno,
        ricettario: oldestRecipe.ricettario
      } : null,
      newestRecipe: newestRecipe ? {
        titolo: newestRecipe.titolo,
        anno: newestRecipe.anno,
        ricettario: newestRecipe.ricettario
      } : null,
      mostCaloric: mostCaloric ? {
        titolo: mostCaloric.titolo,
        calorie: mostCaloric.calorie
      } : null,
      leastCaloric: leastCaloric ? {
        titolo: leastCaloric.titolo,
        calorie: leastCaloric.calorie
      } : null,

      // Distribuzioni
      familyDistribution,
      cookbookDistribution,
      versionDistribution: versionDistribution.slice(0, 10), // Top 10

      // Statistiche generali
      totalRecipes: uniqueRecipes,
      totalVersions,
      avgCalories,
      cookbooksCount: Object.keys(cookbookCount).length,
      familiesCount: Object.keys(familyCount).length
    });

  } catch (error) {
    console.error('Errore generazione curiosità:', error);
    res.status(500).json({ error: 'Errore nella generazione delle curiosità' });
  }
}
