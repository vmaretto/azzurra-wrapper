// Script per importare ricette da CSV a Supabase con embeddings
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const SUPABASE_URL = 'https://pwhqkdivgumrsubpinrv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aHFrZGl2Z3VtcnN1YnBpbnJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU2NDM2NCwiZXhwIjoyMDgwMTQwMzY0fQ.4SgGvD4-UfdjHrJWHU1ha41A2NrwJE1hxIYlMiJhTdc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Pulisce HTML
function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Genera embedding
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.substring(0, 8000)
  });
  return response.data[0].embedding;
}

async function main() {
  console.log('=== Import Ricette per Azzurra ===\n');
  
  // Leggi CSV
  const prepPath = '/Users/virgiliomaretto/Library/Mobile Documents/com~apple~CloudDocs/Mac-mini/RicettePreparazione.csv';
  const ingrPath = '/Users/virgiliomaretto/Library/Mobile Documents/com~apple~CloudDocs/Mac-mini/RicetteIngredienti.csv';
  
  console.log('Lettura CSV...');
  const prepData = fs.readFileSync(prepPath, 'utf-8');
  const ingrData = fs.readFileSync(ingrPath, 'utf-8');
  
  const preparazioni = parse(prepData, { columns: true, delimiter: ';', relax_quotes: true, relax_column_count: true });
  const ingredienti = parse(ingrData, { columns: true, delimiter: ';', relax_quotes: true, relax_column_count: true });
  
  console.log(`Trovate ${preparazioni.length} ricette e ${ingredienti.length} righe ingredienti\n`);
  
  // Raggruppa ingredienti per ricetta (chiave: Ricettario+Titolo)
  const ingrMap = {};
  for (const ing of ingredienti) {
    const key = `${ing.Ricettario}|${ing.Titolo}`;
    if (!ingrMap[key]) ingrMap[key] = [];
    const qty = ing['Quantit�'] || ing['Quantità'] || '';
    const unit = ing['Unit� di misura'] || ing['Unità di misura'] || '';
    const ingrName = ing.IngredienteSpecifico || ing.IngredientePrincipale || '';
    if (ingrName) {
      ingrMap[key].push(`${qty} ${unit} ${ingrName}`.trim());
    }
  }
  
  // Prepara ricette per insert
  let count = 0;
  let errors = 0;
  
  for (const prep of preparazioni) {
    try {
      const key = `${prep.Ricettario}|${prep.Titolo}`;
      const ingredientiList = ingrMap[key] || [];
      
      const titolo = prep.Titolo || '';
      const ricettario = prep.Ricettario || '';
      const anno = parseInt(prep.Anno) || null;
      const famiglia = prep.Famiglia || '';
      const procedimento = cleanHtml(prep.Procedimento || '');
      const schedaAntro = cleanHtml(prep.SchedaAntropologica || '');
      const schedaNutri = cleanHtml(prep.SchedaNutrizionale || '');
      const calorie = parseInt(prep.Calorie) || null;
      const nPersone = parseInt(prep.NPersone) || null;
      
      if (!titolo) continue;
      
      // Testo per embedding: titolo + ingredienti + procedimento + scheda
      const embedText = `${titolo}. ${famiglia}. Ingredienti: ${ingredientiList.join(', ')}. ${procedimento} ${schedaAntro}`.substring(0, 8000);
      
      console.log(`[${count + 1}] ${titolo}...`);
      
      // Genera embedding
      const embedding = await generateEmbedding(embedText);
      
      // Insert in Supabase
      const { error } = await supabase.from('ricette').insert({
        titolo,
        famiglia,
        ricettario,
        anno,
        procedimento,
        ingredienti: ingredientiList.join('\n'),
        scheda_antropologica: schedaAntro,
        scheda_nutrizionale: schedaNutri,
        calorie,
        n_persone: nPersone,
        embedding
      });
      
      if (error) {
        console.error(`  Errore: ${error.message}`);
        errors++;
      } else {
        count++;
      }
      
      // Rate limit OpenAI
      await new Promise(r => setTimeout(r, 100));
      
    } catch (e) {
      console.error(`  Errore: ${e.message}`);
      errors++;
    }
  }
  
  console.log(`\n=== Completato ===`);
  console.log(`Ricette importate: ${count}`);
  console.log(`Errori: ${errors}`);
}

main().catch(console.error);
