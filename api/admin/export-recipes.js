// api/admin/export-recipes.js
// Esporta tutte le ricette in formato CSV.
// Default: multi-row (una riga per ingrediente) se ci sono ingredienti strutturati.
// ?mode=single forza il formato single-row (una riga per ricetta, ingredienti come testo).

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth.js';

const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase =
  process.env.SUPABASE_URL && supabaseKey
    ? createClient(process.env.SUPABASE_URL, supabaseKey)
    : null;

const RECIPE_FIELDS = [
  'titolo',
  'ricettario',
  'anno',
  'famiglia',
  'portata',
  'procedimento',
  'scheda_antropologica',
  'scheda_nutrizionale',
  'calorie',
  'n_persone'
];

const SINGLE_ROW_HEADERS = [...RECIPE_FIELDS, 'ingredienti'];

const MULTI_ROW_HEADERS = [
  ...RECIPE_FIELDS,
  'preparazione',
  'ingrediente_principale',
  'ingrediente_specifico',
  'quantita',
  'um'
];

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[";\n\r]/.test(str) || str !== str.trim()) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toRow(values, headers) {
  return headers.map(h => csvEscape(values[h])).join(';');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase non configurato' });
  }

  const requestedMode = (req.query.mode || '').toLowerCase();

  try {
    // Prova select con tutte le colonne nuove; se la migration non è stata
    // ancora eseguita, riprova senza portata/ingredienti_json e fallback a single-row.
    const fullSelect = [...RECIPE_FIELDS, 'ingredienti', 'ingredienti_json'].join(',');
    let { data, error } = await supabase
      .from('ricette')
      .select(fullSelect)
      .order('titolo', { ascending: true });

    let schemaHasNewCols = !error;

    if (error) {
      // Fallback: schema legacy (nessuna portata, nessuna ingredienti_json)
      console.warn('Schema senza colonne nuove, uso fallback:', error.message);
      const legacySelect = ['titolo', 'ricettario', 'anno', 'famiglia',
        'procedimento', 'scheda_antropologica', 'scheda_nutrizionale',
        'calorie', 'n_persone', 'ingredienti'].join(',');
      const result = await supabase
        .from('ricette')
        .select(legacySelect)
        .order('titolo', { ascending: true });
      if (result.error) {
        console.error('export-recipes error:', result.error);
        return res.status(500).json({ error: result.error.message });
      }
      data = result.data;
    }

    const rows = data || [];

    // Decide modalità: multi-row se richiesto OR se ci sono ingredienti strutturati
    const hasStructuredAny = schemaHasNewCols && rows.some(r => Array.isArray(r.ingredienti_json) && r.ingredienti_json.length > 0);
    const useMultiRow = requestedMode === 'multi' || (requestedMode !== 'single' && hasStructuredAny);

    let csv;
    if (useMultiRow) {
      const lines = [MULTI_ROW_HEADERS.join(';')];
      for (const r of rows) {
        const recipeBase = {};
        for (const f of RECIPE_FIELDS) recipeBase[f] = r[f];

        const ings = Array.isArray(r.ingredienti_json) ? r.ingredienti_json : [];
        if (ings.length === 0) {
          // Ricetta legacy senza ingredienti strutturati: una riga con campi ingrediente vuoti
          // ma includendo `ingredienti` come ingrediente_principale per non perdere informazione
          lines.push(toRow({
            ...recipeBase,
            preparazione: '',
            ingrediente_principale: r.ingredienti || '',
            ingrediente_specifico: '',
            quantita: '',
            um: ''
          }, MULTI_ROW_HEADERS));
        } else {
          for (const ing of ings) {
            lines.push(toRow({
              ...recipeBase,
              preparazione: ing.sezione || '',
              ingrediente_principale: ing.principale || '',
              ingrediente_specifico: ing.specifico || '',
              quantita: ing.quantita || '',
              um: ing.um || ''
            }, MULTI_ROW_HEADERS));
          }
        }
      }
      csv = lines.join('\n');
    } else {
      const lines = [SINGLE_ROW_HEADERS.join(';')];
      for (const r of rows) {
        const out = {};
        for (const h of SINGLE_ROW_HEADERS) out[h] = r[h];
        lines.push(toRow(out, SINGLE_ROW_HEADERS));
      }
      csv = lines.join('\n');
    }

    const today = new Date().toISOString().slice(0, 10);
    const suffix = useMultiRow ? '-multi' : '';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ricette-${today}${suffix}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    console.error('export-recipes exception:', err);
    return res.status(500).json({ error: err.message });
  }
}
