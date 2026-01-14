// api/smart-insights.js
// Endpoint per insights personalizzati e globali sui dolci italiani
// Genera "chicche" difficili da scoprire manualmente

import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Estrae ingredienti da stringa ingredienti
function parseIngredients(ingredientsStr) {
  if (!ingredientsStr) return [];

  // Tokenizza ingredienti (separati da virgola, punto e virgola, o a capo)
  const ingredients = ingredientsStr
    .toLowerCase()
    .split(/[,;\n]+/)
    .map(i => i.trim())
    .filter(i => i.length > 2)
    .map(i => {
      // Rimuovi quantità numeriche all'inizio
      return i.replace(/^[\d\s.,/]+\s*(g|gr|kg|ml|l|cl|dl|cucchiai?|cucchiaini?|tazz[ae]|bicchier[ei]|pizc[oa]|q\.?b\.?|un[ao]?)\s*/i, '')
              .replace(/^\d+\s*/, '')
              .trim();
    })
    .filter(i => i.length > 2);

  return [...new Set(ingredients)];
}

// Trova ingrediente "base" più comune
function findCommonIngredients(allRecipes) {
  const ingredientCount = {};

  allRecipes.forEach(recipe => {
    const ingredients = parseIngredients(recipe.ingredienti);
    ingredients.forEach(ing => {
      // Normalizza nomi ingredienti comuni
      let normalizedIng = ing
        .replace(/uov[ao]|tuorl[oi]|album[ei]/gi, 'uova')
        .replace(/zuccher[oi]|zucchero a velo|zucchero semolato/gi, 'zucchero')
        .replace(/farin[ae]|farina 00|farina tipo/gi, 'farina')
        .replace(/burr[oi]/gi, 'burro')
        .replace(/latt[ei]/gi, 'latte')
        .replace(/panna montata|panna fresca/gi, 'panna')
        .replace(/cacao amaro|cacao in polvere/gi, 'cacao')
        .replace(/cioccolat[oi] fondente|cioccolato al latte/gi, 'cioccolato');

      ingredientCount[normalizedIng] = (ingredientCount[normalizedIng] || 0) + 1;
    });
  });

  return Object.entries(ingredientCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
}

// Calcola evoluzione di una ricetta nel tempo
function analyzeRecipeEvolution(recipeVersions) {
  if (recipeVersions.length < 2) return null;

  const sorted = recipeVersions
    .filter(r => r.anno && !isNaN(parseInt(r.anno)))
    .sort((a, b) => parseInt(a.anno) - parseInt(b.anno));

  if (sorted.length < 2) return null;

  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];

  const oldIngredients = parseIngredients(oldest.ingredienti);
  const newIngredients = parseIngredients(newest.ingredienti);

  // Ingredienti aggiunti nel tempo
  const added = newIngredients.filter(i =>
    !oldIngredients.some(o => o.includes(i) || i.includes(o))
  );

  // Ingredienti rimossi nel tempo
  const removed = oldIngredients.filter(i =>
    !newIngredients.some(n => n.includes(i) || i.includes(n))
  );

  // Delta calorie
  const oldCalories = parseInt(oldest.calorie) || null;
  const newCalories = parseInt(newest.calorie) || null;
  const calorieDelta = oldCalories && newCalories ? newCalories - oldCalories : null;

  return {
    oldestYear: oldest.anno,
    newestYear: newest.anno,
    oldestCookbook: oldest.ricettario,
    newestCookbook: newest.ricettario,
    versionsCount: sorted.length,
    ingredientsAdded: added.slice(0, 3),
    ingredientsRemoved: removed.slice(0, 3),
    calorieDelta,
    oldIngredientCount: oldIngredients.length,
    newIngredientCount: newIngredients.length
  };
}

// Trova connessioni tra ricette (ingredienti in comune)
function findRecipeConnections(recipes, allRecipes) {
  if (recipes.length < 2) return [];

  const connections = [];

  for (let i = 0; i < recipes.length; i++) {
    for (let j = i + 1; j < recipes.length; j++) {
      const recipe1 = allRecipes.find(r => r.titolo === recipes[i]);
      const recipe2 = allRecipes.find(r => r.titolo === recipes[j]);

      if (!recipe1 || !recipe2) continue;

      const ing1 = parseIngredients(recipe1.ingredienti);
      const ing2 = parseIngredients(recipe2.ingredienti);

      const shared = ing1.filter(i =>
        ing2.some(j => i.includes(j) || j.includes(i))
      );

      if (shared.length >= 2) {
        connections.push({
          recipe1: recipes[i],
          recipe2: recipes[j],
          sharedIngredients: shared.slice(0, 5),
          sharedCount: shared.length
        });
      }
    }
  }

  return connections;
}

