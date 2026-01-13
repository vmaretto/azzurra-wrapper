// api/liveavatar-session.js
// Genera un session token per LiveAvatar

const LIVEAVATAR_API_URL = 'https://api.liveavatar.com/v1/sessions/token';
const AVATAR_ID = process.env.LIVEAVATAR_AVATAR_ID || 'eeb15a59-7cf3-4ac6-8bf6-4dc0dc61871c';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verifica che l'API key sia configurata
  const apiKey = process.env.LIVEAVATAR_API_KEY || process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    console.error('LIVEAVATAR_API_KEY not configured');
    return res.status(500).json({ error: 'LiveAvatar API key not configured' });
  }

  try {
    const response = await fetch(LIVEAVATAR_API_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode: 'FULL',
        avatar_id: AVATAR_ID,
        avatar_persona: {
          voice_id: '', // Usa la voce di default dell'avatar
          context_id: 'general_assistant',
          language: 'it'
        }
      })
    });

    const data = await response.json();

    // Log per debug
    console.log('LiveAvatar API response status:', response.status);
    console.log('LiveAvatar API response:', JSON.stringify(data));

    // Gestisci errori API
    if (!response.ok) {
      console.error('LiveAvatar API error:', data);
      return res.status(response.status).json({
        error: data.message || data.error || 'LiveAvatar API error'
      });
    }

    // Verifica struttura risposta (data è annidato: data.data.session_token)
    const sessionData = data.data;
    if (!sessionData || !sessionData.session_token) {
      console.error('Unexpected LiveAvatar response structure:', data);
      return res.status(500).json({
        error: 'Unexpected response from LiveAvatar API'
      });
    }

    res.status(200).json({
      sessionToken: sessionData.session_token,
      sessionId: sessionData.session_id
    });
  } catch (error) {
    console.error('LiveAvatar session error:', error);
    res.status(500).json({ error: 'Failed to create session: ' + error.message });
  }
}
