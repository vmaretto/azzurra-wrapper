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

// Lista completa delle 52 ricette nel database, organizzate per categoria
const RICETTE_PER_CATEGORIA = {
  biscotti: ['Amaretti', 'Cantuccini Toscani IGP', 'Ricciarelli di Siena IGP', 'Savoiardi', 'Brigidini', 'Cavallucci di Siena', 'Fave dei morti'],
  dolci_al_cucchiaio: ['Biancomangiare', 'Tiramisù', 'Zabaione', 'Zuppa inglese', 'Budino al cioccolato', 'Budino di semolino', 'Panna cotta'],
  dolci_al_forno: ['Castagnaccio', 'Certosino', 'Migliaccio', 'Pan dolce alle noci', 'Panforte di Siena IGP', 'Presnitz', 'Crostata di ricotta', 'Crostata con confettura di frutta', 'Pastiera napoletana', 'Strudel di mele', 'Torta sabbiosa', 'Torta Margherita'],
  dolci_fritti: ['Cicerchiata', 'Castagnole', 'Chiacchiere o frappe', 'Frittelle di riso', 'Frittelle di mele', 'Crema fritta', 'Babà', 'Cannoli', 'Sfogliatelle napoletane'],
  dolci_festivi: ['Panettone', 'Torrone', 'Croccante', 'Pinoccate'],
  dolci_regionali: ['Cassata siciliana', 'Maritozzi', 'Pesche ripiene alla piemontese'],
  dolci_frutta: ['Pere con il vino rosso'],
  gelati_granite: ['Gelato alla crema', 'Granita di caffè con panna'],
  cioccolatini: ['Cioccolatini alle mandorle'],
  salati: ['Bruschetta', 'Calzone alla napoletana', 'Panzerotti fritti', 'Piadina Romagnola IGP', 'Pizza napoletana STG', 'Torta di patate', 'Torta Pasqualina con spinaci']
};

// Lista piatta per compatibilità
const RICETTE_DATABASE = Object.values(RICETTE_PER_CATEGORIA).flat();

