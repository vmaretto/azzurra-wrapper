// api/admin/export-analysis-pdf.js
// Genera un PDF dell'analisi AI partendo da uno screenshot ad alta risoluzione
// del pannello report del dashboard (catturato lato client con html2canvas).
// L'immagine viene scalata alla larghezza pagina e "tilata" su piu' pagine A4
// con clipping per evitare contenuto tagliato a meta'.

import PDFDocument from 'pdfkit';
import { requireAdmin } from '../_admin-auth.js';

export const config = {
  api: {
    bodyParser: { sizeLimit: '20mb' } // immagine alta risoluzione: ~3-8MB
  },
  maxDuration: 30
};

const COLORS = {
  primary: '#016fab',
  textLight: '#666666'
};

// Estrae width/height dall'header IHDR di un buffer PNG.
function getPngDimensions(buffer) {
  if (buffer.length < 24) throw new Error('PNG troppo piccolo');
  // Verifica signature PNG
  const sig = buffer.slice(0, 8);
  if (sig[0] !== 0x89 || sig[1] !== 0x50 || sig[2] !== 0x4E || sig[3] !== 0x47) {
    throw new Error('Signature PNG non valida');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const {
    reportImage,
    title = 'Analisi AI',
    type = 'analysis'
  } = req.body || {};

  if (!reportImage || typeof reportImage !== 'string' || !reportImage.startsWith('data:image/png;base64,')) {
    return res.status(400).json({ error: 'reportImage (PNG base64) mancante' });
  }

  try {
    const imgBuffer = Buffer.from(reportImage.replace(/^data:image\/png;base64,/, ''), 'base64');
    const { width: imgW, height: imgH } = getPngDimensions(imgBuffer);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: String(title).slice(0, 100),
        Author: 'Azzurra Analytics',
        Subject: type === 'foresight' ? 'Foresight cucina italiana' : 'Analisi ricette'
      }
    });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      const slug = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || 'analisi';
      const today = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Disposition', `attachment; filename="${slug}-${today}.pdf"`);
      res.status(200).send(buffer);
    });

    // A4 in punti: 595 x 842
    const PAGE_W = doc.page.width;
    const PAGE_H = doc.page.height;
    const HEADER_H = 30;
    const FOOTER_H = 22;
    const SIDE_MARGIN = 25;
    const INNER_W = PAGE_W - SIDE_MARGIN * 2;
    const CONTENT_AREA_TOP = HEADER_H + 6;
    const CONTENT_AREA_BOTTOM = PAGE_H - FOOTER_H - 4;
    const CONTENT_AREA_H = CONTENT_AREA_BOTTOM - CONTENT_AREA_TOP;

    // Scala l'immagine per riempire la larghezza disponibile
    const scale = INNER_W / imgW;
    const scaledImgH = imgH * scale;
    const numPages = Math.max(1, Math.ceil(scaledImgH / CONTENT_AREA_H));

    function drawHeader() {
      doc.save();
      doc.rect(0, 0, PAGE_W, HEADER_H).fill(COLORS.primary);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(9.5)
        .text('AZZURRA  -  ANALISI AI', SIDE_MARGIN, 11, { lineBreak: false });
      doc.font('Helvetica').fontSize(8.5)
        .text(
          new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }),
          PAGE_W - SIDE_MARGIN - 200, 11,
          { width: 200, align: 'right', lineBreak: false }
        );
      doc.restore();
    }

    function drawFooter(pageNum, total) {
      doc.save();
      doc.fillColor(COLORS.textLight).font('Helvetica').fontSize(7.5)
        .text(
          `Pagina ${pageNum} di ${total}  -  Azzurra Analytics  -  Generato il ${new Date().toLocaleString('it-IT')}`,
          0, PAGE_H - 14,
          { width: PAGE_W, align: 'center', lineBreak: false }
        );
      doc.restore();
    }

    for (let i = 0; i < numPages; i++) {
      if (i > 0) doc.addPage();

      drawHeader();

      // Calcola y di posizionamento dell'immagine (con offset negativo per le pagine successive)
      const imageY = CONTENT_AREA_TOP - i * CONTENT_AREA_H;

      // Clipping della content area per non sovrapporsi a header/footer
      doc.save();
      doc.rect(SIDE_MARGIN, CONTENT_AREA_TOP, INNER_W, CONTENT_AREA_H).clip();
      doc.image(imgBuffer, SIDE_MARGIN, imageY, { width: INNER_W });
      doc.restore();

      drawFooter(i + 1, numPages);
    }

    doc.end();
  } catch (err) {
    console.error('export-analysis-pdf error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
