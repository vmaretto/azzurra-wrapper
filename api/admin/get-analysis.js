// api/admin/get-analysis.js
// Ritorna una singola analisi per id.

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth.js';

const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase =
  process.env.SUPABASE_URL && supabaseKey
    ? createClient(process.env.SUPABASE_URL, supabaseKey)
    : null;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase non configurato' });
  }

  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id richiesto' });

  try {
    const { data, error } = await supabase
      .from('analyses')
      .select('id, question, type, result, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Analisi non trovata' });

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
