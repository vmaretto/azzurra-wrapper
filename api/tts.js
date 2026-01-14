// api/tts.js
// Endpoint per generare audio TTS con OpenAI

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    // Genera audio con OpenAI TTS
    // PCM format: 24kHz, 16-bit, mono (richiesto da LiveAvatar)
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // Voce femminile, buona per italiano
      input: text,
      response_format: 'pcm'
    });

    // Converti in Base64
    const buffer = Buffer.from(await response.arrayBuffer());
    const audioBase64 = buffer.toString('base64');

    console.log('TTS generated, audio length:', audioBase64.length);

    res.status(200).json({ audio: audioBase64 });
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'TTS generation failed: ' + error.message });
  }
}
