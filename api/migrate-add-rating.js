// api/migrate-add-rating.js
// One-time migration to add rating column to azzurra_experiences table

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST to run migration.' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL);

    // Add rating column if it doesn't exist
    await sql`
      ALTER TABLE azzurra_experiences
      ADD COLUMN IF NOT EXISTS rating INTEGER
    `;

    return res.status(200).json({
      success: true,
      message: 'Migration completed: rating column added to azzurra_experiences'
    });

  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({
      error: 'Migration failed',
      details: error.message
    });
  }
}
