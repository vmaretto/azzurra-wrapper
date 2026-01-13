// api/heygen-token.js
// Genera un access token per HeyGen Streaming Avatar

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verifica che l'API key sia configurata
  if (!process.env.HEYGEN_API_KEY) {
    console.error('HEYGEN_API_KEY not configured');
    return res.status(500).json({ error: 'HeyGen API key not configured' });
  }

  try {
    const response = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.HEYGEN_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    // Log per debug
    console.log('HeyGen API response status:', response.status);
    console.log('HeyGen API response:', JSON.stringify(data));

    // Gestisci errori API
    if (!response.ok) {
      console.error('HeyGen API error:', data);
      return res.status(response.status).json({
        error: data.message || data.error || 'HeyGen API error'
      });
    }

    // Verifica struttura risposta
    if (!data.data || !data.data.token) {
      console.error('Unexpected HeyGen response structure:', data);
      return res.status(500).json({
        error: 'Unexpected response from HeyGen API'
      });
    }

    res.status(200).json({ token: data.data.token });
  } catch (error) {
    console.error('HeyGen token error:', error);
    res.status(500).json({ error: 'Failed to generate token: ' + error.message });
  }
}
