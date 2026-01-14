// api/generate-recipe-pdf.js
// Endpoint per generare PDF con le ricette discusse nella conversazione

import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Normalizza testo rimuovendo accenti e caratteri speciali
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti
    .replace(/[^a-z0-9\s]/g, ' ')    // Rimuove caratteri speciali
    .replace(/\s+/g, ' ')
    .trim();
}

// Estrae i titoli delle ricette menzionate nella conversazione
async function extractMentionedRecipes(conversationHistory) {
  if (!supabase || !conversationHistory || conversationHistory.length === 0) {
    return [];
  }

  try {
    // Ottieni tutti i titoli unici delle ricette
    const { data: allRecipes, error } = await supabase
      .from('ricette')
      .select('titolo')
      .order('titolo');

    if (error || !allRecipes) {
      console.error('Errore recupero titoli:', error);
      return [];
    }

    // Estrai titoli unici
    const uniqueTitles = [...new Set(allRecipes.map(r => r.titolo))];

    // Concatena tutti i messaggi dell'assistant E dell'utente
    const allMessages = conversationHistory
      .map(msg => msg.content)
      .join(' ');

    // Normalizza il testo della conversazione
    const normalizedConversation = normalizeText(allMessages);

    console.log('Ricerca ricette nella conversazione...');
    console.log('Titoli disponibili:', uniqueTitles.length);

    // Trova quali titoli sono menzionati (con normalizzazione)
    const mentionedTitles = uniqueTitles.filter(title => {
      const normalizedTitle = normalizeText(title);
      // Cerca il titolo normalizzato nella conversazione normalizzata
      const found = normalizedConversation.includes(normalizedTitle);
      if (found) {
        console.log('Trovata ricetta:', title);
      }
      return found;
    });

    console.log('Ricette trovate:', mentionedTitles);

    if (mentionedTitles.length === 0) {
      return [];
    }

    // Recupera i dettagli completi delle ricette menzionate (prima versione di ogni ricetta)
    const { data: recipes, error: recipeError } = await supabase
      .from('ricette')
      .select('titolo, famiglia, ricettario, anno, ingredienti, procedimento, scheda_antropologica, calorie, n_persone')
      .in('titolo', mentionedTitles)
      .order('titolo')
      .order('anno');

    if (recipeError) {
      console.error('Errore recupero dettagli ricette:', recipeError);
      return [];
    }

    // Raggruppa per titolo e prendi solo la prima versione di ogni ricetta
    const uniqueRecipes = [];
    const seenTitles = new Set();
    for (const recipe of recipes) {
      if (!seenTitles.has(recipe.titolo)) {
        seenTitles.add(recipe.titolo);
        uniqueRecipes.push(recipe);
      }
    }

    return uniqueRecipes;
  } catch (err) {
    console.error('Errore estrazione ricette:', err);
    return [];
  }
}

