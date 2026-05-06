// api/admin/upload-recipes.js
// Endpoint admin: importa ricette da CSV con generazione embeddings + upsert in Supabase.
//
// CSV atteso (delimiter ; o ,) con header. Colonne supportate:
//   titolo (obbligatorio), ricettario, anno, famiglia,
//   ingredienti, procedimento, scheda_antropologica, scheda_nutrizionale,
//   calorie, n_persone
//
// Identità riga = (titolo, ricettario, anno). Match -> update, altrimenti insert.

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { parse } from 'csv-parse/sync';
import { requireAdmin } from '../_admin-auth.js';

export const config = {
  api: {
    bodyParser: { sizeLimit: '15mb' }
  },
  maxDuration: 60
};

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function cleanHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&egrave;/g, 'è')
    .replace(/&eacute;/g, 'é')
    .replace(/&agrave;/g, 'à')
    .replace(/&ograve;/g, 'ò')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&igrave;/g, 'ì')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectDelimiter(content) {
  const firstLine = content.split('\n')[0] || '';
  const semis = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semis >= commas ? ';' : ',';
}

function normalizeKey(k) {
  return String(k || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^_+|_+$/g, '');
}

const COLUMN_ALIASES = {
  titolo: ['titolo', 'nome', 'title', 'recipe'],
  ricettario: ['ricettario', 'fonte', 'source', 'cookbook'],
  anno: ['anno', 'year'],
  famiglia: ['famiglia', 'family', 'category', 'categoria'],
  ingredienti: ['ingredienti', 'ingredients'],
  procedimento: ['procedimento', 'preparazione', 'preparation', 'method'],
  scheda_antropologica: ['scheda_antropologica', 'storia', 'history', 'antropologia'],
  scheda_nutrizionale: ['scheda_nutrizionale', 'nutrizione', 'nutrition'],
  calorie: ['calorie', 'kcal', 'calories'],
  n_persone: ['n_persone', 'persone', 'porzioni', 'servings', 'serves']
};

function buildColumnMap(headers) {
  const map = {};
  const norm = headers.map(h => normalizeKey(h));
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const idx = norm.findIndex(h => aliases.includes(h));
    if (idx >= 0) map[field] = headers[idx];
  }
  return map;
}

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.substring(0, 8000)
  });
  return response.data[0].embedding;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  if (!supabase) {
    return res.status(500).json({
      error: 'SUPABASE_SERVICE_KEY non configurata su Vercel. La service key e\' necessaria per scrivere nel DB (bypassa Row Level Security). Aggiungerla in Vercel > Settings > Environment Variables.'
    });
  }
  if (!openai) {
    return res.status(500).json({ error: 'OpenAI non configurato (OPENAI_API_KEY mancante)' });
  }

  const { csv } = req.body || {};
  if (!csv || typeof csv !== 'string') {
    return res.status(400).json({ error: 'Campo "csv" mancante nel body' });
  }

  let rows;
  try {
    const delimiter = detectDelimiter(csv);
    rows = parse(csv, {
      columns: true,
      delimiter,
      skip_empty_lines: true,
      relax_column_count: true,
      bom: true,
      trim: true
    });
  } catch (err) {
    return res.status(400).json({ error: 'CSV non valido: ' + err.message });
  }

  if (rows.length === 0) {
    return res.status(400).json({ error: 'CSV vuoto' });
  }

  const headers = Object.keys(rows[0]);
  const colMap = buildColumnMap(headers);

  if (!colMap.titolo) {
    return res.status(400).json({
      error: 'Colonna "titolo" non trovata nel CSV',
      headersFound: headers
    });
  }

  const results = {
    total: rows.length,
    inserted: 0,
    updated: 0,
    errors: 0,
    errorDetails: []
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const titolo = String(row[colMap.titolo] || '').trim();

    if (!titolo) {
      results.errors++;
      results.errorDetails.push({ row: i + 2, error: 'Titolo mancante' });
      continue;
    }

    try {
      const ricettario = colMap.ricettario ? String(row[colMap.ricettario] || '').trim() : '';
      const anno = colMap.anno ? parseInt(row[colMap.anno]) || null : null;
      const famiglia = colMap.famiglia ? String(row[colMap.famiglia] || '').trim() : '';
      const ingredienti = colMap.ingredienti ? cleanHtml(row[colMap.ingredienti]) : '';
      const procedimento = colMap.procedimento ? cleanHtml(row[colMap.procedimento]) : '';
      const schedaAntropologica = colMap.scheda_antropologica ? cleanHtml(row[colMap.scheda_antropologica]) : '';
      const schedaNutrizionale = colMap.scheda_nutrizionale ? cleanHtml(row[colMap.scheda_nutrizionale]) : '';
      const calorie = colMap.calorie ? parseInt(row[colMap.calorie]) || null : null;
      const nPersone = colMap.n_persone ? parseInt(row[colMap.n_persone]) || null : null;

      const testoCompleto = `
Ricetta: ${titolo}
Famiglia: ${famiglia}
Ingredienti: ${ingredienti}
Preparazione: ${procedimento}
Storia: ${schedaAntropologica}
Note nutrizionali: ${schedaNutrizionale}
      `.trim();

      const embedding = await generateEmbedding(testoCompleto);

      const record = {
        titolo,
        famiglia,
        ricettario,
        anno,
        procedimento,
        ingredienti,
        scheda_antropologica: schedaAntropologica,
        scheda_nutrizionale: schedaNutrizionale,
        calorie,
        n_persone: nPersone,
        embedding
      };

      // Match per identità (titolo + ricettario + anno) - aggiorna se esiste
      let query = supabase.from('ricette').select('id').eq('titolo', titolo);
      if (ricettario) query = query.eq('ricettario', ricettario);
      else query = query.is('ricettario', null);
      if (anno !== null) query = query.eq('anno', anno);
      else query = query.is('anno', null);

      const { data: existing, error: selectError } = await query.maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (existing && existing.id) {
        const { error: updateError } = await supabase
          .from('ricette')
          .update(record)
          .eq('id', existing.id);
        if (updateError) throw updateError;
        results.updated++;
      } else {
        const { error: insertError } = await supabase.from('ricette').insert(record);
        if (insertError) throw insertError;
        results.inserted++;
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 80));
    } catch (err) {
      results.errors++;
      results.errorDetails.push({
        row: i + 2,
        titolo,
        error: err.message || String(err)
      });
    }
  }

  // Invalida cache whitelist
  if (typeof globalThis.__ricetteWhitelistCache === 'object') {
    globalThis.__ricetteWhitelistCache = null;
  }

  return res.status(200).json({ success: true, ...results });
}
