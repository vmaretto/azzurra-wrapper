// api/admin/run-analysis.js
// Orchestratore analisi/foresight: prende una domanda dell'admin,
// raccoglie i dati delle ricette dal DB, chiede a Claude un'analisi
// strutturata (titolo, riassunto, insight, dati per grafico) e la
// restituisce al client.

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth.js';

export const config = {
  maxDuration: 60
};

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase =
  process.env.SUPABASE_URL && supabaseKey
    ? createClient(process.env.SUPABASE_URL, supabaseKey)
    : null;

const SHARED_OUTPUT_SCHEMA = `## SCHEMA OUTPUT (rispetta ESATTAMENTE)
Restituisci SOLO un oggetto JSON conforme a questa struttura — niente testo prima/dopo, niente markdown fence:

{
  "title": "Titolo breve (max 100 caratteri)",
  "summary": "Sintesi di 2-3 frasi",
  "insights": ["punto chiave 1", "punto chiave 2", "punto chiave 3"],
  "approfondimento": "Testo discorsivo di 4-8 paragrafi che approfondisce l'analisi: contesto storico/culturale, lettura dei numeri, comparazioni significative, eccezioni interessanti, implicazioni. Usa \\n\\n per separare i paragrafi.",
  "limitazioni": "Note sui limiti dei dati (opzionale, stringa)",
  "charts": [
    {
      "title": "Titolo del grafico (es. 'Distribuzione calorica per ricettario')",
      "description": "1 frase che spiega cosa mostra il grafico e come leggerlo",
      "type": "bar" | "line" | "area" | "pie",
      "data": [ ...vedi sotto ],
      "config": { ...vedi sotto }
    }
  ]
}

## QUANTI GRAFICI?
- Produci 2-4 grafici quando i dati permettono di guardare il fenomeno da angoli diversi.
  Esempio per "uso di grassi animali vs vegetali":
    1. Andamento temporale (line) - evoluzione % per ricettario/anno
    2. Distribuzione per portata (bar stacked o gruppato)
    3. Top ingredienti grassi nel corpus (bar singola serie)
- Produci almeno 1 grafico, sempre.
- Ogni grafico deve avere title e description chiari (description in 1 frase, non ridondante).

## REGOLE CRITICHE PER charts[].data (la violazione spacca la UI)
- Ogni elemento di data DEVE essere un oggetto piatto con SOLO valori PRIMITIVI (string o number).
- VIETATO mettere oggetti annidati come valori. Es. NO: { "label": "1891", "Burro": { "tipo": "storico", "valore": 45 } }
- I valori delle serie devono essere NUMERI, non oggetti. Es. SI: { "label": "1891", "Burro": 45, "Olio": 12 }
- Le label/x devono essere stringhe corte e descrittive (es. "Artusi 1891", non un oggetto).
- data deve avere tra 3 e 20 elementi (chiarezza > densita').
- Se vuoi distinguere "storico" vs "proiezione" usa una serie separata, non un oggetto annidato.

## charts[].config per bar/line/area
{
  "xKey": "label",
  "series": [
    { "key": "Burro", "name": "Burro (% ricette)", "color": "#016fab" },
    { "key": "Olio", "name": "Olio d'oliva (% ricette)", "color": "#f4a261" }
  ]
}

## charts[].config per pie (singola serie)
data: [ { "label": "Artusi", "value": 36 }, { "label": "Accademia", "value": 24 } ]
config: { "labelKey": "label", "valueKey": "value" }

## SCELTA TIPO GRAFICO
- bar: confronti tra categorie (ricettari, portate, famiglie)
- line: evoluzione temporale (anni)
- area: evoluzione temporale con enfasi su volumi cumulati
- pie: distribuzioni percentuali tra 3-7 categorie (mai oltre 8 fette)

## Palette colori (usa questi, nomi serie devono essere descrittivi)
#016fab #014d7a #00b4d8 #90e0ef #caf0f8 #f4a261 #e76f51 #2a9d8f #e9c46a

## ALTRE REGOLE
- I numeri devono derivare dai dati reali, mai inventati. Se servono percentuali, calcolale.
- summary: 2-3 frasi (overview rapida)
- approfondimento: 4-8 paragrafi DETTAGLIATI con contesto storico, lettura dei dati, eccezioni, comparazioni
- insights: 3-5 bullet sintetici
- Italiano professionale ma divulgativo.
- Se i dati sono insufficienti per una serie, includi comunque il grafico con valori parziali e spiega in "limitazioni".`;

