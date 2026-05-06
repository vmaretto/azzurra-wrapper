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
    bodyParser: { sizeLimit: '30mb' }
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
  // recipe-level
  titolo: ['titolo', 'nome', 'title', 'recipe'],
  ricettario: ['ricettario', 'fonte', 'source', 'cookbook'],
  anno: ['anno', 'year'],
  famiglia: ['famiglia', 'family', 'category', 'categoria'],
  portata: ['portata', 'course'],
  ingredienti: ['ingredienti', 'ingredients'],
  procedimento: ['procedimento', 'preparation', 'method'],
  scheda_antropologica: ['scheda_antropologica', 'storia', 'history', 'antropologia'],
  scheda_nutrizionale: ['scheda_nutrizionale', 'nutrizione', 'nutrition'],
  calorie: ['calorie', 'kcal', 'calories'],
  n_persone: ['n_persone', 'npersone', 'npersonetxt', 'persone', 'porzioni', 'servings', 'serves'],
  // per-ingredient (multi-row format)
  ingrediente_principale: ['ingredienteprincipale', 'ingrediente_principale', 'ingrediente', 'ingredient'],
  ingrediente_specifico: ['ingredientespecifico', 'ingrediente_specifico', 'specifico', 'specific'],
  quantita: ['quantita', 'quantity', 'amount'],
  um: ['um', 'unit', 'unita_di_misura', 'unita'],
  preparazione_sezione: ['preparazione', 'sezione', 'section', 'tipo']
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

// Batch embeddings: il modello accetta array di input.
// 100 testi per richiesta = ~10x speedup vs chiamate sequenziali.
async function generateEmbeddingsBatch(texts, batchSize = 100) {
  const result = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map(t => (t || '').substring(0, 8000) || ' ');
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch
    });
    for (const item of response.data) {
      result.push(item.embedding);
    }
  }
  return result;
}

function normalizeIdentityKey(titolo, ricettario, anno) {
  return [
    String(titolo || '').toLowerCase().trim(),
    String(ricettario || '').toLowerCase().trim(),
    anno !== null && anno !== undefined && anno !== '' ? String(anno).trim() : ''
  ].join('||');
}

function buildIngredientObject(row, colMap) {
  const principale = colMap.ingrediente_principale
    ? String(row[colMap.ingrediente_principale] || '').trim()
    : '';
  if (!principale) return null;
  return {
    sezione: colMap.preparazione_sezione ? String(row[colMap.preparazione_sezione] || '').trim() : '',
    principale,
    specifico: colMap.ingrediente_specifico ? String(row[colMap.ingrediente_specifico] || '').trim() : '',
    quantita: colMap.quantita ? String(row[colMap.quantita] || '').trim() : '',
    um: colMap.um ? String(row[colMap.um] || '').trim() : ''
  };
}

function renderIngredientsText(ingredients) {
  if (!ingredients || ingredients.length === 0) return '';

  const sections = new Map();
  for (const ing of ingredients) {
    const sec = ing.sezione || 'Principale';
    if (!sections.has(sec)) sections.set(sec, []);

    let text = ing.principale;
    if (ing.specifico && ing.specifico.toLowerCase() !== ing.principale.toLowerCase()) {
      text += ` (${ing.specifico})`;
    }
    const qum = [ing.quantita, ing.um].filter(Boolean).join(' ');
    if (qum) text += ` ${qum}`;
    sections.get(sec).push(text);
  }

  if (sections.size === 1) {
    return [...sections.values()][0].join(', ');
  }
  return [...sections.entries()]
    .map(([sec, items]) => `[${sec}] ${items.join(', ')}`)
    .join('; ');
}

