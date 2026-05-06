// api/admin/save-analysis.js
// Persiste un report di analisi nel DB.

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth.js';

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  if (!supabase) {
    return res.status(500).json({
      error: 'SUPABASE_SERVICE_KEY non configurata su Vercel (necessaria per scrivere).'
    });
  }

  const { question, type = 'analysis', result } = req.body || {};
  if (!question || !result) {
    return res.status(400).json({ error: 'Campi "question" e "result" richiesti' });
  }

  try {
    const { data, error } = await supabase
      .from('analyses')
      .insert({ question, type, result })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('save-analysis error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, id: data.id, created_at: data.created_at });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}