const DATASET_DESCRIPTION = `## CARATTERISTICHE DEL DATASET (importante)
Il dataset contiene ricette italiane storiche da diversi ricettari (Artusi, Accademia Italiana della Cucina, Cucchiaio d'Argento, Marchesi, Talismano della Felicità, ecc.).
- Le ricette possono essere DOLCI (Biscotti, Dolci al cucchiaio, Dolci al forno, Dolci fritti, Cassate...) MA ANCHE salate: Primi (Pasta asciutta, Pasta ripiena, Pasta al forno, Gnocchi, Minestre, Risotti, Polenta, Cous cous), Secondi (Carne arrosto, Carne in umido, Pesce al forno, Pesce fritto, Frattaglie, Frittate), Antipasti, Contorni (Insalate, Legumi, Verdure), Condimenti.
- Il campo "portata" (quando presente) classifica la ricetta in: Dolci | Primi | Secondi | Antipasti | Contorni | Condimenti.
- Il campo "famiglia" e' piu' granulare (51 valori, es. "Pasta asciutta", "Carne arrosto", "Pesce al forno", "Biscotti"...).
- Il campo "ingredienti" contiene il testo aggregato; quando disponibile e' organizzato per sezione (es. [Principale] / [Crema] / [Ripieno]).

NON assumere mai che il corpus sia "solo dolci" o "tradizione dolciaria": guarda effettivamente il campo portata/famiglia di ogni ricetta nei dati forniti.
Se l'utente chiede un'analisi su una specifica portata (es. "i primi piatti"), filtra mentalmente solo le ricette con quella portata.
Se la domanda e' generica (es. "evoluzione della cucina italiana"), usa l'INTERO corpus.

## SCHEMA COMPATTO DEL DATASET (per ridurre token)
Ogni ricetta nel JSON che ricevi e' un oggetto con queste chiavi abbreviate:
- t = titolo
- ric = ricettario
- a = anno (numero)
- f = famiglia
- p = portata (Dolci/Primi/Secondi/Antipasti/Contorni/Condimenti)
- ing = ingredienti principali (lista di nomi separati da virgola, max 12, gia' deduplicati)
- cal = calorie (numero o null)

Il campo "ing" contiene SOLO i nomi degli ingredienti principali, senza quantita' ne' suddivisione in sezioni. Questo basta per analisi sulla presenza/assenza di ingredienti, conteggi e raggruppamenti. Per analisi su quantita' specifiche (es. "quanti grammi di burro nelle ricette") il dato non e' disponibile in questa vista compatta - segnalalo come limitazione.`;

const ANALYSIS_SYSTEM_PROMPT = `Sei un'analista gastronomica esperta del corpus della cucina italiana storica. Analizzi i dati FORNITI nel messaggio dell'utente per estrarre tendenze, pattern e statistiche.

${DATASET_DESCRIPTION}

${SHARED_OUTPUT_SCHEMA}`;

const FORESIGHT_SYSTEM_PROMPT = `Sei un futurologa della cucina italiana. Analizzi i dati storici dei ricettari forniti e formuli scenari sul futuro della gastronomia italiana (dolci E salati: paste, carni, pesce, contorni...), ancorando le proiezioni nei trend osservati. Considera fattori come sostenibilità, salute, tradizione vs innovazione.

Distingui sempre nei tuoi insight cosa è "osservato nei dati" e cosa è "proiezione". chartData può includere sia valori storici reali che valori proiettati su anni futuri.

${DATASET_DESCRIPTION}

${SHARED_OUTPUT_SCHEMA}`;

