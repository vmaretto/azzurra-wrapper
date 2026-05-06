// api/admin/list-recipes.js
// Lista ricette per il pannello admin (paginato).

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth.js';

// Lettura: SERVICE_KEY se disponibile, altrimenti ANON_KEY (la tabella ha policy SELECT pubblica)
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

  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const offset = parseInt(req.query.offset) || 0;
  const search = (req.query.search || '').trim();

  try {
    let query = supabase
      .from('ricette')
      .select('id, titolo, ricettario, anno, famiglia, calorie, n_persone', { count: 'exact' })
      .order('titolo', { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('titolo', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('list-recipes error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      recipes: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (err) {
    console.error('list-recipes exception:', err);
    return res.status(500).json({ error: err.message });
  }
}
