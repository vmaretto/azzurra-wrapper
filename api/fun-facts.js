// api/fun-facts.js
// Endpoint per ottenere curiosità random sui dolci italiani

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
    // Recupera tutte le ricette per generare curiosità
    const { data: recipes, error } = await supabase
      .from('ricette')
      .select('titolo, famiglia, ricettario, anno, calorie, n_persone, scheda_antropologica, ingredienti');

    if (error) {
      console.error('Errore recupero ricette:', error);
      return res.status(500).json({ error: 'Errore recupero dati' });
    }

    const facts = [];

    // 1. Dolce più antico
    const sortedByYear = recipes
      .filter(r => r.anno && !isNaN(parseInt(r.anno)))
      .sort((a, b) => parseInt(a.anno) - parseInt(b.anno));

    if (sortedByYear.length > 0) {
      const oldest = sortedByYear[0];
      facts.push(`La ricetta più antica nel nostro archivio è "${oldest.titolo}" dal ricettario "${oldest.ricettario}" del ${oldest.anno}!`);
    }

    // 2. Dolce più calorico
    const sortedByCalories = recipes
      .filter(r => r.calorie && !isNaN(parseInt(r.calorie)))
      .sort((a, b) => parseInt(b.calorie) - parseInt(a.calorie));

    if (sortedByCalories.length > 0) {
      const mostCaloric = sortedByCalories[0];
      facts.push(`Il dolce più calorico? "${mostCaloric.titolo}" con ben ${mostCaloric.calorie} calorie a porzione!`);
    }

    // 3. Dolce meno calorico
    if (sortedByCalories.length > 1) {
      const leastCaloric = sortedByCalories[sortedByCalories.length - 1];
      facts.push(`Per chi è attento alla linea: "${leastCaloric.titolo}" ha solo ${leastCaloric.calorie} calorie!`);
    }

    // 4. Conteggio versioni per ricetta
    const recipeVersions = {};
    recipes.forEach(r => {
      recipeVersions[r.titolo] = (recipeVersions[r.titolo] || 0) + 1;
    });
    const mostVersions = Object.entries(recipeVersions)
      .sort((a, b) => b[1] - a[1])[0];

    if (mostVersions && mostVersions[1] > 1) {
      facts.push(`Abbiamo ${mostVersions[1]} versioni diverse di "${mostVersions[0]}" da diversi ricettari storici!`);
    }

    // 5. Conteggio totale
    const uniqueRecipes = [...new Set(recipes.map(r => r.titolo))].length;
    facts.push(`Il nostro archivio contiene ${uniqueRecipes} dolci tradizionali italiani in oltre ${recipes.length} versioni storiche!`);

    // 6. Distribuzione per famiglia
    const familyCount = {};
    recipes.forEach(r => {
      if (r.famiglia) {
        familyCount[r.famiglia] = (familyCount[r.famiglia] || 0) + 1;
      }
    });
    const topFamily = Object.entries(familyCount)
      .sort((a, b) => b[1] - a[1])[0];

    if (topFamily) {
      facts.push(`La categoria più rappresentata? "${topFamily[0]}" con ${topFamily[1]} ricette!`);
    }

    // 7. Curiosità dalle schede antropologiche (se contengono testo interessante)
    const anthropologicalFacts = recipes
      .filter(r => r.scheda_antropologica && r.scheda_antropologica.length > 50)
      .map(r => {
        // Estrai la prima frase significativa
        const text = r.scheda_antropologica;
        const firstSentence = text.split('.')[0];
        if (firstSentence.length > 20 && firstSentence.length < 150) {
          return `${r.titolo}: ${firstSentence}.`;
        }
        return null;
      })
      .filter(Boolean);

    // Aggiungi alcune curiosità antropologiche random
    if (anthropologicalFacts.length > 0) {
      const randomAnthro = anthropologicalFacts[Math.floor(Math.random() * anthropologicalFacts.length)];
      facts.push(randomAnthro);
    }

    // 8. Ricettario più rappresentato
    const cookbookCount = {};
    recipes.forEach(r => {
      if (r.ricettario) {
        cookbookCount[r.ricettario] = (cookbookCount[r.ricettario] || 0) + 1;
      }
    });
    const topCookbook = Object.entries(cookbookCount)
      .sort((a, b) => b[1] - a[1])[0];

    if (topCookbook) {
      facts.push(`Il ricettario più citato è "${topCookbook[0]}" con ${topCookbook[1]} ricette!`);
    }

    // Mescola e seleziona 4 curiosità random
    const shuffled = facts.sort(() => Math.random() - 0.5);
    const selectedFacts = shuffled.slice(0, 4);

    res.status(200).json({
      facts: selectedFacts,
      totalFacts: facts.length
    });

  } catch (error) {
    console.error('Errore generazione curiosità:', error);
    res.status(500).json({ error: 'Errore nella generazione delle curiosità' });
  }
}
