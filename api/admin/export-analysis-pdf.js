// api/admin/export-analysis-pdf.js
// PDF strutturato: testo selezionabile + grafici come immagini singole, mai
// splittati a meta'. Ogni blocco (sintesi/insight/grafico/approfondimento)
// triggera un addPage() se non c'e' spazio sufficiente.

import PDFDocument from 'pdfkit';
import { requireAdmin } from '../_admin-auth.js';

export const config = {
  api: {
    bodyParser: { sizeLimit: '15mb' } // multi-chart PNG payloads
  },
  maxDuration: 30
};

const COLORS = {
  primary: '#016fab',
  dark: '#014d7a',
  text: '#333333',
  textLight: '#666666',
  accent: '#f4a261',
  warning: '#7d5e00',
  warningBg: '#fff8e1',
  light: '#caf0f8'
};

// pdfkit/Helvetica non supporta emoji/Unicode esteso
function asciiSafe(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[☀-➿]/g, '')
    .replace(/–|—/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .trim();
}

function getPngDimensions(buffer) {
  if (buffer.length < 24) return null;
  const sig = buffer.slice(0, 8);
  if (sig[0] !== 0x89 || sig[1] !== 0x50 || sig[2] !== 0x4E || sig[3] !== 0x47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const {
    title = 'Analisi AI',
    summary = '',
    insights = [],
    charts = [],          // [{ title, description, type }]
    chartImages = [],     // [base64 PNG, ...] same order as charts
    approfondimento = '',
    limitazioni = '',
    question = '',
    type = 'analysis',
    recipesAnalyzed = null
  } = req.body || {};

  try {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 55, right: 55 },
      bufferPages: true,
      info: {
        Title: asciiSafe(title).slice(0, 100),
        Author: 'Azzurra Analytics',
        Subject: type === 'foresight' ? 'Foresight cucina italiana' : 'Analisi ricette'
      }
    });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      const slug = (title || 'analisi').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
      const today = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Disposition', `attachment; filename="${slug}-${today}.pdf"`);
      res.status(200).send(buffer);
    });

    const PAGE_W = doc.page.width;
    const PAGE_H = doc.page.height;
    const M = doc.page.margins;
    const INNER_W = PAGE_W - M.left - M.right;
    const TOP_BAR_H = 32;
    const FOOTER_RESERVE = 30;
    const CONTENT_BOTTOM = PAGE_H - M.bottom - FOOTER_RESERVE;

    function drawTopBar() {
      doc.save();
      doc.rect(0, 0, PAGE_W, TOP_BAR_H).fill(COLORS.primary);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(9.5)
        .text('AZZURRA  -  ANALISI AI', M.left, 12, { lineBreak: false, width: INNER_W, align: 'left' });
      doc.font('Helvetica').fontSize(9)
        .text(
          new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }),
          M.left, 12,
          { width: INNER_W, align: 'right', lineBreak: false }
        );
      doc.restore();
      doc.x = M.left;
      doc.y = TOP_BAR_H + 16;
    }

    drawTopBar();
    doc.on('pageAdded', drawTopBar);

    // Helper: assicura che ci sia spazio per "needed" pixel; altrimenti nuova pagina
    function ensureSpace(needed) {
      if (doc.y + needed > CONTENT_BOTTOM) doc.addPage();
    }

    // --- TYPE BADGE ---
    const typeLabel = type === 'foresight' ? 'FORESIGHT' : 'ANALISI STORICA';
    const badgeColor = type === 'foresight' ? COLORS.accent : COLORS.primary;
    doc.fillColor(badgeColor).font('Helvetica-Bold').fontSize(9)
      .text(typeLabel, M.left, doc.y, { width: INNER_W, characterSpacing: 1.2 });
    doc.moveDown(0.4);

    // --- TITOLO ---
    doc.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(22)
      .text(asciiSafe(title), M.left, doc.y, { width: INNER_W, lineGap: 4 });
    doc.moveDown(0.3);

    // --- META ---
    if (recipesAnalyzed) {
      doc.fillColor(COLORS.textLight).font('Helvetica').fontSize(10)
        .text(`Basata su ${recipesAnalyzed} ricette del corpus`, M.left, doc.y, { width: INNER_W });
      doc.moveDown(0.3);
    }

    // --- DOMANDA ---
    if (question) {
      doc.moveDown(0.5);
      doc.fillColor(COLORS.textLight).font('Helvetica-Bold').fontSize(9)
        .text('DOMANDA', M.left, doc.y, { width: INNER_W, characterSpacing: 1 });
      doc.moveDown(0.15);
      doc.fillColor(COLORS.text).font('Helvetica-Oblique').fontSize(10.5)
        .text('"' + asciiSafe(question) + '"', M.left, doc.y, { width: INNER_W, lineGap: 2 });
    }

    doc.moveDown(0.8);

    // --- SINTESI ---
    if (summary) {
      ensureSpace(80);
      doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(13)
        .text('Sintesi', M.left, doc.y, { width: INNER_W });
      doc.moveDown(0.3);
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(10.5)
        .text(asciiSafe(summary), M.left, doc.y, { width: INNER_W, lineGap: 3, align: 'justify' });
      doc.moveDown(0.8);
    }

    // --- PUNTI CHIAVE ---
    if (Array.isArray(insights) && insights.length > 0) {
      ensureSpace(60);
      doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(13)
        .text('Punti chiave', M.left, doc.y, { width: INNER_W });
      doc.moveDown(0.4);

      insights.forEach((it, i) => {
        const safe = asciiSafe(it);
        if (!safe) return;
        const estH = doc.heightOfString(safe, { width: INNER_W - 30 }) + 14;
        ensureSpace(estH);

        const startY = doc.y;
        doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(11)
          .text(String(i + 1).padStart(2, '0'), M.left, startY, { width: 24, lineBreak: false });
        doc.fillColor(COLORS.text).font('Helvetica').fontSize(10.5)
          .text(safe, M.left + 30, startY, { width: INNER_W - 30, lineGap: 2.5 });

        doc.moveDown(0.4);
        doc.x = M.left;
      });

      doc.moveDown(0.5);
    }

    // --- GRAFICI ---
    if (Array.isArray(charts) && charts.length > 0) {
      ensureSpace(60);
      doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(13)
        .text('Visualizzazioni dati', M.left, doc.y, { width: INNER_W });
      doc.moveDown(0.5);

      for (let i = 0; i < charts.length; i++) {
        const ch = charts[i] || {};
        const imgB64 = chartImages[i];
        const imgBuffer = imgB64 && typeof imgB64 === 'string' && imgB64.startsWith('data:image')
          ? Buffer.from(imgB64.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64')
          : null;

        // Calcola altezza necessaria: titolo (~22) + descrizione (~30) + immagine (max 320)
        const dims = imgBuffer ? getPngDimensions(imgBuffer) : null;
        const targetW = INNER_W - 4;
        const imgScale = dims ? Math.min(1, targetW / dims.width) : 1;
        const imgH = dims ? Math.min(320, dims.height * imgScale) : 0;
        const headingH = ch.title ? 22 : 0;
        const descH = ch.description ? 30 : 0;
        const blockH = headingH + descH + imgH + 25;

        ensureSpace(blockH);

        if (ch.title) {
          doc.fillColor(COLORS.dark).font('Helvetica-Bold').fontSize(11.5)
            .text(asciiSafe(ch.title), M.left, doc.y, { width: INNER_W });
          doc.moveDown(0.15);
        }
        if (ch.description) {
          doc.fillColor(COLORS.textLight).font('Helvetica-Oblique').fontSize(9.5)
            .text(asciiSafe(ch.description), M.left, doc.y, { width: INNER_W, lineGap: 2 });
          doc.moveDown(0.4);
        }

        if (imgBuffer) {
          try {
            doc.image(imgBuffer, M.left, doc.y, {
              fit: [targetW, 320],
              align: 'center'
            });
            doc.y += imgH + 5;
          } catch (e) {
            console.error('chart image error:', e.message);
          }
        }

        doc.moveDown(1);
      }
    }

    // --- APPROFONDIMENTO ---
    if (approfondimento) {
      ensureSpace(80);
      doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(13)
        .text('Approfondimento', M.left, doc.y, { width: INNER_W });
      doc.moveDown(0.4);

      const paragraphs = String(approfondimento).split(/\n\s*\n/);
      for (const par of paragraphs) {
        const safe = asciiSafe(par);
        if (!safe) continue;
        const estH = doc.heightOfString(safe, { width: INNER_W }) + 12;
        // Se il paragrafo non entra interamente, addPage solo se piu' della meta'
        // di pagina libera (altrimenti pdfkit gestisce wrap multi-pagina ok per testo)
        if (estH > 100) ensureSpace(80);

        doc.fillColor(COLORS.text).font('Helvetica').fontSize(10.5)
          .text(safe, M.left, doc.y, {
            width: INNER_W,
            align: 'justify',
            lineGap: 3
          });
        doc.moveDown(0.7);
      }
    }

    // --- LIMITAZIONI ---
    if (limitazioni) {
      const safe = asciiSafe(limitazioni);
      const text = 'Limitazioni: ' + safe;
      const heightEst = doc.heightOfString(text, { width: INNER_W - 30 }) + 24;
      ensureSpace(heightEst);

      const startY = doc.y;
      doc.save();
      doc.rect(M.left, startY, INNER_W, heightEst).fill(COLORS.warningBg);
      doc.rect(M.left, startY, 4, heightEst).fill(COLORS.accent);
      doc.restore();

      doc.fillColor(COLORS.warning).font('Helvetica').fontSize(9.5)
        .text(text, M.left + 16, startY + 10, {
          width: INNER_W - 26,
          lineGap: 2.5
        });
      doc.y = startY + heightEst + 10;
    }

    // --- FOOTER PAGINAZIONE ---
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const footer = `Pagina ${i + 1} di ${range.count}  -  Azzurra Analytics`;
      doc.fillColor(COLORS.textLight).font('Helvetica').fontSize(8)
        .text(footer, M.left, PAGE_H - 35, {
          width: INNER_W, align: 'center', lineBreak: false
        });
    }

    doc.end();
  } catch (err) {
    console.error('export-analysis-pdf error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
