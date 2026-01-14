import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const experienceData = req.body;
    
    if (!experienceData.profile || experienceData.duration === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['profile', 'duration']
      });
    }

    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL);
    
    const result = await sql`
      INSERT INTO azzurra_experiences
        (timestamp, duration, profile, output, feedback, rating)
      VALUES
        (
          ${experienceData.timestamp || new Date().toISOString()},
          ${experienceData.duration},
          ${JSON.stringify(experienceData.profile)},
          ${experienceData.output ? JSON.stringify(experienceData.output) : null},
          ${experienceData.feedback || null},
          ${experienceData.rating || null}
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
