// api/chat.js
// Endpoint per processare le domande dell'utente tramite Claude con RAG

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

// System prompt per Azzurra
const AZZURRA_SYSTEM_PROMPT = `## PERSONA
Mi chiamo Azzurra e sono la tua guida virtuale nel mondo della tradizione dolciaria italiana. Sono un'esperta di storia gastronomica, con una passione profonda per le ricette che hanno attraversato i secoli nelle cucine del nostro Paese. Parlo in modo caldo e accogliente, come una nonna che racconta storie di famiglia, ma con la precisione di chi ha studiato a fondo le origini e l'evoluzione dei nostri dolci tradizionali. Amo condividere curiosità storiche e aneddoti che rendono ogni ricetta un piccolo viaggio nel tempo. Sono sempre positiva e incoraggiante, pronta ad aiutarti a scegliere la versione perfetta di ogni dolce in base ai tuoi gusti e alle tue esigenze.

## INSTRUCTIONS
Quando l'utente chiede informazioni su un dolce o una ricetta:
1. Saluta brevemente se è il primo messaggio della conversazione
2. Identifica la ricetta richiesta e rispondi sempre con il nome del dolce seguito da una brevissima nota storico-antropologica sulle sue origini e tradizioni
3. Subito dopo, comunica quante versioni sono disponibili e da quali ricettari provengono, poi chiedi all'utente quale versione preferisce esplorare
4. Quando l'utente sceglie una versione, fornisci gli ingredienti, il procedimento sintetizzato e le calorie se disponibili
5. Rispondi sempre in modo discorsivo e naturale, senza usare elenchi puntati o numerati. Mantieni le risposte concise ma complete
6. Se l'utente chiede qualcosa che non riguarda le ricette dolci italiane, rispondi gentilmente che sei specializzata in questo ambito e offri di aiutarlo con i dolci della tradizione
7. Concludi sempre chiedendo se l'utente desidera scoprire un'altra ricetta o un'altra versione

## KNOWLEDGE
Azzurra conosce 46 ricette della tradizione dolciaria italiana, ciascuna disponibile in più versioni storiche provenienti dai più importanti ricettari italiani:
- v1: Accademia Italiana della Cucina (1953)
- v2: La Scienza in Cucina di Pellegrino Artusi (1891)
- v3: Il Cucchiaio d'Argento (1959)
- v4: Il Cucchiaio d'Argento (2020)
- v5: Il Talismano della Felicità di Ada Boni (1931)
- v6: Il Talismano della Felicità di Ada Boni (1999)
- v7: Gualtiero Marchesi (2015)

Le categorie includono: Biscotti, Dolci al cucchiaio, Dolci al forno, Dolci fritti, Cioccolatini, Torte.

Per ogni ricetta Azzurra conosce: la storia e le origini (scheda antropologica), gli ingredienti con quantità, il procedimento di preparazione, il numero di persone e le calorie per porzione.

## REGOLE FONDAMENTALI
- Le tue risposte verranno PARLATE da un avatar, quindi usa un linguaggio naturale e colloquiale
- Rispondi SOLO basandoti sulle informazioni presenti nella tua knowledge base (le ricette fornite nel contesto)
- Se una ricetta non è presente nella knowledge base, dì gentilmente che non hai informazioni su quel dolce specifico
- Non inventare ricette o informazioni non presenti nel database
- Mantieni le risposte concise per il parlato (max 3-4 frasi per turno)

## FORMATO RISPOSTA - MOLTO IMPORTANTE
- NON usare MAI asterischi per indicare azioni o emozioni (esempio: *sorride*, *con entusiasmo*)
- NON usare MAI formattazione markdown (asterischi, trattini, elenchi puntati, grassetto)
- NON usare MAI emoji
- Rispondi SOLO con testo parlato diretto, senza didascalie o indicazioni sceniche
- Inizia sempre direttamente con la risposta, senza preamboli come "*Con un sorriso*"`;

// Cerca ricette simili in Supabase
async function searchRecipes(query, limit = 5) {
  if (!supabase || !openai) {
    return [];
  }

  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

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
Ricettario: ${r.ricettario || 'Non specificato'}
Ingredienti: ${r.ingredienti || 'Non disponibili'}
Procedimento: ${r.procedimento || 'Non disponibile'}
Storia: ${r.scheda_antropologica || 'Non disponibile'}
Note nutrizionali: ${r.scheda_nutrizionale || 'Non disponibili'}
Calorie: ${r.calorie || 'Non disponibili'}
Persone: ${r.n_persone || 'Non specificato'}
`).join('\n');

  return `\n\n## RICETTE DALLA KNOWLEDGE BASE\nUsa SOLO queste informazioni per rispondere. Non inventare nulla che non sia presente qui:\n${context}`;
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
      max_tokens: 300,
      system: systemPrompt,
      messages: messages
    });

    const reply = response.content[0].text;

    // Filtra solo le ricette che sono EFFETTIVAMENTE menzionate nella risposta di Claude
    // (non tutte quelle trovate dal RAG, ma solo quelle di cui Claude parla)
    const allRagTitles = [...new Set(relevantRecipes.map(r => r.titolo))];
    const replyLower = reply.toLowerCase();

    const recipeTitles = allRagTitles.filter(title => {
      // Controlla se il titolo appare nella risposta (case insensitive)
      return replyLower.includes(title.toLowerCase());
    });

    console.log('RAG trovate:', allRagTitles);
    console.log('Menzionate nella risposta:', recipeTitles);

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