async function fetchRecipesContext() {
  if (!supabase) return [];

  // Prova a includere portata e ingredienti_json se presenti
  const fullSelect = 'titolo, ricettario, anno, famiglia, portata, ingredienti, ingredienti_json, scheda_antropologica, scheda_nutrizionale, calorie, n_persone';
  let { data, error } = await supabase
    .from('ricette')
    .select(fullSelect);

  if (error) {
    // Fallback senza colonne nuove
    const legacyResult = await supabase
      .from('ricette')
      .select('titolo, ricettario, anno, famiglia, ingredienti, scheda_antropologica, scheda_nutrizionale, calorie, n_persone');
    if (legacyResult.error) throw legacyResult.error;
    data = legacyResult.data;
  }

  return data || [];
}

function compactRecipe(r) {
  // Versione ULTRA compatta per stare sotto i 50K token/min di rate limit Anthropic.
  // - Estrai solo i nomi principali degli ingredienti (no quantita/specifico/sezione)
  // - Tronca aggressivamente i testi
  // - Drop scheda_antropologica/nutrizionale (testi enormi, raramente servono per analisi)
  let ingredientiCompact = '';
  if (Array.isArray(r.ingredienti_json) && r.ingredienti_json.length > 0) {
    const names = r.ingredienti_json
      .map(ing => (ing && ing.principale) ? String(ing.principale).trim() : '')
      .filter(Boolean);
    // Dedup e join
    const unique = [...new Set(names.map(n => n.toLowerCase()))].slice(0, 12);
    ingredientiCompact = unique.join(', ');
  } else if (r.ingredienti) {
    ingredientiCompact = String(r.ingredienti).slice(0, 120);
  }

  return {
    t: r.titolo,
    ric: r.ricettario,
    a: r.anno,
    f: r.famiglia,
    p: r.portata || null,
    ing: ingredientiCompact,
    cal: r.calorie
  };
}

function tryParseJson(text) {
  // Claude a volte avvolge in ```json ... ``` o aggiunge testo. Estrai il JSON.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first < 0 || last < 0 || last <= first) {
    throw new Error('Risposta AI senza JSON: ' + text.slice(0, 200));
  }
  return JSON.parse(candidate.slice(first, last + 1));
}

// Pulisce un array data (di un grafico) forzando valori primitivi.
function sanitizeChartData(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(d => {
    if (!d || typeof d !== 'object') return null;
    const cleaned = {};
    for (const [k, v] of Object.entries(d)) {
      if (v === null || v === undefined) {
        cleaned[k] = null;
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        cleaned[k] = v;
      } else if (typeof v === 'string') {
        cleaned[k] = v;
      } else if (typeof v === 'object') {
        const numericVal = v.value ?? v.valore ?? v.count ?? v.n ?? v.numero ?? null;
        cleaned[k] = typeof numericVal === 'number' ? numericVal : null;
      } else {
        cleaned[k] = String(v);
      }
    }
    return cleaned;
  }).filter(Boolean);
}

