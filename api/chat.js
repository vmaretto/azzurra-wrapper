// api/chat.js
// Endpoint SEMPLIFICATO per processare le domande dell'utente tramite Claude con RAG

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Supabase e OpenAI per RAG
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const openai = openaiKey
  ? new OpenAI({ apiKey: openaiKey })
  : null;

// Lista completa delle 52 ricette nel database
const RICETTE_DATABASE = [
  // Biscotti
  'Amaretti', 'Cantuccini Toscani IGP', 'Ricciarelli di Siena IGP', 'Savoiardi', 'Brigidini', 'Cavallucci di Siena', 'Fave dei morti',
  // Dolci al cucchiaio
  'Biancomangiare', 'Tiramisù', 'Zabaione', 'Zuppa inglese', 'Budino al cioccolato', 'Budino di semolino', 'Panna cotta',
  // Dolci al forno
  'Castagnaccio', 'Certosino', 'Migliaccio', 'Pan dolce alle noci', 'Panforte di Siena IGP', 'Presnitz', 'Crostata di ricotta', 'Crostata con confettura di frutta', 'Pastiera napoletana', 'Strudel di mele', 'Torta sabbiosa', 'Torta Margherita',
  // Dolci fritti
  'Cicerchiata', 'Castagnole', 'Chiacchiere o frappe', 'Frittelle di riso', 'Frittelle di mele', 'Crema fritta', 'Babà', 'Cannoli', 'Sfogliatelle napoletane',
  // Dolci festivi
  'Panettone', 'Torrone', 'Croccante', 'Pinoccate',
  // Dolci regionali
  'Cassata siciliana', 'Maritozzi', 'Pesche ripiene alla piemontese',
  // Altri
  'Pere con il vino rosso', 'Gelato alla crema', 'Granita di caffè con panna', 'Cioccolatini alle mandorle',
  // Salati
  'Bruschetta', 'Calzone alla napoletana', 'Panzerotti fritti', 'Piadina Romagnola IGP', 'Pizza napoletana STG', 'Torta di patate', 'Torta Pasqualina con spinaci'
];

// Ricette salate (da escludere per suggerimenti generici)
const RICETTE_SALATE = ['Bruschetta', 'Calzone alla napoletana', 'Panzerotti fritti', 'Piadina Romagnola IGP', 'Pizza napoletana STG', 'Torta di patate', 'Torta Pasqualina con spinaci'];

// Normalizza testo per confronti
function normalizeText(text) {
  return text.toLowerCase()
    .replace(/[àáâã]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõ]/g, 'o')
    .replace(/[ùúûü]/g, 'u');
}

// Rileva quale ricetta del catalogo viene menzionata nel messaggio
function getMentionedRecipe(message) {
  const msgNorm = normalizeText(message);

  for (const recipe of RICETTE_DATABASE) {
    const recipeNorm = normalizeText(recipe);

    // Match esatto o parole chiave significative (>= 4 caratteri)
    // Cambiato da > 4 a >= 4 per matchare "pere", "baba", etc.
    if (msgNorm.includes(recipeNorm) ||
        recipeNorm.split(' ').some(word => word.length >= 4 && msgNorm.includes(word))) {
      return recipe;
    }
  }
  return null;
}

// Mappa nomi comuni -> nomi esatti nel database
const RICETTARI_MAP = {
  'accademia': 'Accademia Italiana Della Cucina',
  'cucchiaio': 'Il Cucchiaio D\'Argento',
  'argento': 'Il Cucchiaio D\'Argento',
  'talismano': 'Il talismano della felicit',
  'artusi': 'La Scienza in Cucina',
  'scienza in cucina': 'La Scienza in Cucina',
  'marchesi': 'Gualtiero Marchesi',
  'gualtiero': 'Gualtiero Marchesi',
  'crea': 'CREA'
};

// Rileva se l'utente sta chiedendo un ricettario specifico
function getMentionedRicettario(message) {
  const msgNorm = normalizeText(message);
  
  for (const [key, value] of Object.entries(RICETTARI_MAP)) {
    if (msgNorm.includes(key)) {
      return value;
    }
  }
  return null;
}

