import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Abilita CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Accetta solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const experienceData = req.body;
    
    // Validazione dati
    if (!experienceData.profile || experienceData.duration === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['profile', 'duration']
      });
    }

    // Connessione a Neon
    const sql = neon(process.env.DATABASE_URL);
    
    // Query per inserire i dati
    const result = await sql`
      INSERT INTO azzurra_experiences 
        (timestamp, duration, profile, output, feedback)
      VALUES 
        (
          ${experienceData.timestamp || new Date().toISOString()},
          ${experienceData.duration},
          ${JSON.stringify(experienceData.profile)},
          ${experienceData.output ? JSON.stringify(experienceData.output) : null},
          ${experienceData.feedback || null}
        )
      RETURNING id, timestamp
    `;
    
    console.log('Experience saved successfully:', result[0]);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Experience saved successfully',
      data: result[0]
    });
    
  } catch (error) {
    console.error('Error saving experience:', error);
    return res.status(500).json({ 
      error: 'Failed to save experience',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