// Calcola trend globali sui dati
function calculateGlobalTrends(allRecipes) {
  const trends = {};

  // Raggruppa per decennio
  const byDecade = {};
  allRecipes.forEach(r => {
    if (r.anno) {
      const decade = Math.floor(parseInt(r.anno) / 10) * 10;
      if (!byDecade[decade]) byDecade[decade] = [];
      byDecade[decade].push(r);
    }
  });

  // Calcola media ingredienti per decennio
  const ingredientsByDecade = Object.entries(byDecade)
    .map(([decade, recipes]) => {
      const avgIngredients = recipes.reduce((sum, r) => {
        return sum + parseIngredients(r.ingredienti).length;
      }, 0) / recipes.length;
      return { decade: parseInt(decade), avgIngredients: Math.round(avgIngredients * 10) / 10 };
    })
    .sort((a, b) => a.decade - b.decade);

  // Trend semplificazione/complicazione
  if (ingredientsByDecade.length >= 2) {
    const first = ingredientsByDecade[0];
    const last = ingredientsByDecade[ingredientsByDecade.length - 1];
    trends.ingredientTrend = {
      from: first,
      to: last,
      delta: Math.round((last.avgIngredients - first.avgIngredients) * 10) / 10
    };
  }

  // Calcola media calorie per decennio
  const caloriesByDecade = Object.entries(byDecade)
    .map(([decade, recipes]) => {
      const recipesWithCalories = recipes.filter(r => r.calorie && !isNaN(parseInt(r.calorie)));
      if (recipesWithCalories.length === 0) return null;
      const avgCalories = recipesWithCalories.reduce((sum, r) => sum + parseInt(r.calorie), 0) / recipesWithCalories.length;
      return { decade: parseInt(decade), avgCalories: Math.round(avgCalories) };
    })
    .filter(Boolean)
    .sort((a, b) => a.decade - b.decade);

  if (caloriesByDecade.length >= 2) {
    const first = caloriesByDecade[0];
    const last = caloriesByDecade[caloriesByDecade.length - 1];
    trends.calorieTrend = {
      from: first,
      to: last,
      delta: last.avgCalories - first.avgCalories
    };
  }

  return trends;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database non configurato' });
  }

  const { discussedRecipes = [], conversationHistory = [] } = req.body;

  try {
    // Recupera tutte le ricette
    const { data: allRecipes, error } = await supabase
      .from('ricette')
      .select('titolo, famiglia, ricettario, anno, calorie, n_persone, scheda_antropologica, ingredienti');

    if (error) {
      console.error('Errore recupero ricette:', error);
      return res.status(500).json({ error: 'Errore recupero dati' });
    }

    const personalized = [];
    const global = [];

    // ===== INSIGHTS PERSONALIZZATI =====
    if (discussedRecipes.length > 0) {

      // 1. Evoluzione delle ricette discusse
      for (const recipeTitle of discussedRecipes) {
        const recipeVersions = allRecipes.filter(r =>
          r.titolo.toLowerCase() === recipeTitle.toLowerCase()
        );

        if (recipeVersions.length > 1) {
          const evolution = analyzeRecipeEvolution(recipeVersions);

          if (evolution) {
            // Insight sulle versioni
            personalized.push({
              type: 'evolution',
              recipe: recipeTitle,
              icon: '📚',
              text: `"${recipeTitle}" ha viaggiato nel tempo: ${evolution.versionsCount} versioni dal ${evolution.oldestYear} al ${evolution.newestYear}!`,
              detail: `Dal "${evolution.oldestCookbook}" al "${evolution.newestCookbook}"`
            });

            // Insight sui cambiamenti ingredienti
            if (evolution.ingredientsAdded.length > 0 || evolution.ingredientsRemoved.length > 0) {
              let changeText = `Nel corso di ${parseInt(evolution.newestYear) - parseInt(evolution.oldestYear)} anni, "${recipeTitle}" `;
              if (evolution.ingredientsAdded.length > 0) {
                changeText += `ha acquisito ${evolution.ingredientsAdded.join(', ')}`;
              }
              if (evolution.ingredientsRemoved.length > 0) {
                if (evolution.ingredientsAdded.length > 0) changeText += ' e ';
                changeText += `ha perso ${evolution.ingredientsRemoved.join(', ')}`;
              }

              personalized.push({
                type: 'ingredient_change',
                recipe: recipeTitle,
                icon: '🔄',
                text: changeText,
                detail: `${evolution.oldIngredientCount} ingredienti nel ${evolution.oldestYear} → ${evolution.newIngredientCount} nel ${evolution.newestYear}`
              });
            }

            // Insight sulle calorie
            if (evolution.calorieDelta !== null && Math.abs(evolution.calorieDelta) > 20) {
              const direction = evolution.calorieDelta > 0 ? 'aumentato' : 'diminuito';
              personalized.push({
                type: 'calorie_evolution',
                recipe: recipeTitle,
                icon: evolution.calorieDelta > 0 ? '📈' : '📉',
                text: `Le calorie di "${recipeTitle}" sono ${direction} di ${Math.abs(evolution.calorieDelta)} kcal dal ${evolution.oldestYear} al ${evolution.newestYear}`,
                detail: 'Effetto delle moderne tecniche e ingredienti'
              });
            }
          }
        }

        // 2. Curiosità dalla scheda antropologica
        const recipeData = recipeVersions[0];
        if (recipeData?.scheda_antropologica) {
          const antropo = recipeData.scheda_antropologica;

          // Cerca frasi interessanti con parole chiave
          const keywords = ['leggenda', 'tradizione', 'origina', 'nato', 'inventat', 'storia', 'anticamente', 'medievale', 'rinasciment', 'nobil', 'popolar'];
          const sentences = antropo.split(/[.!?]+/).filter(s => s.length > 30 && s.length < 200);

          for (const sentence of sentences) {
            const lowerSentence = sentence.toLowerCase();
            if (keywords.some(k => lowerSentence.includes(k))) {
              personalized.push({
                type: 'history',
                recipe: recipeTitle,
                icon: '🏛️',
                text: sentence.trim(),
                detail: `Dalla tradizione di "${recipeTitle}"`
              });
              break; // Solo una curiosità storica per ricetta
            }
          }
        }
      }

      // 3. Connessioni tra ricette discusse
      if (discussedRecipes.length >= 2) {
        const connections = findRecipeConnections(discussedRecipes, allRecipes);

        connections.forEach(conn => {
          personalized.push({
            type: 'connection',
            recipes: [conn.recipe1, conn.recipe2],
            icon: '🤝',
            text: `"${conn.recipe1}" e "${conn.recipe2}" sono parenti dolciari! Condividono ${conn.sharedCount} ingredienti`,
            detail: `In comune: ${conn.sharedIngredients.slice(0, 3).join(', ')}`
          });
        });
      }

      // 4. Quanto è "rara" la scelta dell'utente (statistiche)
      try {
        const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL);

        for (const recipeTitle of discussedRecipes.slice(0, 2)) {
          // Conta quante volte questa ricetta è stata discussa
          const recipeStats = await sql`
            SELECT COUNT(*) as total_sessions,
                   COUNT(CASE WHEN output::text ILIKE ${'%' + recipeTitle + '%'} THEN 1 END) as with_recipe
            FROM azzurra_experiences
          `;

          if (recipeStats[0]?.total_sessions > 10) {
            const total = parseInt(recipeStats[0].total_sessions);
            const withRecipe = parseInt(recipeStats[0].with_recipe);
            const percentage = Math.round((withRecipe / total) * 100);

            if (percentage < 20) {
              personalized.push({
                type: 'rarity',
                recipe: recipeTitle,
                icon: '💎',
                text: `Solo il ${percentage}% degli utenti esplora "${recipeTitle}": hai gusti raffinati!`,
                detail: `${withRecipe} sessioni su ${total} totali`
              });
            } else if (percentage > 60) {
              personalized.push({
                type: 'popular',
                recipe: recipeTitle,
                icon: '⭐',
                text: `"${recipeTitle}" è un classico intramontabile! Il ${percentage}% degli utenti lo sceglie`,
                detail: 'Uno dei dolci più amati'
              });
            }
          }
        }
      } catch (err) {
        console.log('Stats non disponibili:', err.message);
      }
    }

    // ===== INSIGHTS GLOBALI =====

    // 1. DNA della pasticceria italiana (ingredienti più comuni)
    const commonIngredients = findCommonIngredients(allRecipes);
    const topThree = commonIngredients.slice(0, 3).map(([ing]) => ing);
    const topThreePercentage = commonIngredients.slice(0, 3).map(([ing, count]) =>
      Math.round((count / allRecipes.length) * 100)
    );

    global.push({
      type: 'dna',
      icon: '🧬',
      text: `Il DNA della pasticceria italiana: ${topThree.join(' + ')} sono presenti nel ${topThreePercentage[0]}% delle ricette`,
      detail: 'La base di quasi ogni dolce tradizionale'
    });

    // 2. Trend temporali
    const trends = calculateGlobalTrends(allRecipes);

    if (trends.ingredientTrend) {
      const t = trends.ingredientTrend;
      const direction = t.delta > 0 ? 'si sono complicate' : 'si sono semplificate';
      global.push({
        type: 'trend',
        icon: t.delta > 0 ? '📊' : '✨',
        text: `Le ricette ${direction}: da ${t.from.avgIngredients} ingredienti medi negli anni ${t.from.decade} a ${t.to.avgIngredients} negli anni ${t.to.decade}`,
        detail: `Variazione di ${Math.abs(t.delta)} ingredienti in media`
      });
    }

    if (trends.calorieTrend) {
      const t = trends.calorieTrend;
      const direction = t.delta > 0 ? 'aumentate' : 'diminuite';
      global.push({
        type: 'calorie_trend',
        icon: '🍰',
        text: `Le calorie medie sono ${direction} di ${Math.abs(t.delta)} kcal dal ${t.from.decade} al ${t.to.decade}`,
        detail: 'L\'evoluzione del gusto italiano'
      });
    }

    // 3. Ricettari a confronto
    const cookbookStats = {};
    allRecipes.forEach(r => {
      if (r.ricettario && r.calorie) {
        if (!cookbookStats[r.ricettario]) {
          cookbookStats[r.ricettario] = { totalCalories: 0, count: 0, totalIngredients: 0 };
        }
        cookbookStats[r.ricettario].totalCalories += parseInt(r.calorie) || 0;
        cookbookStats[r.ricettario].count++;
        cookbookStats[r.ricettario].totalIngredients += parseIngredients(r.ingredienti).length;
      }
    });

    const cookbookAverages = Object.entries(cookbookStats)
      .filter(([_, stats]) => stats.count >= 5)
      .map(([name, stats]) => ({
        name,
        avgCalories: Math.round(stats.totalCalories / stats.count),
        avgIngredients: Math.round(stats.totalIngredients / stats.count * 10) / 10
      }))
      .sort((a, b) => a.avgCalories - b.avgCalories);

    if (cookbookAverages.length >= 2) {
      const lightest = cookbookAverages[0];
      const heaviest = cookbookAverages[cookbookAverages.length - 1];

      global.push({
        type: 'cookbook_comparison',
        icon: '📖',
        text: `"${lightest.name}" è il ricettario più leggero (${lightest.avgCalories} kcal/porzione), "${heaviest.name}" il più ricco (${heaviest.avgCalories} kcal)`,
        detail: `Differenza di ${heaviest.avgCalories - lightest.avgCalories} calorie!`
      });
    }

    // 4. Categorie a confronto
    const familyStats = {};
    allRecipes.forEach(r => {
      if (r.famiglia) {
        if (!familyStats[r.famiglia]) {
          familyStats[r.famiglia] = { totalIngredients: 0, count: 0 };
        }
        familyStats[r.famiglia].totalIngredients += parseIngredients(r.ingredienti).length;
        familyStats[r.famiglia].count++;
      }
    });

    const familyAverages = Object.entries(familyStats)
      .filter(([_, stats]) => stats.count >= 3)
      .map(([name, stats]) => ({
        name,
        avgIngredients: Math.round(stats.totalIngredients / stats.count * 10) / 10
      }))
      .sort((a, b) => a.avgIngredients - b.avgIngredients);

    if (familyAverages.length >= 2) {
      const simplest = familyAverages[0];
      const complex = familyAverages[familyAverages.length - 1];

      global.push({
        type: 'category_comparison',
        icon: '📋',
        text: `I "${simplest.name}" sono i più semplici (${simplest.avgIngredients} ingredienti medi), le "${complex.name}" le più elaborate (${complex.avgIngredients})`,
        detail: 'Complessità media per categoria'
      });
    }

    // 5. Ingrediente "sorpresa" (meno comune ma presente in ricette famose)
    const rarerIngredients = commonIngredients
      .filter(([_, count]) => count >= 3 && count <= 10)
      .slice(0, 5);

    if (rarerIngredients.length > 0) {
      const [rareIng, rareCount] = rarerIngredients[Math.floor(Math.random() * rarerIngredients.length)];
      global.push({
        type: 'rare_ingredient',
        icon: '🔮',
        text: `Ingrediente nascosto: "${rareIng}" compare in ${rareCount} ricette tradizionali ma è poco conosciuto`,
        detail: 'Un tocco segreto della tradizione'
      });
    }

    // Limita gli insights (4 personalizzati + 3 globali)
    const finalPersonalized = personalized.slice(0, 4);
    const finalGlobal = global.sort(() => Math.random() - 0.5).slice(0, 3);

    res.status(200).json({
      success: true,
      personalized: finalPersonalized,
      global: finalGlobal,
      meta: {
        discussedRecipesCount: discussedRecipes.length,
        totalRecipesInDb: allRecipes.length
      }
    });

  } catch (error) {
    console.error('Errore generazione insights:', error);
    res.status(500).json({ error: 'Errore nella generazione degli insights' });
  }
}
