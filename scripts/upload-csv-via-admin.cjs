#!/usr/bin/env node
// scripts/upload-csv-via-admin.cjs
// Carica un CSV grosso (es. eci_ricette_complete.csv) in chunk di N ricette uniche
// invocando ripetutamente /api/admin/upload-recipes (che fa upsert + embeddings).
//
// Uso:
//   ADMIN_PASSWORD=xxx node scripts/upload-csv-via-admin.cjs <path/to/csv>
//   ADMIN_PASSWORD=xxx node scripts/upload-csv-via-admin.cjs <path/to/csv> --base https://your.vercel.app
//   ADMIN_PASSWORD=xxx node scripts/upload-csv-via-admin.cjs <path/to/csv> --chunk 80
//
// Il CSV deve essere multi-row (una riga per ingrediente).
// Lo script raggruppa le righe per (titolo, ricettario, anno), poi le invia in chunk.

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Uso: ADMIN_PASSWORD=xxx node scripts/upload-csv-via-admin.cjs <path/to/csv> [--base URL] [--chunk N]');
  process.exit(1);
}

const csvPath = args[0];
const baseIdx = args.indexOf('--base');
const baseUrl = baseIdx >= 0 ? args[baseIdx + 1] : 'https://azzurra-wrapper.vercel.app';
const chunkIdx = args.indexOf('--chunk');
const chunkSize = chunkIdx >= 0 ? parseInt(args[chunkIdx + 1], 10) : 80;

const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
  console.error('Errore: variabile ADMIN_PASSWORD non impostata.');
  console.error('Esempio: ADMIN_PASSWORD=mia_password node scripts/upload-csv-via-admin.cjs /path/to/file.csv');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error('File non trovato:', csvPath);
  process.exit(1);
}

console.log('Lettura CSV:', csvPath);
const csv = fs.readFileSync(csvPath, 'utf-8');

const rows = parse(csv, {
  columns: true,
  delimiter: csv.split('\n')[0].includes(';') ? ';' : ',',
  skip_empty_lines: true,
  relax_column_count: true,
  bom: true,
  trim: true
});

if (rows.length === 0) {
  console.error('CSV vuoto');
  process.exit(1);
}

const headers = Object.keys(rows[0]);
const headerLine = headers.join(';');
console.log(`Lette ${rows.length} righe, colonne:`, headers);

// Identifica colonna titolo, ricettario, anno
function findCol(aliases) {
  return headers.find(h => aliases.includes(h.toLowerCase().replace(/[^a-z0-9]/g, '_')));
}
const colTitolo = findCol(['titolo', 'nome', 'title', 'recipe']);
const colRicettario = findCol(['ricettario', 'fonte', 'source', 'cookbook']);
const colAnno = findCol(['anno', 'year']);

if (!colTitolo) {
  console.error('Colonna "titolo" non trovata');
  process.exit(1);
}

// Raggruppa righe per (titolo, ricettario, anno)
const groups = new Map();
function key(r) {
  return [
    String(r[colTitolo] || '').trim().toLowerCase(),
    colRicettario ? String(r[colRicettario] || '').trim().toLowerCase() : '',
    colAnno ? String(r[colAnno] || '').trim() : ''
  ].join('||');
}

for (const r of rows) {
  const k = key(r);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}

const groupKeys = [...groups.keys()];
console.log(`Ricette uniche: ${groupKeys.length}`);
console.log(`Chunk size: ${chunkSize} ricette → ${Math.ceil(groupKeys.length / chunkSize)} chunk totali\n`);

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[";\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function rowsToCsv(rs) {
  const lines = [headerLine];
  for (const r of rs) {
    lines.push(headers.map(h => csvEscape(r[h])).join(';'));
  }
  return lines.join('\n');
}

async function uploadChunk(chunkRows, idx, total) {
  const body = JSON.stringify({ csv: rowsToCsv(chunkRows) });
  const url = `${baseUrl.replace(/\/$/, '')}/api/admin/upload-recipes`;
  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': adminPassword
    },
    body
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  let data;
  try { data = await res.json(); } catch { data = { error: 'response not JSON' }; }

  if (!res.ok) {
    console.error(`  ❌ Chunk ${idx}/${total} HTTP ${res.status} (${dt}s):`, data.error || data);
    return null;
  }
  console.log(`  ✓ Chunk ${idx}/${total}: ${data.recipes ?? '?'} ricette, +${data.inserted} ↻${data.updated} ✗${data.errors} (${dt}s)`);
  if (data.errorDetails && data.errorDetails.length > 0) {
    console.log(`    primi errori:`, data.errorDetails.slice(0, 3));
  }
  return data;
}

(async () => {
  let totalInserted = 0, totalUpdated = 0, totalErrors = 0;
  const chunks = [];
  for (let i = 0; i < groupKeys.length; i += chunkSize) {
    const slice = groupKeys.slice(i, i + chunkSize);
    const chunkRows = slice.flatMap(k => groups.get(k));
    chunks.push(chunkRows);
  }

  for (let i = 0; i < chunks.length; i++) {
    const result = await uploadChunk(chunks[i], i + 1, chunks.length);
    if (result) {
      totalInserted += result.inserted || 0;
      totalUpdated += result.updated || 0;
      totalErrors += result.errors || 0;
    } else {
      totalErrors += chunks[i].length;
    }
    // Pausa di 1.5s tra chunk per non saturare embedding rate limits
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n=== Import completato ===');
  console.log(`Inserite: ${totalInserted}`);
  console.log(`Aggiornate: ${totalUpdated}`);
  console.log(`Errori: ${totalErrors}`);
})().catch(err => {
  console.error('Errore fatale:', err);
  process.exit(1);
});
