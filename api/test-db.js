import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT NOW() as current_time, version() as version`;
    
    return res.status(200).json({
      success: true,
      message: 'Database connected successfully!',
      data: result[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
