// api/conversation-analytics.js
// Endpoint per analisi dettagliata delle conversazioni (admin)

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_DATABASE_URL);

    // Statistiche generali
    const generalStats = await sql`
      SELECT
        COUNT(*) as total_conversations,
        AVG(duration) as avg_duration,
        AVG(rating) as avg_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_ratings,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_ratings,
        COUNT(CASE WHEN feedback IS NOT NULL AND feedback != '' THEN 1 END) as with_comments
      FROM azzurra_experiences
    `;

    // Distribuzione rating
    const ratingDistribution = await sql`
      SELECT
        rating,
        COUNT(*) as count
      FROM azzurra_experiences
      WHERE rating IS NOT NULL
      GROUP BY rating
      ORDER BY rating
    `;

    // Distribuzione oraria (ora del giorno)
    const hourlyDistribution = await sql`
      SELECT
        EXTRACT(HOUR FROM "timestamp") as hour,
        COUNT(*) as count
      FROM azzurra_experiences
      GROUP BY EXTRACT(HOUR FROM "timestamp")
      ORDER BY hour
    `;

    // Trend giornaliero (ultimi 30 giorni)
    const dailyTrend = await sql`
      SELECT
        DATE("timestamp") as date,
        COUNT(*) as count,
        AVG(rating) as avg_rating
      FROM azzurra_experiences
      WHERE "timestamp" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE("timestamp")
      ORDER BY date DESC
    `;

    // Distribuzione per fascia età
    const ageDistribution = await sql`
      SELECT
        profile->>'fasciaEta' as fascia_eta,
        COUNT(*) as count,
        AVG(rating) as avg_rating
      FROM azzurra_experiences
      WHERE profile->>'fasciaEta' IS NOT NULL
      GROUP BY profile->>'fasciaEta'
      ORDER BY count DESC
    `;

    // Distribuzione per sesso
    const genderDistribution = await sql`
      SELECT
        profile->>'sesso' as sesso,
        COUNT(*) as count,
        AVG(rating) as avg_rating
      FROM azzurra_experiences
      WHERE profile->>'sesso' IS NOT NULL
      GROUP BY profile->>'sesso'
      ORDER BY count DESC
    `;

    // Distribuzione per area geografica (supporta sia 'region' che 'areaGeografica')
    const regionDistribution = await sql`
      SELECT
        COALESCE(profile->>'region', profile->>'areaGeografica') as area,
        COUNT(*) as count,
        AVG(rating) as avg_rating
      FROM azzurra_experiences
      WHERE profile->>'region' IS NOT NULL OR profile->>'areaGeografica' IS NOT NULL
      GROUP BY COALESCE(profile->>'region', profile->>'areaGeografica')
      ORDER BY count DESC
      LIMIT 10
    `;

    // Durata media per fascia età
    const durationByAge = await sql`
      SELECT
        profile->>'fasciaEta' as fascia_eta,
        AVG(duration) as avg_duration,
        COUNT(*) as count
      FROM azzurra_experiences
      WHERE profile->>'fasciaEta' IS NOT NULL AND duration IS NOT NULL
      GROUP BY profile->>'fasciaEta'
      ORDER BY avg_duration DESC
    `;

    // Ultimi feedback testuali
    const recentFeedback = await sql`
      SELECT
        feedback,
        rating,
        "timestamp",
        profile->>'fasciaEta' as fascia_eta
      FROM azzurra_experiences
      WHERE feedback IS NOT NULL AND feedback != ''
      ORDER BY "timestamp" DESC
      LIMIT 10
    `;

    return res.status(200).json({
      success: true,
      generalStats: generalStats[0],
      ratingDistribution,
      hourlyDistribution,
      dailyTrend,
      ageDistribution,
      genderDistribution,
      regionDistribution,
      durationByAge,
      recentFeedback
    });

  } catch (error) {
    console.error('Error fetching conversation analytics:', error);
    return res.status(500).json({
      error: 'Failed to fetch analytics',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
