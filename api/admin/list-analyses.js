// api/admin/list-analyses.js
// Elenca le analisi salvate (paginato). Per default ritorna metadati,
// ?withResult=1 include anche il body completo del report.

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

  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const withResult = req.query.withResult === '1';

  try {
    const cols = withResult
      ? 'id, question, type, result, created_at'
      : 'id, question, type, created_at';

    const { data, error, count } = await supabase
      .from('analyses')
      .select(cols, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      // Se la tabella non esiste, dai un messaggio piu' chiaro
      if (error.message && error.message.toLowerCase().includes('does not exist')) {
        return res.status(500).json({
          error: 'Tabella analyses non trovata. Esegui scripts/migrate-analyses.sql su Supabase.'
        });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      analyses: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
