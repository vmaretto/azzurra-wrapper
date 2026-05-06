// api/admin/export-recipes.js
// Esporta tutte le ricette in formato CSV (stesso schema accettato da upload-recipes).

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth.js';

// Lettura: SERVICE_KEY se disponibile, altrimenti ANON_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase =
  process.env.SUPABASE_URL && supabaseKey
    ? createClient(process.env.SUPABASE_URL, supabaseKey)
    : null;

const COLUMNS = [
  'titolo',
  'ricettario',
  'anno',
  'famiglia',
  'ingredienti',
  'procedimento',
  'scheda_antropologica',
  'scheda_nutrizionale',
  'calorie',
  'n_persone'
];

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Quote se contiene delimiter, newline, quote o spazi iniziali/finali
  if (/[";\n\r]/.test(str) || str !== str.trim()) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase non configurato' });
  }

  try {
    const { data, error } = await supabase
      .from('ricette')
      .select(COLUMNS.join(','))
      .order('titolo', { ascending: true });

    if (error) {
      console.error('export-recipes error:', error);
      return res.status(500).json({ error: error.message });
    }

    const rows = data || [];
    const lines = [COLUMNS.join(';')];
    for (const row of rows) {
      lines.push(COLUMNS.map(c => csvEscape(row[c])).join(';'));
    }
    const csv = lines.join('\n');

    const today = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ricette-${today}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    console.error('export-recipes exception:', err);
    return res.status(500).json({ error: err.message });
  }
}
