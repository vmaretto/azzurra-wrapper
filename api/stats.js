import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL);
    
    const stats = await sql`
      SELECT 
        COUNT(*) as total_experiences,
        AVG(duration) as avg_duration,
        MIN(duration) as min_duration,
        MAX(duration) as max_duration,
        COUNT(DISTINCT profile->>'region') as unique_regions,
        COUNT(CASE WHEN feedback IS NOT NULL AND feedback != '' THEN 1 END) as with_feedback
      FROM azzurra_experiences
    `;
    
    const experienceLevels = await sql`
      SELECT 
        profile->>'experience' as level,
        COUNT(*) as count
      FROM azzurra_experiences
      WHERE profile->>'experience' IS NOT NULL
      GROUP BY profile->>'experience'
      ORDER BY count DESC
    `;
    
    const topRegions = await sql`
      SELECT 
        profile->>'region' as region,
        COUNT(*) as count
      FROM azzurra_experiences
      WHERE profile->>'region' IS NOT NULL
      GROUP BY profile->>'region'
      ORDER BY count DESC
      LIMIT 10
    `;
    
    const dietaryPrefs = await sql`
      SELECT 
        profile->>'dietaryPref' as preference,
        COUNT(*) as count
      FROM azzurra_experiences
      WHERE profile->>'dietaryPref' IS NOT NULL
      GROUP BY profile->>'dietaryPref'
      ORDER BY count DESC
    `;
    
    return res.status(200).json({
      success: true,
      stats: stats[0],
      experienceLevels,
      topRegions,
      dietaryPrefs
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
