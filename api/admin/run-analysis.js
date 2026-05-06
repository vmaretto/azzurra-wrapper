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
  "limitazioni": "Note sui limiti dei dati (opzionale, stringa)",
  "chartType": "bar" | "line" | "area" | "pie",
  "chartData": [ ...vedi sotto ],
  "chartConfig": { ...vedi sotto }
}

## REGOLE CRITICHE PER chartData (la violazione spacca la UI)
- Ogni elemento di chartData DEVE essere un oggetto piatto con SOLO valori PRIMITIVI (string o number).
- VIETATO mettere oggetti annidati come valori. Es. NO: { "label": "1891", "Burro": { "tipo": "storico", "valore": 45 } }
- I valori delle serie devono essere NUMERI, non oggetti. Es. SI: { "label": "1891", "Burro": 45, "Olio": 12 }
- Le label/x devono essere stringhe corte e descrittive (es. "Artusi 1891", non un oggetto).
- chartData deve avere tra 3 e 30 elementi.
- Se vuoi distinguere "storico" vs "proiezione" usa una serie separata, non un oggetto annidato.
  ESEMPIO: { "label": "2030", "Storico": null, "Proiezione": 65 }

## chartConfig per bar/line/area
{
  "xKey": "label",
  "series": [
    { "key": "Burro", "name": "Burro (% ricette)", "color": "#016fab" },
    { "key": "Olio", "name": "Olio d'oliva (% ricette)", "color": "#f4a261" }
  ]
}

## chartConfig per pie (singola serie)
chartData: [ { "label": "Artusi", "value": 36 }, { "label": "Accademia", "value": 24 } ]
chartConfig: { "labelKey": "label", "valueKey": "value" }

## Palette colori (usa questi)
#016fab #014d7a #00b4d8 #90e0ef #caf0f8 #f4a261 #e76f51 #2a9d8f #e9c46a

## ALTRE REGOLE
- I numeri devono derivare dai dati reali, mai inventati. Se servono percentuali, calcolale.
- summary e insights in italiano, professionali ma divulgativi.
- Se i dati sono insufficienti, riempi comunque chartData con i numeri disponibili e spiega in "limitazioni".`;

const ANALYSIS_SYSTEM_PROMPT = `Sei un'analista gastronomica esperta. Analizzi un dataset di ricette italiane storiche provenienti da diversi ricettari (Artusi, Accademia Italiana della Cucina, Cucchiaio d'Argento, Marchesi, Talismano della Felicità, ecc.). Estrai tendenze, pattern e statistiche dai dati FORNITI nel messaggio dell'utente.

${SHARED_OUTPUT_SCHEMA}`;

const FORESIGHT_SYSTEM_PROMPT = `Sei un futurologa della cucina italiana. Analizzi i dati storici dei ricettari forniti e formuli scenari sul futuro della gastronomia italiana, ancorando le proiezioni nei trend osservati. Considera fattori come sostenibilità, salute, tradizione vs innovazione.

Distingui sempre nei tuoi insight cosa è "osservato nei dati" e cosa è "proiezione". chartData può includere sia valori storici reali che valori proiettati su anni futuri.

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
  // Versione compatta per ridurre i token, mantenendo i campi piu' utili
  return {
    titolo: r.titolo,
    ricettario: r.ricettario,
    anno: r.anno,
    famiglia: r.famiglia,
    portata: r.portata || null,
    ingredienti: (r.ingredienti || '').slice(0, 600),
    note_nutrizionali: (r.scheda_nutrizionale || '').slice(0, 300),
    calorie: r.calorie,
    n_persone: r.n_persone
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

// Sanitizza il payload AI: forza valori primitivi in chartData
// (Claude a volte mette oggetti annidati che spaccano il render React).
function sanitizeAnalysisResult(parsed) {
  if (!parsed || typeof parsed !== 'object') return parsed;

  const result = { ...parsed };
  if (Array.isArray(result.chartData)) {
    result.chartData = result.chartData
      .map(d => {
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
            // valore-oggetto non ammesso: prova a estrarre un numero
            const numericVal = v.value ?? v.valore ?? v.count ?? v.n ?? v.numero ?? null;
            if (typeof numericVal === 'number') {
              cleaned[k] = numericVal;
            } else {
              cleaned[k] = null; // skip
            }
          } else {
            cleaned[k] = String(v);
          }
        }
        return cleaned;
      })
      .filter(Boolean);
  }

  // Normalizza insights ad array di stringhe
  if (Array.isArray(result.insights)) {
    result.insights = result.insights
      .map(i => (typeof i === 'string' ? i : (i?.text || i?.testo || JSON.stringify(i))))
      .filter(Boolean);
  }

  // Forza title/summary/limitazioni a stringhe
  for (const k of ['title', 'summary', 'limitazioni']) {
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

    const userMessage = `## Domanda
${question.trim()}

## Dataset (${recipes.length} ricette)
${datasetJson}

Restituisci SOLO il JSON conforme allo schema indicato.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
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
