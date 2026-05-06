// api/admin/export-recipes.js
// Esporta tutte le ricette in formato CSV conforme al TRACCIATO RECORD ECI:
//   Titolo;Ricettario;Anno;Famiglia;Portata;DifficoltaTempo;Procedimento;Preparazione;
//   NPersoneTxt;IngredientePrincipale;IngredienteSpecifico;Quantita;Um;
//   scheda_antropologica;scheda_nutrizionale;calorie
//
// Default: multi-row (una riga per ingrediente).
// ?mode=single forza il formato con un'unica riga per ricetta (campi ingrediente vuoti).

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth.js';

const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase =
  process.env.SUPABASE_URL && supabaseKey
    ? createClient(process.env.SUPABASE_URL, supabaseKey)
    : null;

// TRACCIATO RECORD ECI - ordine fisso
const TRACCIATO_HEADERS = [
  'Titolo',
  'Ricettario',
  'Anno',
  'Famiglia',
  'Portata',
  'DifficoltaTempo',
  'Procedimento',
  'Preparazione',
  'NPersoneTxt',
  'IngredientePrincipale',
  'IngredienteSpecifico',
  'Quantita',
  'Um',
  'scheda_antropologica',
  'scheda_nutrizionale',
  'calorie'
];

// Mapping header CSV -> proprieta' del record DB (per i campi recipe-level)
const RECIPE_HEADER_TO_DB = {
  Titolo: 'titolo',
  Ricettario: 'ricettario',
  Anno: 'anno',
  Famiglia: 'famiglia',
  Portata: 'portata',
  DifficoltaTempo: 'difficolta_tempo',
  Procedimento: 'procedimento',
  NPersoneTxt: 'n_persone',
  scheda_antropologica: 'scheda_antropologica',
  scheda_nutrizionale: 'scheda_nutrizionale',
  calorie: 'calorie'
};

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[";\n\r]/.test(str) || str !== str.trim()) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function buildRow(recipeRow, ingredient) {
  // recipeRow: oggetto record DB
  // ingredient: { sezione, principale, specifico, quantita, um } | null
  return TRACCIATO_HEADERS.map(h => {
    if (RECIPE_HEADER_TO_DB[h]) {
      return csvEscape(recipeRow[RECIPE_HEADER_TO_DB[h]]);
    }
    if (ingredient) {
      switch (h) {
        case 'Preparazione': return csvEscape(ingredient.sezione);
        case 'IngredientePrincipale': return csvEscape(ingredient.principale);
        case 'IngredienteSpecifico': return csvEscape(ingredient.specifico);
        case 'Quantita': return csvEscape(ingredient.quantita);
        case 'Um': return csvEscape(ingredient.um);
      }
    }
    // single-row mode senza ingredienti strutturati: campi ingrediente vuoti
    return '';
  }).join(';');
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
    // Prova select con tutte le colonne nuove; fallback su schema legacy.
    const fullSelect = ['titolo', 'ricettario', 'anno', 'famiglia', 'portata',
      'difficolta_tempo', 'procedimento', 'ingredienti', 'ingredienti_json',
      'scheda_antropologica', 'scheda_nutrizionale', 'calorie', 'n_persone'].join(',');
    let { data, error } = await supabase
      .from('ricette')
      .select(fullSelect)
      .order('titolo', { ascending: true });

    let schemaHasNewCols = !error;

    if (error) {
      // Fallback: prova senza difficolta_tempo
      const fallbackSelect = ['titolo', 'ricettario', 'anno', 'famiglia', 'portata',
        'procedimento', 'ingredienti', 'ingredienti_json',
        'scheda_antropologica', 'scheda_nutrizionale', 'calorie', 'n_persone'].join(',');
      let r = await supabase.from('ricette').select(fallbackSelect).order('titolo', { ascending: true });

      if (r.error) {
        // Fallback ulteriore: legacy senza portata e ingredienti_json
        const legacySelect = ['titolo', 'ricettario', 'anno', 'famiglia',
          'procedimento', 'ingredienti', 'scheda_antropologica',
          'scheda_nutrizionale', 'calorie', 'n_persone'].join(',');
        r = await supabase.from('ricette').select(legacySelect).order('titolo', { ascending: true });
        if (r.error) {
          console.error('export-recipes error:', r.error);
          return res.status(500).json({ error: r.error.message });
        }
      }
      data = r.data;
    }

    const rows = data || [];

    // Decide modalita
    const hasStructuredAny = rows.some(r => Array.isArray(r.ingredienti_json) && r.ingredienti_json.length > 0);
    const useMultiRow = requestedMode === 'multi' || (requestedMode !== 'single' && hasStructuredAny);

    const lines = [TRACCIATO_HEADERS.join(';')];

    if (useMultiRow) {
      for (const r of rows) {
        const ings = Array.isArray(r.ingredienti_json) ? r.ingredienti_json : [];
        if (ings.length === 0) {
          // Ricetta legacy senza ingredienti strutturati: una riga sola con campi ingrediente vuoti
          // ma proviamo a sfruttare 'ingredienti' come "principale" se esiste.
          if (r.ingredienti && r.ingredienti.trim()) {
            lines.push(buildRow(r, {
              sezione: 'Principale',
              principale: r.ingredienti,
              specifico: '',
              quantita: '',
              um: ''
            }));
          } else {
            lines.push(buildRow(r, null));
          }
        } else {
          for (const ing of ings) {
            lines.push(buildRow(r, ing));
          }
        }
      }
    } else {
      for (const r of rows) {
        // single-row: campi ingrediente vuoti (le ricette con ingredienti_json perdono dettaglio)
        lines.push(buildRow(r, null));
      }
    }

    const csv = lines.join('\n');

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
