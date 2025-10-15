import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const experiences = await sql`
      SELECT 
        id,
        timestamp,
        duration,
        profile,
        output,
        feedback,
        created_at
      FROM azzurra_experiences
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    const countResult = await sql`
      SELECT COUNT(*) as total FROM azzurra_experiences
    `;
    
    const total = parseInt(countResult[0].total);
    
    return res.status(200).json({
      success: true,
      data: experiences,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching experiences:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch experiences',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
