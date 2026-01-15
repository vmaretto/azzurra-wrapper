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

    // Statistiche per modalità di interazione (Avatar vs Chat)
    const modeStats = await sql`
      SELECT
        COALESCE(interaction_mode, 'avatar') as mode,
        COUNT(*) as total_sessions,
        AVG(duration) as avg_duration,
        AVG(rating) as avg_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as high_ratings,
        COUNT(CASE WHEN feedback IS NOT NULL AND feedback != '' THEN 1 END) as with_feedback
      FROM azzurra_experiences
      GROUP BY COALESCE(interaction_mode, 'avatar')
      ORDER BY total_sessions DESC
    `;

    // Trend temporale per modalità (ultime 4 settimane)
    const modeTrend = await sql`
      SELECT
        DATE_TRUNC('week', timestamp::timestamp) as week,
        COALESCE(interaction_mode, 'avatar') as mode,
        COUNT(*) as sessions,
        AVG(rating) as avg_rating
      FROM azzurra_experiences
      WHERE timestamp::timestamp >= NOW() - INTERVAL '4 weeks'
      GROUP BY DATE_TRUNC('week', timestamp::timestamp), COALESCE(interaction_mode, 'avatar')
      ORDER BY week DESC, mode
    `;

    return res.status(200).json({
      success: true,
      stats: stats[0],
      experienceLevels,
      topRegions,
      dietaryPrefs,
      modeStats,
      modeTrend
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
