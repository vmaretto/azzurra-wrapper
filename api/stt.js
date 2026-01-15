// api/stt.js
// Endpoint per Speech-to-Text con OpenAI Whisper

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb' // Audio files can be large
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { audio } = req.body;

  if (!audio) {
    return res.status(400).json({ error: 'Audio data is required' });
  }

  try {
    // Decodifica Base64 in Buffer
    const audioBuffer = Buffer.from(audio, 'base64');

    // Crea un File-like object per l'API OpenAI
    const audioFile = new File([audioBuffer], 'audio.webm', {
      type: 'audio/webm'
    });

    // Trascrizione con Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'it', // Italiano
      response_format: 'text'
    });

    console.log('STT transcription:', transcription);

    res.status(200).json({
      text: transcription,
      success: true
    });

  } catch (error) {
    console.error('STT error:', error);
    res.status(500).json({
      error: 'Speech-to-text failed: ' + error.message,
      success: false
    });
  }
}
