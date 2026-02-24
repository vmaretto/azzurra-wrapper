// Script per re-importare le ricette con ingredienti SEPARATI per ogni versione
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const SUPABASE_URL = 'https://yrordwovrejoepxsvtma.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlyb3Jkd292cmVqb2VweHN2dG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzEyMDQsImV4cCI6MjA4MzkwNzIwNH0.2EI7gD-XYLM-HG9FMoBEuKOWXkta1NdNPdV8ayR2c90';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Pulisce HTML
function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
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
    .replace(/&aacute;/g, 'á')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('=== RE-IMPORT RICETTE CON INGREDIENTI SEPARATI ===\n');
  
  // Leggi i CSV
  const prepPath = '/Users/virgiliomaretto/Library/Mobile Documents/com~apple~CloudDocs/Mac-mini/RicettePreparazione.csv';
  const ingrPath = '/Users/virgiliomaretto/Library/Mobile Documents/com~apple~CloudDocs/Mac-mini/RicetteIngredienti.csv';
  
  console.log('Lettura CSV...');
  const prepData = fs.readFileSync(prepPath, 'utf-8');
  const ingrData = fs.readFileSync(ingrPath, 'utf-8');
  
  const preparazioni = parse(prepData, { 
    columns: true, 
    delimiter: ';', 
    relax_quotes: true, 
    relax_column_count: true,
    skip_empty_lines: true
  });
  
  const ingredienti = parse(ingrData, { 
    columns: true, 
    delimiter: ';', 
    relax_quotes: true, 
    relax_column_count: true,
    skip_empty_lines: true
  });
  
  console.log(`Trovate ${preparazioni.length} ricette e ${ingredienti.length} righe ingredienti\n`);
  
  // Raggruppa ingredienti per chiave UNIVOCA: Ricettario + Titolo + Anno
  const ingrMap = {};
  for (const ing of ingredienti) {
    // Chiave univoca per ogni VERSIONE della ricetta
    const key = `${ing.Ricettario}|${ing.Titolo}|${ing.Anno}`;
    if (!ingrMap[key]) ingrMap[key] = [];
    
    // Estrai quantità e unità (gestendo encoding)
    const qty = ing['Quantità'] || ing['Quantit\uFFFD'] || ing['Quantita'] || '';
    const unit = ing['Unità di misura'] || ing['Unit\uFFFD di misura'] || ing['Unita di misura'] || '';
    const ingrName = ing.IngredienteSpecifico || ing.IngredientePrincipale || '';
    
    if (ingrName) {
      const ingrStr = [qty, unit, ingrName].filter(Boolean).join(' ').trim();
      if (ingrStr && !ingrMap[key].includes(ingrStr)) {
        ingrMap[key].push(ingrStr);
      }
    }
  }
  
  console.log(`Raggruppati ingredienti per ${Object.keys(ingrMap).length} versioni uniche\n`);
  
  // Prima cancella tutti i record esistenti
  console.log('Cancello ricette esistenti...');
  const { error: deleteError } = await supabase
    .from('ricette')
    .delete()
    .neq('id', 0); // Workaround per cancellare tutto
  
  if (deleteError) {
    console.error('Errore cancellazione:', deleteError.message);
    // Continuo comunque
  }
  
  // Importa ogni ricetta con i SUOI ingredienti
  let count = 0;
  let errors = 0;
  
  for (const prep of preparazioni) {
    try {
      const titolo = prep.Titolo || '';
      const ricettario = prep.Ricettario || '';
      const anno = parseInt(prep.Anno) || null;
      
      if (!titolo || !ricettario) continue;
      
      // Chiave per trovare gli ingredienti di QUESTA versione
      const key = `${ricettario}|${titolo}|${anno || prep.Anno}`;
      const ingredientiList = ingrMap[key] || [];
      
      const famiglia = prep.Famiglia || '';
      const procedimento = cleanHtml(prep.Procedimento || '');
      const schedaAntro = cleanHtml(prep.SchedaAntropologica || '');
      const schedaNutri = cleanHtml(prep.SchedaNutrizionale || '');
      const calorie = parseInt(prep.Calorie) || null;
      const nPersone = parseInt(prep.NPersone) || null;
      
      // Insert in Supabase (senza embedding per ora)
      const { error } = await supabase.from('ricette').insert({
        titolo,
        famiglia,
        ricettario,
        anno,
        procedimento,
        ingredienti: ingredientiList.join(', '),  // Solo ingredienti di QUESTA versione!
        scheda_antropologica: schedaAntro,
        scheda_nutrizionale: schedaNutri,
        calorie,
        n_persone: nPersone
      });
      
      if (error) {
        console.error(`  Errore ${titolo} (${ricettario}): ${error.message}`);
        errors++;
      } else {
        count++;
        if (count % 50 === 0) {
          console.log(`Importate ${count} ricette...`);
        }
      }
      
    } catch (e) {
      console.error(`  Errore: ${e.message}`);
      errors++;
    }
  }
  
  console.log(`\n=== COMPLETATO ===`);
  console.log(`Ricette importate: ${count}`);
  console.log(`Errori: ${errors}`);
}

main().catch(console.error);