// Cerca ricetta per titolo E ricettario specifico
async function searchRecipeByNameAndRicettario(recipeName, ricettario) {
  if (!supabase) return [];

  try {
    // Normalizza i parametri: minuscolo + rimuove accenti
    // (necessario perché il DB ha encoding issues con gli accenti)
    const recipeNameNorm = normalizeText(recipeName);
    const ricettarioNorm = ricettario ? normalizeText(ricettario) : null;
    
    console.log('🔍 Cerco ricetta:', recipeNameNorm, 'da ricettario:', ricettarioNorm);

    // IMPORTANTE: filtrare prima per ricettario, poi per titolo
    // (bug del client Supabase JS con ordine inverso)
    let query = supabase
      .from('ricette')
      .select('*');
    
    if (ricettarioNorm) {
      query = query.ilike('ricettario', `%${ricettarioNorm}%`);
    }
    
    query = query.ilike('titolo', `%${recipeNameNorm}%`);

    const { data, error } = await query;

    if (error) {
      console.error('Errore Supabase:', error);
      return [];
    }

    console.log(`✅ Trovate ${data?.length || 0} versioni`);
    return data || [];

  } catch (err) {
    console.error('Errore ricerca:', err);
    return [];
  }
}

// Rileva se la richiesta è generica
function isGenericRequest(message) {
  const genericPatterns = [
    /consiglia/i, /suggeris/i, /propon/i, /cosa mi/i, /che dolce/i,
    /un dolce/i, /qualcosa di/i, /dimmi un/i, /raccontami/i,
    /parlami di un/i, /a tuo piacimento/i, /scegli tu/i, /decidi tu/i,
    /sorprendimi/i, /qualche idea/i, /non so cosa/i, /indeciso/i
  ];
  return genericPatterns.some(p => p.test(message));
}

// Ottieni UNA ricetta random (solo dolci)
function getRandomRecipe() {
  const dolci = RICETTE_DATABASE.filter(r => !RICETTE_SALATE.includes(r));
  return dolci[Math.floor(Math.random() * dolci.length)];
}

// System prompt per Azzurra
const AZZURRA_SYSTEM_PROMPT = `## PERSONA
Sono Azzurra, guida della tradizione dolciaria italiana. Parlo in modo caldo e sintetico.

## REGOLA FONDAMENTALE - LEGGERE ATTENTAMENTE
Posso parlare ESCLUSIVAMENTE di queste ricette del mio archivio:
${RICETTE_DATABASE.join(', ')}.

DIVIETO ASSOLUTO: Non posso MAI menzionare, suggerire o parlare di ricette/piatti che NON sono in questa lista.
Se l'utente chiede qualcosa non in lista, propongo gentilmente una ricetta alternativa dal mio catalogo.

## ISTRUZIONI
1. Quando chiedono di un dolce: una frase sulla storia/origini, poi chiedi quale RICETTARIO preferiscono
2. Menziona i RICETTARI disponibili (es: "Ho versioni dall'Accademia Italiana della Cucina, dal Cucchiaio d'Argento, da Artusi...")
3. Per ingredienti/procedimento: specifica SEMPRE ricettario e anno
4. Per calorie: usa SOLO dati nel contesto, MAI inventare
5. Per suggerimenti generici: scegli SOLO dalla lista del catalogo sopra

## FORMATO - IMPORTANTISSIMO
- Risposte BREVI: massimo 2-3 frasi
- MAI elenchi numerati (1. 2. 3.) o puntati (- •)
- NO asterischi, NO emoji
- Linguaggio parlato naturale (viene letto ad alta voce)`;

// Cerca ricette in Supabase per NOME ESATTO
async function searchRecipeByName(recipeName) {
  if (!supabase) return [];

  try {
    console.log('🔍 Cerco ricetta per nome:', recipeName);

    const { data, error } = await supabase
      .from('ricette')
      .select('*')
      .ilike('titolo', `%${recipeName}%`);

    if (error) {
      console.error('Errore Supabase:', error);
      return [];
    }

    // Filtra per assicurarsi che siano SOLO versioni della ricetta richiesta
    const filtered = data.filter(r => {
      const titleNorm = normalizeText(r.titolo);
      const queryNorm = normalizeText(recipeName);
      return titleNorm.includes(queryNorm) || queryNorm.includes(titleNorm);
    });

    console.log(`✅ Trovate ${filtered.length} versioni di "${recipeName}"`);
    return filtered;

  } catch (err) {
    console.error('Errore ricerca:', err);
    return [];
  }
}

