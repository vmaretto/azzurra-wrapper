// api/admin/delete-recipe.js
// Cancella una singola ricetta dall'archivio.

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../_admin-auth.js';

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  if (!supabase) {
    return res.status(500).json({
      error: 'SUPABASE_SERVICE_KEY non configurata su Vercel. Necessaria per eliminare dal DB (bypassa Row Level Security).'
    });
  }

  const id = (req.body && req.body.id) || req.query.id;
  if (!id) {
    return res.status(400).json({ error: 'id richiesto' });
  }

  try {
    const { error } = await supabase.from('ricette').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (typeof globalThis.__ricetteWhitelistCache === 'object') {
      globalThis.__ricetteWhitelistCache = null;
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