// Sanitizza il payload AI: gestisce sia il nuovo schema con charts[] sia
// quello legacy con chartType/chartData/chartConfig (per analisi salvate
// prima dell'aggiornamento).
function sanitizeAnalysisResult(parsed) {
  if (!parsed || typeof parsed !== 'object') return parsed;

  const result = { ...parsed };

  // Schema nuovo: charts[]
  if (Array.isArray(result.charts)) {
    result.charts = result.charts.map(ch => {
      if (!ch || typeof ch !== 'object') return null;
      return {
        title: typeof ch.title === 'string' ? ch.title : '',
        description: typeof ch.description === 'string' ? ch.description : '',
        type: ['bar', 'line', 'area', 'pie'].includes(ch.type) ? ch.type : 'bar',
        data: sanitizeChartData(ch.data),
        config: (ch.config && typeof ch.config === 'object') ? ch.config : {}
      };
    }).filter(c => c && c.data.length > 0);
  } else if (Array.isArray(result.chartData)) {
    // Schema legacy: wrappa in charts[]
    result.charts = [{
      title: result.title || 'Grafico',
      description: '',
      type: ['bar', 'line', 'area', 'pie'].includes(result.chartType) ? result.chartType : 'bar',
      data: sanitizeChartData(result.chartData),
      config: result.chartConfig || {}
    }];
    delete result.chartData;
    delete result.chartType;
    delete result.chartConfig;
  }

  // Normalizza insights ad array di stringhe
  if (Array.isArray(result.insights)) {
    result.insights = result.insights
      .map(i => (typeof i === 'string' ? i : (i?.text || i?.testo || JSON.stringify(i))))
      .filter(Boolean);
  }

  // Forza title/summary/approfondimento/limitazioni a stringhe
  for (const k of ['title', 'summary', 'approfondimento', 'limitazioni']) {
    if (result[k] != null && typeof result[k] !== 'string') {
      result[k] = typeof result[k] === 'object' ? JSON.stringify(result[k]) : String(result[k]);
    }
  }

  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  if (!anthropic) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY non configurata' });
  }
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase non configurato' });
  }

  const { question, type = 'analysis' } = req.body || {};
  if (!question || typeof question !== 'string' || question.trim().length < 5) {
    return res.status(400).json({ error: 'Specifica una domanda di almeno 5 caratteri' });
  }

  const isForesight = type === 'foresight';
  const systemPrompt = isForesight ? FORESIGHT_SYSTEM_PROMPT : ANALYSIS_SYSTEM_PROMPT;

  try {
    const recipes = await fetchRecipesContext();
    if (recipes.length === 0) {
      return res.status(400).json({
        error: 'Nessuna ricetta nel database. Carica prima le ricette dal tab Gestione.'
      });
    }

    const compactDataset = recipes.map(compactRecipe);
    const datasetJson = JSON.stringify(compactDataset);

    // Calcola un breve summary di composizione del corpus per orientare Claude
    const portataCount = {};
    const famigliaCount = {};
    const ricettarioCount = {};
    const anniArray = [];
    for (const r of recipes) {
      const p = r.portata || '(non specificata)';
      portataCount[p] = (portataCount[p] || 0) + 1;
      const f = r.famiglia || '(non specificata)';
      famigliaCount[f] = (famigliaCount[f] || 0) + 1;
      const ric = r.ricettario || '(non specificato)';
      ricettarioCount[ric] = (ricettarioCount[ric] || 0) + 1;
      if (r.anno && Number.isFinite(parseInt(r.anno))) anniArray.push(parseInt(r.anno));
    }
    const minAnno = anniArray.length ? Math.min(...anniArray) : null;
    const maxAnno = anniArray.length ? Math.max(...anniArray) : null;
    const sortedFamiglie = Object.entries(famigliaCount).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const sortedRicettari = Object.entries(ricettarioCount).sort((a, b) => b[1] - a[1]);

    const datasetSummary = `## Composizione effettiva del corpus
Totale righe: ${recipes.length}
Portate: ${Object.entries(portataCount).map(([k, v]) => `${k}=${v}`).join(', ')}
Top famiglie: ${sortedFamiglie.map(([k, v]) => `${k} (${v})`).join(', ')}
Ricettari: ${sortedRicettari.map(([k, v]) => `${k} (${v})`).join(', ')}
Range anni: ${minAnno !== null ? `${minAnno} - ${maxAnno}` : 'non disponibile'}

USA questi dati come ground truth: NON assumere "solo dolci" se le portate mostrano salati.
Se la domanda e' su una portata specifica e il corpus contiene <10 ricette di quella portata, segnala la limitazione esplicitamente.`;

    const userMessage = `## Domanda
${question.trim()}

${datasetSummary}

## Dataset completo (${recipes.length} ricette in JSON)
${datasetJson}

Restituisci SOLO il JSON conforme allo schema indicato.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000, // approfondimento + 2-4 grafici richiedono piu' output
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    const rawText = response.content[0]?.text || '';
    let parsed;
    try {
      parsed = tryParseJson(rawText);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message, 'raw:', rawText.slice(0, 500));
      return res.status(500).json({
        error: 'Risposta AI non parsabile: ' + parseErr.message,
        raw: rawText.slice(0, 1000)
      });
    }

    const sanitized = sanitizeAnalysisResult(parsed);

    return res.status(200).json({
      success: true,
      result: sanitized,
      meta: {
        recipesAnalyzed: recipes.length,
        type,
        usage: response.usage
      }
    });
  } catch (err) {
    console.error('run-analysis error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
