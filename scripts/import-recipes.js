// scripts/import-recipes.js
// Script per importare le ricette dal CSV a Supabase con embeddings

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

// Carica variabili ambiente
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Usa service key per write access
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Funzione per pulire HTML dal testo
function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')  // Rimuovi tag HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&egrave;/g, 'è')
    .replace(/&eacute;/g, 'é')
    .replace(/&agrave;/g, 'à')
    .replace(/&ograve;/g, 'ò')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&igrave;/g, 'ì')
    .replace(/\s+/g, ' ')      // Normalizza spazi
    .trim();
}

// Genera embedding con OpenAI
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.substring(0, 8000) // Limite caratteri
  });
  return response.data[0].embedding;
}

// Leggi e parsa CSV
function readCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
    relax_column_count: true
  });
}

async function main() {
  console.log('Inizio import ricette...\n');

  // Verifica variabili ambiente
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Errore: SUPABASE_URL e SUPABASE_SERVICE_KEY richiesti');
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('Errore: OPENAI_API_KEY richiesta');
    process.exit(1);
  }

  // Percorsi CSV (modifica se necessario)
  const ingredientiPath = process.argv[2] || '/Users/vmaretto/Downloads/RicetteIngredienti.csv';
  const preparazionePath = process.argv[3] || '/Users/vmaretto/Downloads/RicettePreparazione.csv';

  console.log(`Leggendo ingredienti da: ${ingredientiPath}`);
  console.log(`Leggendo preparazione da: ${preparazionePath}\n`);

  // Leggi CSV
  const ingredientiRows = readCsv(ingredientiPath);
  const preparazioneRows = readCsv(preparazionePath);

  console.log(`Ingredienti: ${ingredientiRows.length} righe`);
  console.log(`Preparazione: ${preparazioneRows.length} ricette\n`);

  // Raggruppa ingredienti per titolo
  const ingredientiPerTitolo = {};
  for (const row of ingredientiRows) {
    const titolo = row.Titolo;
    if (!titolo) continue;

    if (!ingredientiPerTitolo[titolo]) {
      ingredientiPerTitolo[titolo] = [];
    }

    const ingrediente = row.IngredienteSpecifico || row.IngredientePrincipale;
    const quantita = row['Quantità'];
    const unita = row['Unità di misura'];

    if (ingrediente) {
      let ing = ingrediente;
      if (quantita) ing += ` ${quantita}`;
      if (unita) ing += ` ${unita}`;
      ingredientiPerTitolo[titolo].push(ing);
    }
  }

  // Processa ogni ricetta
  let imported = 0;
  let errors = 0;

  for (const row of preparazioneRows) {
    const titolo = row.Titolo;
    if (!titolo) continue;

    try {
      // Estrai dati
      const ricettario = row.Ricettario || '';
      const anno = parseInt(row.Anno) || null;
      const famiglia = row.Famiglia || '';
      const procedimento = cleanHtml(row.Procedimento || '');
      const schedaAntropologica = cleanHtml(row.SchedaAntropologica || '');
      const schedaNutrizionale = cleanHtml(row.SchedaNutrizionale || '');
      const calorie = parseFloat(row.Calorie) || null;
      const nPersone = parseInt(row.NPersone) || null;

      // Combina ingredienti
      const ingredienti = ingredientiPerTitolo[titolo]?.join(', ') || '';

      // Crea testo per embedding
      const testoCompleto = `
Ricetta: ${titolo}
Famiglia: ${famiglia}
Ingredienti: ${ingredienti}
Preparazione: ${procedimento}
Storia: ${schedaAntropologica}
Note nutrizionali: ${schedaNutrizionale}
      `.trim();

      // Genera embedding
      console.log(`Processando: ${titolo}...`);
      const embedding = await generateEmbedding(testoCompleto);

      // Inserisci in Supabase
      const { error } = await supabase.from('ricette').insert({
        titolo,
        famiglia,
        ricettario,
        anno,
        procedimento,
        scheda_antropologica: schedaAntropologica,
        scheda_nutrizionale: schedaNutrizionale,
        ingredienti,
        calorie,
        n_persone: nPersone,
        embedding
      });

      if (error) {
        console.error(`  Errore inserimento ${titolo}:`, error.message);
        errors++;
      } else {
        imported++;
        console.log(`  OK (${imported}/${preparazioneRows.length})`);
      }

      // Rate limiting - aspetta 100ms tra le richieste
      await new Promise(r => setTimeout(r, 100));

    } catch (err) {
      console.error(`Errore processando ${titolo}:`, err.message);
      errors++;
    }
  }

  console.log(`\n=== Import completato ===`);
  console.log(`Importate: ${imported} ricette`);
  console.log(`Errori: ${errors}`);
}

main().catch(console.error);
