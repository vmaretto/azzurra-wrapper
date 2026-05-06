// api/admin-login.js
// Endpoint per validare la password admin lato server.

import { checkAdminAuth } from './_admin-auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!checkAdminAuth(req)) {
    return res.status(401).json({ ok: false, error: 'Password non corretta' });
  }

  return res.status(200).json({ ok: true });
}