async function upsertRecipe(record) {
  // Match per identità (titolo + ricettario + anno)
  let query = supabase.from('ricette').select('id').eq('titolo', record.titolo);
  if (record.ricettario) query = query.eq('ricettario', record.ricettario);
  else query = query.is('ricettario', null);
  if (record.anno !== null) query = query.eq('anno', record.anno);
  else query = query.is('anno', null);

  const { data: existing, error: selectError } = await query.maybeSingle();

  if (selectError && selectError.code !== 'PGRST116') {
    throw selectError;
  }

  if (existing && existing.id) {
    const { error } = await supabase.from('ricette').update(record).eq('id', existing.id);
    if (error) throw error;
    return 'updated';
  } else {
    const { error } = await supabase.from('ricette').insert(record);
    if (error) throw error;
    return 'inserted';
  }
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

  const isMultiRow = !!colMap.ingrediente_principale;

  const results = {
    total: rows.length,
    mode: isMultiRow ? 'multi-row (una riga per ingrediente)' : 'single-row (una riga per ricetta)',
    recipes: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    errorDetails: []
  };

  // Costruisce i "gruppi ricetta": multi-row aggrega per (titolo, ricettario, anno),
  // single-row tratta ogni riga come una ricetta separata.
  const groups = new Map();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const titolo = String(row[colMap.titolo] || '').trim();

    if (!titolo) {
      results.errors++;
      results.errorDetails.push({ row: i + 2, error: 'Titolo mancante' });
      continue;
    }

    const ricettario = colMap.ricettario ? String(row[colMap.ricettario] || '').trim() : '';
    const anno = colMap.anno ? parseInt(row[colMap.anno]) || null : null;
    const key = isMultiRow
      ? normalizeIdentityKey(titolo, ricettario, anno)
      : `${normalizeIdentityKey(titolo, ricettario, anno)}#${i}`;

    if (!groups.has(key)) {
      groups.set(key, {
        firstRowIdx: i,
        titolo,
        ricettario,
        anno,
        famiglia: colMap.famiglia ? String(row[colMap.famiglia] || '').trim() : '',
        portata: colMap.portata ? String(row[colMap.portata] || '').trim() : '',
        procedimento: colMap.procedimento ? cleanHtml(row[colMap.procedimento]) : '',
        scheda_antropologica: colMap.scheda_antropologica ? cleanHtml(row[colMap.scheda_antropologica]) : '',
        scheda_nutrizionale: colMap.scheda_nutrizionale ? cleanHtml(row[colMap.scheda_nutrizionale]) : '',
        calorie: colMap.calorie ? parseInt(row[colMap.calorie]) || null : null,
        n_persone: colMap.n_persone ? parseInt(row[colMap.n_persone]) || null : null,
        ingredientiTextLegacy: colMap.ingredienti ? cleanHtml(row[colMap.ingredienti]) : '',
        ingredientiList: []
      });
    }

    if (isMultiRow) {
      const ing = buildIngredientObject(row, colMap);
      if (ing) groups.get(key).ingredientiList.push(ing);
    }
  }

  results.recipes = groups.size;

  // Fase 1: prepara tutti i record + testi per embedding
  const groupArray = [...groups.values()];
  const records = [];
  const embeddingTexts = [];

  for (const g of groupArray) {
    const ingredientiText = g.ingredientiList.length > 0
      ? renderIngredientsText(g.ingredientiList)
      : g.ingredientiTextLegacy;

    const testoCompleto = `
Ricetta: ${g.titolo}
Portata: ${g.portata}
Famiglia: ${g.famiglia}
Ingredienti: ${ingredientiText}
Procedimento: ${g.procedimento}
Storia: ${g.scheda_antropologica}
Note nutrizionali: ${g.scheda_nutrizionale}
      `.trim();

    embeddingTexts.push(testoCompleto);
    records.push({
      _g: g,
      _ingredientiText: ingredientiText,
      titolo: g.titolo,
      famiglia: g.famiglia,
      ricettario: g.ricettario,
      anno: g.anno,
      portata: g.portata,
      procedimento: g.procedimento,
      ingredienti: ingredientiText,
      ingredienti_json: g.ingredientiList.length > 0 ? g.ingredientiList : null,
      scheda_antropologica: g.scheda_antropologica,
      scheda_nutrizionale: g.scheda_nutrizionale,
      calorie: g.calorie,
      n_persone: g.n_persone
    });
  }

  // Fase 2: batch embeddings (100 alla volta)
  let embeddings;
  try {
    embeddings = await generateEmbeddingsBatch(embeddingTexts, 100);
  } catch (err) {
    return res.status(500).json({
      ...results,
      error: 'Errore generazione embeddings: ' + (err.message || String(err))
    });
  }

  // Fase 3: upsert in parallelo (5 concurrent per non saturare Supabase)
  const CONCURRENCY = 5;
  for (let i = 0; i < records.length; i += CONCURRENCY) {
    const chunk = records.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async (rec, j) => {
      const embedding = embeddings[i + j];
      const { _g, _ingredientiText, ...persistable } = rec;
      try {
        const op = await upsertRecipe({ ...persistable, embedding });
        if (op === 'updated') results.updated++;
        else results.inserted++;
      } catch (err) {
        results.errors++;
        if (results.errorDetails.length < 100) {
          results.errorDetails.push({
            row: _g.firstRowIdx + 2,
            titolo: _g.titolo,
            error: err.message || String(err)
          });
        }
      }
    }));
  }

  if (results.errors > results.errorDetails.length) {
    results.errorDetailsTruncated = true;
  }

  // Invalida cache whitelist
  if (typeof globalThis.__ricetteWhitelistCache === 'object') {
    globalThis.__ricetteWhitelistCache = null;
  }

  return res.status(200).json({ success: true, ...results });
}
