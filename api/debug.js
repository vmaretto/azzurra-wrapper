// api/debug.js - Endpoint di debug temporaneo

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const RICETTE_DATABASE = ['Tiramisù', 'Zabaione', 'Cassata siciliana', 'Cannoli'];

function normalizeText(text) {
  return text.toLowerCase()
    .replace(/[àáâã]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõ]/g, 'o')
    .replace(/[ùúûü]/g, 'u');
}

function getMentionedRecipe(message) {
  const msgNorm = normalizeText(message);
  for (const recipe of RICETTE_DATABASE) {
    const recipeNorm = normalizeText(recipe);
    if (msgNorm.includes(recipeNorm) ||
        recipeNorm.split(' ').some(word => word.length >= 4 && msgNorm.includes(word))) {
      return recipe;
    }
  }
  return null;
}

const RICETTARI_MAP = {
  'accademia': 'Accademia Italiana Della Cucina',
  'cucchiaio': "Il Cucchiaio D'Argento",
  'argento': "Il Cucchiaio D'Argento",
  'talismano': 'Il talismano della felicit',
  'artusi': 'La Scienza in Cucina',
};

function getMentionedRicettario(message) {
  const msgNorm = normalizeText(message);
  for (const [key, value] of Object.entries(RICETTARI_MAP)) {
    if (msgNorm.includes(key)) {
      return value;
    }
  }
  return null;
}

export default async function handler(req, res) {
  const { message, conversationHistory = [] } = req.body;
  
  const mentionedRicettario = getMentionedRicettario(message);
  
  let recipeFromHistory = null;
  for (const msg of conversationHistory) {
    const recipe = getMentionedRecipe(msg.content);
    if (recipe) recipeFromHistory = recipe;
  }
  
  const mentionedRecipe = getMentionedRecipe(message);
  
  // Test diretto Supabase
  let supabaseTest = null;
  if (supabase && recipeFromHistory && mentionedRicettario) {
    const recipeNameNorm = normalizeText(recipeFromHistory);
    const ricettarioNorm = normalizeText(mentionedRicettario);
    
    // Test 1: solo ricettario
    const { data: d1 } = await supabase
      .from('ricette')
      .select('titolo, ricettario')
      .ilike('ricettario', `%cucchiaio%`)
      .limit(2);
    
    // Test 2: solo titolo
    const { data: d2 } = await supabase
      .from('ricette')
      .select('titolo, ricettario')
      .ilike('titolo', `%tiramis%`);
    
    // Test 3: entrambi
    const { data: d3, error } = await supabase
      .from('ricette')
      .select('titolo, ricettario')
      .ilike('ricettario', `%${ricettarioNorm}%`)
      .ilike('titolo', `%${recipeNameNorm}%`);
    
    supabaseTest = { 
      recipeNameNorm, 
      ricettarioNorm, 
      test1_onlyRicettario: d1,
      test2_onlyTitolo: d2,
      test3_both: d3,
      error
    };
  }
  
  return res.json({
    message,
    messageNormalized: normalizeText(message),
    conversationHistory,
    mentionedRicettario,
    recipeFromHistory,
    mentionedRecipe,
    wouldEnterCase0: !!(mentionedRicettario && recipeFromHistory),
    supabaseTest
  });
}
