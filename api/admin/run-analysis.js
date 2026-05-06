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

const ANALYSIS_SYSTEM_PROMPT = `Sei un'analista esperta di gastronomia italiana e tradizione culinaria.
Analizzi un dataset di ricette tradizionali italiane provenienti da diversi ricettari storici (Artusi, Accademia Italiana della Cucina, Cucchiaio d'Argento, Marchesi, Talismano della Felicità, ecc.).

Quando ricevi una domanda dell'utente, devi:
1. Analizzare i dati delle ricette forniti
2. Estrarre tendenze, pattern, statistiche pertinenti
3. Restituire un report strutturato in JSON con grafico

REGOLE CRITICHE:
- Rispondi SEMPRE e SOLO con un oggetto JSON valido (no testo prima o dopo)
- I numeri devono essere derivati dai dati reali, NON inventati
- Se i dati non bastano, indica esplicitamente le limitazioni nel campo "limitazioni"
- Linguaggio professionale ma divulgativo, in italiano

SCHEMA OUTPUT:
{
  "title": "Titolo dell'analisi (max 100 caratteri)",
  "summary": "Sintesi di 2-3 frasi del risultato",
  "insights": ["Insight 1", "Insight 2", ...],  // 3-5 punti chiave
  "limitazioni": "Eventuali limiti dei dati (opzionale)",
  "chartType": "bar" | "line" | "area" | "pie",
  "chartData": [
    { "label": "etichetta x", "Serie1": 12, "Serie2": 34 },
    ...
  ],
  "chartConfig": {
    "xKey": "label",
    "series": [
      { "key": "Serie1", "name": "Nome leggibile 1", "color": "#016fab" },
      { "key": "Serie2", "name": "Nome leggibile 2", "color": "#90e0ef" }
    ]
  }
}

I colori disponibili (palette del progetto): #016fab (primary), #014d7a (dark), #00b4d8 (accent), #90e0ef (light), #caf0f8 (extraLight), #f4a261 (arancio), #e76f51 (rosso).

Per i grafici a torta usa una sola serie:
"chartData": [{ "label": "Categoria A", "value": 12 }, ...]
"chartConfig": { "valueKey": "value", "labelKey": "label" }
`;

const FORESIGHT_SYSTEM_PROMPT = `Sei un futurologa della cucina italiana. Analizzi dati storici sui ricettari tradizionali e formuli previsioni e scenari sul futuro della gastronomia italiana.

Quando ricevi una domanda foresight, devi:
1. Identificare nei dati le tendenze evolutive (1891 → 2026)
2. Estrapolare in modo ragionato verso il futuro (3-10 anni)
3. Considerare fattori esterni (sostenibilita', salute, tradizione vs innovazione)
4. Restituire scenari plausibili in formato strutturato

REGOLE CRITICHE:
- Rispondi SEMPRE e SOLO con un oggetto JSON valido
- Le previsioni devono essere ancorate nei dati storici osservati
- Indica chiaramente cosa e' osservato nei dati e cosa e' proiezione
- Linguaggio chiaro e ispirazionale ma rigoroso

SCHEMA OUTPUT identico a run-analysis: { title, summary, insights, limitazioni, chartType, chartData, chartConfig }
- Le insights includono sia trend osservati che proiezioni
- chartData puo' includere serie storica reale + proiezione futura (es. campo "tipo": "storico" / "proiezione")`;

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
  // Trova primo { e ultimo }
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first < 0 || last < 0 || last <= first) {
    throw new Error('Risposta AI senza JSON: ' + text.slice(0, 200));
  }
  return JSON.parse(candidate.slice(first, last + 1));
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

    return res.status(200).json({
      success: true,
      result: parsed,
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
