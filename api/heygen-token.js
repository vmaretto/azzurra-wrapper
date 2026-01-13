// api/heygen-token.js
// Genera un access token per HeyGen Streaming Avatar

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    
    if (data.error) {
      return res.status(400).json({ error: data.error });
    }

    res.status(200).json({ token: data.data.token });
  } catch (error) {
    console.error('HeyGen token error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
}