// Genera PDF con le ricette
function generatePDF(recipes) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const pdfBase64 = pdfBuffer.toString('base64');
        resolve(pdfBase64);
      });
      doc.on('error', reject);

      // Titolo principale
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .text('Le tue ricette con Azzurra', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12)
        .font('Helvetica')
        .fillColor('#666')
        .text('Enciclopedia della Cucina Italiana', { align: 'center' });
      doc.moveDown(2);

      // Per ogni ricetta
      recipes.forEach((recipe, index) => {
        if (index > 0) {
          doc.addPage();
        }

        // Titolo ricetta
        doc.fontSize(20)
          .font('Helvetica-Bold')
          .fillColor('#016fab')
          .text(recipe.titolo);
        doc.moveDown(0.3);

        // Fonte
        doc.fontSize(10)
          .font('Helvetica-Oblique')
          .fillColor('#888')
          .text(`${recipe.ricettario || 'Tradizione italiana'}${recipe.anno ? ` (${recipe.anno})` : ''}`);
        doc.moveDown(1);

        // Storia (se presente)
        if (recipe.scheda_antropologica) {
          doc.fontSize(11)
            .font('Helvetica-Oblique')
            .fillColor('#444')
            .text(cleanHtml(recipe.scheda_antropologica).substring(0, 500) + '...');
          doc.moveDown(1);
        }

        // Ingredienti
        if (recipe.ingredienti) {
          doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#333')
            .text('Ingredienti');
          doc.moveDown(0.3);
          doc.fontSize(11)
            .font('Helvetica')
            .fillColor('#333')
            .text(cleanHtml(recipe.ingredienti));
          doc.moveDown(1);
        }

        // Procedimento
        if (recipe.procedimento) {
          doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#333')
            .text('Preparazione');
          doc.moveDown(0.3);
          doc.fontSize(11)
            .font('Helvetica')
            .fillColor('#333')
            .text(cleanHtml(recipe.procedimento).substring(0, 1500));
          doc.moveDown(1);
        }

        // Info aggiuntive
        const info = [];
        if (recipe.n_persone) info.push(`Per ${recipe.n_persone} persone`);
        if (recipe.calorie) info.push(`${Math.round(recipe.calorie)} kcal/porzione`);

        if (info.length > 0) {
          doc.fontSize(10)
            .font('Helvetica')
            .fillColor('#888')
            .text(info.join(' • '));
        }
      });

      // Footer
      doc.moveDown(2);
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#aaa')
        .text('Generato da Azzurra - ECI CREA', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Rimuove tag HTML dal testo
function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { conversationHistory, discussedRecipes } = req.body;

  if (!conversationHistory || conversationHistory.length === 0) {
    return res.status(400).json({ error: 'conversationHistory is required' });
  }

  try {
    let recipes = [];

    // Se abbiamo discussedRecipes dal tracciamento RAG, usale direttamente
    if (discussedRecipes && discussedRecipes.length > 0) {
      console.log('Usando ricette tracciate dal RAG:', discussedRecipes);

      // Recupera dettagli completi delle ricette per titolo
      const { data: recipeData, error: recipeError } = await supabase
        .from('ricette')
        .select('titolo, famiglia, ricettario, anno, ingredienti, procedimento, scheda_antropologica, calorie, n_persone')
        .in('titolo', discussedRecipes)
        .order('titolo')
        .order('anno');

      if (!recipeError && recipeData) {
        // Raggruppa per titolo e prendi solo la prima versione di ogni ricetta
        const seenTitles = new Set();
        for (const recipe of recipeData) {
          if (!seenTitles.has(recipe.titolo)) {
            seenTitles.add(recipe.titolo);
            recipes.push(recipe);
          }
        }
      }
      console.log('Ricette recuperate:', recipes.map(r => r.titolo));
    } else {
      // Fallback: estrai ricette con text matching (legacy)
      console.log('Fallback: estrazione ricette da conversazione');
      recipes = await extractMentionedRecipes(conversationHistory);
    }

    if (recipes.length === 0) {
      return res.status(200).json({
        recipes: [],
        pdfBase64: null,
        pdfUrl: null,
        message: 'Nessuna ricetta trovata nella conversazione'
      });
    }

    // Genera PDF
    const pdfBase64 = await generatePDF(recipes);

    // Upload PDF su Supabase Storage per ottenere URL pubblico
    let pdfUrl = null;
    if (supabase && pdfBase64) {
      try {
        // Converti base64 in buffer
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');

        // Genera nome file univoco
        const fileName = `ricette-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;

        // Upload su Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('ricette-pdf')
          .upload(fileName, pdfBuffer, {
            contentType: 'application/pdf',
            cacheControl: '3600'
          });

        if (uploadError) {
          console.error('Errore upload PDF:', uploadError);
        } else {
          // Ottieni URL pubblico
          const { data: urlData } = supabase
            .storage
            .from('ricette-pdf')
            .getPublicUrl(fileName);

          pdfUrl = urlData?.publicUrl;
          console.log('PDF caricato su Storage:', pdfUrl);
        }
      } catch (uploadErr) {
        console.error('Errore durante upload Storage:', uploadErr);
      }
    }

    // Ritorna lista ricette, PDF base64 e URL pubblico
    res.status(200).json({
      recipes: recipes.map(r => ({
        titolo: r.titolo,
        famiglia: r.famiglia,
        ricettario: r.ricettario,
        anno: r.anno
      })),
      pdfBase64,
      pdfUrl,
      message: `Trovate ${recipes.length} ricette`
    });

  } catch (error) {
    console.error('Errore generazione PDF:', error);
    res.status(500).json({ error: 'Errore nella generazione del PDF' });
  }
}
