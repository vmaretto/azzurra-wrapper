// api/chat.js
// Endpoint per processare le domande dell'utente tramite Claude con RAG

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Supabase e OpenAI per RAG (opzionali)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const openai = openaiKey
  ? new OpenAI({ apiKey: openaiKey })
  : null;

// System prompt base per Azzurra
const AZZURRA_SYSTEM_PROMPT = `Sei Azzurra, un'ambasciatrice virtuale della cucina italiana tradizionale.

## LA TUA IDENTITÀ
- Nome: Azzurra
- Ruolo: Esperta e appassionata di cucina italiana tradizionale
- Personalità: Calorosa, accogliente, entusiasta, come una nonna italiana che ama condividere i segreti della cucina
- Lingua: Parli SOLO in italiano

## REGOLE FONDAMENTALI PER LE RISPOSTE
Le tue risposte verranno PARLATE da un avatar, quindi:
- Rispondi SEMPRE in massimo 2-3 frasi brevi
- Usa un linguaggio naturale e colloquiale
- Evita elenchi puntati, numeri, simboli
- Non usare formattazione (asterischi, trattini, etc.)
- Evita di ripetere il tuo nome in ogni risposta

## COMPORTAMENTO
- Se hai informazioni su una ricetta specifica nel contesto, usale per rispondere
- Se non conosci qualcosa, ammettilo con grazia
- Suggerisci sempre di usare ingredienti freschi e di stagione
- Racconta piccoli aneddoti e curiosità quando appropriato
- Incoraggia a sperimentare in cucina con passione

## ESEMPIO DI RISPOSTE CORRETTE
GIUSTO: "La carbonara è un piatto romano che scalda il cuore! Il segreto sta nel guanciale croccante e nella cremina di uova e pecorino, mai la panna!"
GIUSTO: "Ti consiglio di tostare bene il riso prima di aggiungere il brodo, così assorbe meglio i sapori!"`;

// Cerca ricette simili in Supabase
async function searchRecipes(query, limit = 3) {
  if (!supabase || !openai) {
    return [];
  }

  try {
    // Genera embedding della query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Cerca in Supabase
    const { data, error } = await supabase.rpc('search_ricette', {
      query_embedding: queryEmbedding,
      match_count: limit
    });

    if (error) {
      console.error('Errore ricerca Supabase:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Errore RAG:', err);
    return [];
  }
}

// Formatta le ricette trovate come contesto
function formatRecipesContext(recipes) {
  if (!recipes || recipes.length === 0) return '';

  const context = recipes.map(r => `
### ${r.titolo}
Ingredienti: ${r.ingredienti || 'Non disponibili'}
Preparazione: ${r.procedimento || 'Non disponibile'}
`).join('\n');

  return `\n\n## RICETTE TROVATE NEL DATABASE\nUsa queste informazioni per rispondere:\n${context}`;
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
    // Cerca ricette rilevanti (RAG)
    const relevantRecipes = await searchRecipes(message);
    const recipesContext = formatRecipesContext(relevantRecipes);

    // Costruisci system prompt con contesto ricette
    const systemPrompt = AZZURRA_SYSTEM_PROMPT + recipesContext;

    // Costruisci la cronologia messaggi per contesto
    const messages = [
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200, // Leggermente aumentato per includere dettagli ricette
      system: systemPrompt,
      messages: messages
    });

    const reply = response.content[0].text;

    res.status(200).json({
      reply,
      usage: response.usage,
      recipesFound: relevantRecipes.length
    });

  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ error: 'Failed to get response from Claude' });
  }
}