// RICERCA SEMANTICA con embeddings
async function searchRecipesSemantic(query, matchCount = 5) {
  if (!supabase || !openai) {
    console.log('⚠️ Supabase o OpenAI non configurati per ricerca semantica');
    return [];
  }

  try {
    console.log('🧠 Ricerca semantica per:', query);

    // 1. Genera embedding della query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Chiama la funzione RPC search_ricette
    const { data, error } = await supabase.rpc('search_ricette', {
      query_embedding: queryEmbedding,
      match_count: matchCount
    });

    if (error) {
      console.error('Errore ricerca semantica:', error);
      return [];
    }

    console.log(`🎯 Trovate ${data?.length || 0} ricette semanticamente simili`);
    return data || [];

  } catch (err) {
    console.error('Errore ricerca semantica:', err);
    return [];
  }
}

// Formatta il contesto delle ricette per Claude
function formatRecipesContext(recipes, recipeName) {
  if (!recipes || recipes.length === 0) {
    return `\n\n## NESSUNA RICETTA TROVATA
Non ho trovato "${recipeName}" nel database. Rispondi che non hai informazioni su questa ricetta.`;
  }

  // Raggruppa per ricettario
  const versioniList = recipes.map(r => r.ricettario).join(', ');

  // Riepilogo calorie
  const conCalorie = recipes.filter(r => r.calorie && r.calorie !== 'Non disponibili');
  const calorieInfo = conCalorie.length > 0
    ? `\nCALORIE DISPONIBILI:\n${conCalorie.map(r => `- ${r.ricettario}: ${r.calorie}`).join('\n')}`
    : '\nNessuna versione ha calorie disponibili.';

  // Dettagli di ogni versione
  const details = recipes.map(r => `
### ${r.titolo} - ${r.ricettario}
Ingredienti: ${r.ingredienti || 'Non disponibili'}
Procedimento: ${r.procedimento || 'Non disponibile'}
Storia: ${r.scheda_antropologica || 'Non disponibile'}
Calorie: ${r.calorie || 'Non disponibili'}
Persone: ${r.n_persone || 'Non specificato'}
`).join('\n');

  return `\n\n## RICETTA: ${recipeName.toUpperCase()}
Ci sono ${recipes.length} versioni da: ${versioniList}
${calorieInfo}

IMPORTANTE: NON elencare tutte le versioni! Racconta la STORIA del dolce in modo discorsivo, poi menziona che ci sono diverse versioni e chiedi quale preferisce esplorare.
${details}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, conversationHistory = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    let relevantRecipes = [];
    let contextInfo = '';
    let searchedRecipe = null;

    // 0. Controlla se menziona un ricettario specifico (follow-up)
    const mentionedRicettario = getMentionedRicettario(message);
    
    // Estrai la ricetta dalla conversation history se non è nel messaggio
    let recipeFromHistory = null;
    if (conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        const recipe = getMentionedRecipe(msg.content);
        if (recipe) recipeFromHistory = recipe;
      }
    }

    // 1. Controlla se menziona una ricetta specifica
    const mentionedRecipe = getMentionedRecipe(message);

    if (mentionedRicettario && recipeFromHistory) {
      // CASO 0: Utente chiede un ricettario specifico per una ricetta discussa
      console.log('📚 Ricettario specifico:', mentionedRicettario, 'per:', recipeFromHistory);
      searchedRecipe = recipeFromHistory;
      relevantRecipes = await searchRecipeByNameAndRicettario(recipeFromHistory, mentionedRicettario);
      
      if (relevantRecipes.length > 0) {
        contextInfo = `\n\n## VERSIONE SPECIFICA RICHIESTA
L'utente ha chiesto la versione di "${recipeFromHistory}" dal ricettario "${mentionedRicettario}".
FORNISCI GLI INGREDIENTI E IL PROCEDIMENTO COMPLETO di questa versione specifica.
${formatRecipesContext(relevantRecipes, recipeFromHistory)}`;
      } else {
        contextInfo = `\n\n## RICETTARIO NON TROVATO
Non ho trovato la versione di "${recipeFromHistory}" da "${mentionedRicettario}".
Proponi le versioni disponibili.`;
      }

    } else if (mentionedRecipe) {
      // CASO A: Ricetta specifica menzionata -> cerca SOLO quella
      console.log('📌 Ricetta specifica:', mentionedRecipe);
      searchedRecipe = mentionedRecipe;
      relevantRecipes = await searchRecipeByName(mentionedRecipe);
      contextInfo = formatRecipesContext(relevantRecipes, mentionedRecipe);

    } else if (isGenericRequest(message)) {
      // CASO B: Richiesta generica -> USA RICERCA SEMANTICA
      console.log('🧠 Richiesta generica - uso ricerca semantica');
      
      // Prova ricerca semantica
      const semanticResults = await searchRecipesSemantic(message, 3);
      
      if (semanticResults.length > 0) {
        // Usa il risultato più rilevante
        const topResult = semanticResults[0];
        searchedRecipe = topResult.titolo;
        relevantRecipes = semanticResults;
        
        contextInfo = `\n\n## SUGGERIMENTO BASATO SU RICERCA SEMANTICA
Ho trovato ricette correlate alla richiesta dell'utente.
Ricette trovate (in ordine di rilevanza): ${semanticResults.map(r => r.titolo).join(', ')}.
Proponi "${topResult.titolo}" in modo naturale, menzionando perché è adatto alla richiesta.
${formatRecipesContext(semanticResults, 'ricette suggerite')}`;
      } else {
        // Fallback a random se semantica fallisce
        const suggestion = getRandomRecipe();
        console.log('🎲 Fallback a suggerimento random:', suggestion);
        searchedRecipe = suggestion;
        relevantRecipes = await searchRecipeByName(suggestion);

        contextInfo = `\n\n## SUGGERIMENTO PER RICHIESTA GENERICA
L'utente ha chiesto un consiglio generico. Proponi "${suggestion}" in modo naturale e invitante.
Presenta brevemente il dolce e le sue origini, poi chiedi se vuole saperne di più.
${formatRecipesContext(relevantRecipes, suggestion)}`;
      }

    } else {
      // CASO C: Nessuna ricetta specifica - PROVA RICERCA SEMANTICA
      console.log('🧠 Provo ricerca semantica per domanda generica');
      
      const semanticResults = await searchRecipesSemantic(message, 3);
      
      if (semanticResults.length > 0 && semanticResults[0].similarity > 0.3) {
        // Risultati semantici rilevanti trovati
        relevantRecipes = semanticResults;
        contextInfo = `\n\n## RICETTE TROVATE CON RICERCA SEMANTICA
Ho trovato ricette che potrebbero essere correlate alla domanda.
Ricette: ${semanticResults.map(r => `${r.titolo} (${Math.round(r.similarity * 100)}%)`).join(', ')}.
Usa queste informazioni se pertinenti alla domanda dell'utente.
${formatRecipesContext(semanticResults, 'ricette correlate')}`;
      } else {
        // Nessun risultato rilevante -> domanda di contesto
        console.log('💬 Domanda di contesto/follow-up');
        contextInfo = `\n\n## DOMANDA DI CONTESTO
L'utente sta facendo una domanda che si riferisce alla conversazione precedente.
Usa la cronologia dei messaggi per capire di quale ricetta sta parlando.
Se non è chiaro, chiedi gentilmente di specificare.`;
      }
    }

    // Costruisci system prompt
    const systemPrompt = AZZURRA_SYSTEM_PROMPT + contextInfo;

    // Costruisci messaggi (ultimi 10 per contesto)
    const messages = [
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    console.log('📤 Invio a Claude con', messages.length, 'messaggi');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: messages
    });

    const reply = response.content[0].text;

    // TRACKING MIGLIORATO: traccia SOLO ricette esplicitamente richieste dall'utente
    // NON tracciare ricette suggerite casualmente per richieste generiche
    let recipeTitles = [];

    if (mentionedRecipe) {
      // Traccia SOLO se l'utente ha menzionato esplicitamente una ricetta
      // Le ricette suggerite random per richieste generiche NON vengono tracciate
      recipeTitles = [mentionedRecipe];
    }

    console.log('Ricetta cercata:', searchedRecipe);
    console.log('Ricette tracciate:', recipeTitles);

    res.status(200).json({
      reply,
      usage: response.usage,
      recipesFound: relevantRecipes.length,
      recipeTitles
    });

  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ error: 'Failed to get response from Claude' });
  }
}
