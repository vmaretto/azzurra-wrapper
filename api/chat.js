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

    // Match esatto o parole chiave significative (>4 caratteri)
    if (msgNorm.includes(recipeNorm) ||
        recipeNorm.split(' ').some(word => word.length > 4 && msgNorm.includes(word))) {
      return recipe;
    }
  }
  return null;
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
1. Quando chiedono di un dolce: una frase sulla storia/origini, poi chiedi quale versione preferiscono
2. NON elencare tutte le versioni, menziona solo che ne esistono diverse
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

    // 1. Controlla se menziona una ricetta specifica
    const mentionedRecipe = getMentionedRecipe(message);

    if (mentionedRecipe) {
      // CASO A: Ricetta specifica menzionata -> cerca SOLO quella
      console.log('📌 Ricetta specifica:', mentionedRecipe);
      searchedRecipe = mentionedRecipe;
      relevantRecipes = await searchRecipeByName(mentionedRecipe);
      contextInfo = formatRecipesContext(relevantRecipes, mentionedRecipe);

    } else if (isGenericRequest(message)) {
      // CASO B: Richiesta generica -> suggerisci UNA ricetta random
      const suggestion = getRandomRecipe();
      console.log('🎲 Suggerimento random:', suggestion);
      searchedRecipe = suggestion;
      relevantRecipes = await searchRecipeByName(suggestion);

      contextInfo = `\n\n## SUGGERIMENTO PER RICHIESTA GENERICA
L'utente ha chiesto un consiglio generico. Proponi "${suggestion}" in modo naturale e invitante.
Presenta brevemente il dolce e le sue origini, poi chiedi se vuole saperne di più.
${formatRecipesContext(relevantRecipes, suggestion)}`;

    } else {
      // CASO C: Nessuna ricetta specifica e non generico -> lascia che Claude gestisca con la history
      console.log('💬 Domanda di contesto/follow-up');
      contextInfo = `\n\n## DOMANDA DI CONTESTO
L'utente sta facendo una domanda che si riferisce alla conversazione precedente.
Usa la cronologia dei messaggi per capire di quale ricetta sta parlando.
Se non è chiaro, chiedi gentilmente di specificare.`;
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
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      system: systemPrompt,
      messages: messages
    });

    const reply = response.content[0].text;

    // TRACKING MIGLIORATO: usa la ricetta cercata (searchedRecipe) come ricetta discussa
    // Invece di cercare titoli esatti nella risposta, tracciamo la ricetta principale
    // perché se l'utente chiede del tiramisù e Claude risponde, stanno discutendo del tiramisù
    let recipeTitles = [];

    if (searchedRecipe) {
      // Usa il nome base della ricetta (quello del catalogo), non i titoli RAG dettagliati
      recipeTitles = [searchedRecipe];
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