// Funzione per ottenere suggerimenti random escludendo ricette già discusse
function getRandomSuggestions(excludeRecipes = [], count = 3) {
  // Filtra solo i dolci (escludi salati per suggerimenti generici)
  const dolciOnly = RICETTE_DATABASE.filter(r => !RICETTE_PER_CATEGORIA.salati.includes(r));

  // Escludi ricette già discusse
  const available = dolciOnly.filter(r => !excludeRecipes.some(
    exc => r.toLowerCase().includes(exc.toLowerCase()) || exc.toLowerCase().includes(r.toLowerCase())
  ));

  // Se non ci sono abbastanza ricette disponibili, usa tutte
  const pool = available.length >= count ? available : dolciOnly;

  // Shuffle e prendi i primi 'count'
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Rileva se la richiesta è generica (non specifica un dolce)
function isGenericRequest(message) {
  const genericPatterns = [
    /consiglia/i, /suggeris/i, /propon/i, /cosa mi/i, /che dolce/i,
    /un dolce/i, /qualcosa di/i, /mi dai/i, /dimmi un/i, /raccontami/i,
    /parlami di un/i, /a tuo piacimento/i, /scegli tu/i, /decidi tu/i,
    /sorprendimi/i, /qualche idea/i, /non so cosa/i, /indeciso/i
  ];
  return genericPatterns.some(p => p.test(message));
}

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
6. Se l'utente chiede qualcosa che non è nel tuo database, rispondi gentilmente che non hai informazioni su quella ricetta specifica e offri di aiutarlo con altre ricette della tradizione
7. Concludi sempre chiedendo se l'utente desidera scoprire un'altra ricetta o un'altra versione

## KNOWLEDGE
Azzurra conosce 52 ricette della tradizione italiana, ciascuna disponibile in più versioni storiche provenienti dai più importanti ricettari italiani:
- v1: Accademia Italiana della Cucina (1953)
- v2: La Scienza in Cucina di Pellegrino Artusi (1891)
- v3: Il Cucchiaio d'Argento (1959)
- v4: Il Cucchiaio d'Argento (2020)
- v5: Il Talismano della Felicità di Ada Boni (1931)
- v6: Il Talismano della Felicità di Ada Boni (1999)
- v7: Gualtiero Marchesi (2015)

FOCUS PRINCIPALE: Dolci della tradizione (Biscotti, Dolci al cucchiaio, Dolci al forno, Dolci fritti, Cioccolatini, Torte, Gelati, Budini).

RICETTE SALATE/BAKERY (solo se richieste esplicitamente): Bruschetta, Calzone alla napoletana, Panzerotti fritti, Piadina Romagnola IGP, Pizza napoletana STG, Torta di patate, Torta Pasqualina con spinaci.

Per ogni ricetta Azzurra conosce: la storia e le origini (scheda antropologica), gli ingredienti con quantità, il procedimento di preparazione, il numero di persone e le calorie per porzione.

## CATALOGO COMPLETO (52 ricette)
Queste sono le UNICHE ricette di cui puoi parlare:
${RICETTE_DATABASE.join(', ')}.

## REGOLE FONDAMENTALI
- Le tue risposte verranno PARLATE da un avatar, quindi usa un linguaggio naturale e colloquiale
- Rispondi SOLO basandoti sulle informazioni presenti nella tua knowledge base (le ricette fornite nel contesto)
- Se una ricetta non è presente nel CATALOGO COMPLETO sopra, dì gentilmente che non hai informazioni su quella ricetta specifica
- NON INVENTARE MAI ricette o informazioni non presenti nel database
- Mantieni le risposte concise per il parlato (max 3-4 frasi per turno)
- Se l'utente chiede genericamente un consiglio, proponi SOLO dolci dal catalogo

## REGOLE SULLE CALORIE E DATI NUTRIZIONALI - IMPORTANTISSIMO
- PRIMA di dire che non hai le calorie, CONTROLLA IL RIEPILOGO CALORIE nel contesto!
- Le calorie potrebbero essere disponibili SOLO per alcune versioni - leggi "Versioni CON calorie" nel riepilogo
- Se l'utente chiede le calorie e la versione scelta NON le ha, ma ALTRE versioni le hanno, dì: "Per questa versione non ho le calorie, ma posso dirti che secondo [altra versione] sono X calorie"
- Riporta ESATTAMENTE il numero di calorie indicato nel contesto, senza modificarlo
- NON INVENTARE MAI numeri di calorie - usa SOLO il valore esatto dal campo "Calorie" o dal riepilogo
- Se NESSUNA versione ha le calorie, allora rispondi: "Per questa ricetta non ho dati calorici disponibili"
- NON fare stime, approssimazioni o calcoli calorici autonomi
- Quando dai le calorie, SPECIFICA SEMPRE da quale versione/ricettario provengono

## REGOLE SULLA COERENZA DELLE VERSIONI - FONDAMENTALE
- Quando presenti una versione di una ricetta, RICORDA sempre quale versione hai scelto (ricettario + anno)
- Se l'utente chiede chiarimenti sulla stessa ricetta (es. "quante calorie?", "puoi ripetere?"), mantieni la STESSA versione già scelta
- NON cambiare versione a meno che l'utente non chieda ESPLICITAMENTE un'altra versione
- Quando dici le calorie o altri dettagli, SPECIFICA SEMPRE l'anno del ricettario (es. "secondo il Cucchiaio d'Argento del 1959...")
- Se l'utente sembra dubbioso, NON interpretarlo come una richiesta di cambiare versione - probabilmente non ha sentito bene

## REGOLE PER VERSIONI MULTIPLE DELLO STESSO RICETTARIO
- Alcuni ricettari hanno PIÙ versioni di anni diversi (es. Cucchiaio d'Argento 1959 e 2020, Talismano 1931 e 1999)
- Quando trovi versioni multiple dello STESSO ricettario con anni diversi, CHIEDI all'utente quale preferisce PRIMA di dare dettagli
- Esempio: "Ho trovato la crema fritta sia nel Cucchiaio d'Argento del 1959 che in quello del 2020. Quale versione preferisci?"
- Una volta che l'utente sceglie, mantieni quella versione per TUTTA la conversazione su quella ricetta

## FORMATO RISPOSTA - MOLTO IMPORTANTE
- NON usare MAI asterischi per indicare azioni o emozioni (esempio: *sorride*, *con entusiasmo*)
- NON usare MAI formattazione markdown (asterischi, trattini, elenchi puntati, grassetto)
- NON usare MAI emoji
- Rispondi SOLO con testo parlato diretto, senza didascalie o indicazioni sceniche
- Inizia sempre direttamente con la risposta, senza preamboli come "*Con un sorriso*"`;

// Cerca ricette simili in Supabase (semantica + keyword fallback)
async function searchRecipes(query, limit = 10) {
  if (!supabase || !openai) {
    return [];
  }

  try {
    // 1. Ricerca semantica con embeddings
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    const { data: semanticData, error: semanticError } = await supabase.rpc('search_ricette', {
      query_embedding: queryEmbedding,
      match_count: limit
    });

    if (semanticError) {
      console.error('Errore ricerca semantica Supabase:', semanticError);
    }

    let results = semanticData || [];
    console.log('🔍 Ricerca semantica trovate:', results.length, 'ricette');

    // 2. Ricerca keyword SEMPRE (non solo come fallback)
    // Questo garantisce di trovare ricette per nome esatto anche se la semantica fallisce
    {
      console.log('🔍 Avvio ricerca keyword...');

      // Normalizza query per matching
      const queryLower = query.toLowerCase()
        .replace(/[àáâã]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõ]/g, 'o')
        .replace(/[ùúûü]/g, 'u');

      // Cerca match parziali nel catalogo
      const matchingRecipes = RICETTE_DATABASE.filter(recipe => {
        const recipeLower = recipe.toLowerCase()
          .replace(/[àáâã]/g, 'a')
          .replace(/[èéêë]/g, 'e')
          .replace(/[ìíîï]/g, 'i')
          .replace(/[òóôõ]/g, 'o')
          .replace(/[ùúûü]/g, 'u');

        // Match se la query contiene il nome ricetta o viceversa
        return queryLower.includes(recipeLower) || recipeLower.includes(queryLower) ||
               // Match parole chiave
               recipeLower.split(' ').some(word => word.length > 3 && queryLower.includes(word)) ||
               queryLower.split(' ').some(word => word.length > 3 && recipeLower.includes(word));
      });

      if (matchingRecipes.length > 0) {
        console.log('🔍 Keyword match trovati:', matchingRecipes);

        // Cerca queste ricette specifiche in Supabase per titolo
        for (const recipeName of matchingRecipes) {
          const { data: keywordData, error: keywordError } = await supabase
            .from('ricette')
            .select('*')
            .ilike('titolo', `%${recipeName}%`)
            .limit(5);

          if (!keywordError && keywordData) {
            // Aggiungi solo ricette non già presenti
            const existingTitles = results.map(r => r.titolo);
            const newRecipes = keywordData.filter(r => !existingTitles.includes(r.titolo));
            results = [...results, ...newRecipes];
            console.log('🔍 Aggiunte da keyword:', newRecipes.length, 'ricette');
          }
        }
      }
    }

    console.log('🔍 Totale ricette trovate:', results.length);
    return results;
  } catch (err) {
    console.error('Errore RAG:', err);
    return [];
  }
}

// Valida che le calorie nella risposta corrispondano al contesto RAG
function validateCalories(reply, recipes) {
  if (!recipes || recipes.length === 0) return { valid: true, reply };

  // Estrai numeri che sembrano calorie dalla risposta (pattern: numero + "calorie/caloria/kcal")
  const calorieMatches = reply.match(/(\d+(?:\.\d+)?)\s*(?:calorie|caloria|kcal)/gi);
  if (!calorieMatches) return { valid: true, reply }; // Nessuna caloria menzionata

  // Estrai i valori numerici
  const mentionedCalories = calorieMatches.map(match => {
    const num = match.match(/(\d+(?:\.\d+)?)/);
    return num ? parseFloat(num[1]) : null;
  }).filter(Boolean);

  // Raccogli tutte le calorie valide dal contesto RAG
  const validCalories = recipes
    .map(r => r.calorie)
    .filter(c => c && c !== 'Non disponibili')
    .map(c => {
      // Estrai numero dalle calorie (es. "220 kcal per porzione" -> 220)
      const match = c.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    })
    .filter(Boolean);

  console.log('🔢 Calorie menzionate nella risposta:', mentionedCalories);
  console.log('🔢 Calorie valide dal RAG:', validCalories);

  // Verifica che ogni caloria menzionata sia presente nel contesto
  for (const mentioned of mentionedCalories) {
    // Tolleranza del 5% per arrotondamenti
    const isValid = validCalories.some(valid =>
      Math.abs(mentioned - valid) <= valid * 0.05
    );

    if (!isValid) {
      console.warn(`⚠️ Caloria ${mentioned} non trovata nel contesto RAG!`);
      console.warn('Calorie valide disponibili:', validCalories);

      // Se c'è una sola ricetta con calorie, suggerisci quella corretta
      if (validCalories.length === 1) {
        return {
          valid: false,
          reply: reply.replace(
            new RegExp(`${mentioned}\\s*(?:calorie|caloria|kcal)`, 'gi'),
            `${validCalories[0]} calorie`
          ),
          corrected: true
        };
      }

      // Altrimenti, avvisa solo nel log ma lascia passare
      // (potrebbe essere un caso legittimo con più versioni)
    }
  }

  return { valid: true, reply };
}

// Formatta le ricette trovate come contesto
function formatRecipesContext(recipes) {
  if (!recipes || recipes.length === 0) {
    return `\n\n## NESSUNA RICETTA TROVATA\nNon ho trovato ricette pertinenti alla domanda. Rispondi dicendo che non hai informazioni su questo dolce specifico e chiedi se l'utente vuole scoprire un altro dolce della tradizione italiana.`;
  }

  // Lista esplicita dei titoli disponibili
  const availableTitles = [...new Set(recipes.map(r => r.titolo))];

  // Crea riepilogo calorie per versione
  const caloriePerVersione = recipes
    .filter(r => r.calorie && r.calorie !== 'Non disponibili')
    .map(r => `- ${r.ricettario}: ${r.calorie}`)
    .join('\n');

  const versioniConCalorie = recipes
    .filter(r => r.calorie && r.calorie !== 'Non disponibili')
    .map(r => r.ricettario);

  const versioniSenzaCalorie = recipes
    .filter(r => !r.calorie || r.calorie === 'Non disponibili')
    .map(r => r.ricettario);

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

  // Aggiungi riepilogo calorie se ci sono versioni miste
  let calorieRiepilogo = '';
  if (versioniConCalorie.length > 0 && versioniSenzaCalorie.length > 0) {
    calorieRiepilogo = `

## RIEPILOGO CALORIE DISPONIBILI
ATTENZIONE: Le calorie sono disponibili SOLO per alcune versioni!
Versioni CON calorie: ${versioniConCalorie.join(', ')}
Versioni SENZA calorie: ${versioniSenzaCalorie.join(', ')}

Dettaglio calorie per versione:
${caloriePerVersione}

Se l'utente chiede le calorie, SPECIFICA da quale versione proviene il dato!`;
  } else if (versioniConCalorie.length > 0) {
    calorieRiepilogo = `

## RIEPILOGO CALORIE DISPONIBILI
Tutte le versioni hanno calorie disponibili:
${caloriePerVersione}`;
  }

  return `\n\n## RICETTE DISPONIBILI PER QUESTA RICHIESTA
IMPORTANTE: Puoi parlare SOLO di queste ricette: ${availableTitles.join(', ')}.
Se l'utente chiede un dolce diverso da questi, rispondi che non hai informazioni su quel dolce.
NON INVENTARE MAI ricette che non sono in questa lista.
${calorieRiepilogo}

${context}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, conversationHistory = [], discussedRecipes = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Controlla se è una richiesta generica (suggerimento random)
    const isGeneric = isGenericRequest(message);
    let suggerimentiDinamici = '';

    if (isGeneric) {
      // Genera 3 suggerimenti random escludendo le ricette già discusse
      const suggestions = getRandomSuggestions(discussedRecipes, 3);
      console.log('🎲 Richiesta generica rilevata! Suggerimenti random:', suggestions);
      console.log('📋 Ricette già discusse (escluse):', discussedRecipes);

      suggerimentiDinamici = `

## SUGGERIMENTI DINAMICI PER QUESTA RICHIESTA
L'utente ha fatto una richiesta generica. Proponi QUESTI dolci specifici (selezionati casualmente):
1. ${suggestions[0]}
2. ${suggestions[1]}
3. ${suggestions[2]}

IMPORTANTE: Usa ESATTAMENTE questi tre suggerimenti nella tua risposta, non altri!
Presenta questi dolci in modo naturale e invitante, chiedendo quale interessa all'utente.`;
    }

    // Cerca ricette rilevanti (RAG)
    const relevantRecipes = await searchRecipes(message);
    const recipesContext = formatRecipesContext(relevantRecipes);

    // Costruisci system prompt con contesto ricette E suggerimenti dinamici
    const systemPrompt = AZZURRA_SYSTEM_PROMPT + recipesContext + suggerimentiDinamici;

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

    let reply = response.content[0].text;

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

    // VALIDAZIONE: Verifica che Claude parli solo di ricette nel database
    // Controlla se la risposta menziona una ricetta che NON è nel catalogo
    const replyLowerForValidation = reply.toLowerCase();

    // Verifica se Claude ha menzionato qualcosa che sembra una ricetta
    // ma che NON è stata trovata dal RAG
    const mentionsGenericRecipe = /ricetta|ingredienti|procedimento|preparazione|dose|porzioni/i.test(reply);
    const mentionsSpecificDish = /tiramis|torta|biscott|cantucc|panna cotta|profiterol|zabaione|crostata|panettone|pandoro|colomba|cannoli|cassata|sfogliatell|babà|zeppol|strufoli|panforte|ricciarell|cavallucc|brigidini|amaretti|savoiardi|meringh|bignè|frittell|castagnol|chiacchier|cenci|frappe|bugie|galani|ciambelle|bomboloni|mousse|budino|crema|gelato|granita|sorbetto|semifreddo|pizza|calzone|piadina|bruschetta|panzerott|focaccia|pane/i;

    if (relevantRecipes.length === 0 && mentionsSpecificDish.test(reply) && mentionsGenericRecipe) {
      // Claude potrebbe aver inventato - forza risposta sicura
      console.warn('⚠️ ATTENZIONE: Claude potrebbe aver inventato una ricetta!');
      reply = "Mi dispiace, non ho informazioni specifiche su questa ricetta nel mio archivio. Posso aiutarti con tanti dolci della tradizione italiana come il tiramisù, i cannoli, la pastiera napoletana o il panettone. Cosa ti piacerebbe scoprire?";
    }

    // VALIDAZIONE CALORIE: Verifica che i numeri di calorie siano nel contesto RAG
    const calorieValidation = validateCalories(reply, relevantRecipes);
    if (calorieValidation.corrected) {
      console.log('✅ Calorie corrette automaticamente');
      reply = calorieValidation.reply;
    }

    res.status(200).json({
      reply,
      usage: response.usage,
      recipesFound: relevantRecipes.length,
      recipeTitles,
      validated: true,
      calorieValidated: calorieValidation.valid
    });

  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ error: 'Failed to get response from Claude' });
  }
}
