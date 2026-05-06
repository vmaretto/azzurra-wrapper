// api/_admin-auth.js
// Helper condiviso per validare l'accesso admin lato server.
// La password viene presa da ADMIN_PASSWORD (env). Fallback "azzurra2024"
// SOLO per dev locale: in produzione la env va impostata.

export function checkAdminAuth(req) {
  const expected = process.env.ADMIN_PASSWORD || 'azzurra2024';
  const provided =
    req.headers['x-admin-password'] ||
    (req.body && req.body.adminPassword);

  return Boolean(provided) && provided === expected;
}

export function requireAdmin(req, res) {
  if (!checkAdminAuth(req)) {
    res.status(401).json({ error: 'Non autorizzato' });
    return false;
  }
  return true;
}
