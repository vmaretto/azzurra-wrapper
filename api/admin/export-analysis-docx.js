// api/admin/export-analysis-docx.js
// Genera un documento Word (.docx) editabile con il report analisi.
// Word gestisce nativamente la paginazione, quindi grafici e blocchi non
// vengono splittati arbitrariamente.

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun,
  AlignmentType, BorderStyle, ShadingType, Footer, PageNumber, Header
} from 'docx';
import { requireAdmin } from '../_admin-auth.js';

export const config = {
  api: {
    bodyParser: { sizeLimit: '15mb' }
  },
  maxDuration: 30
};

const COLORS = {
  primary: '016fab',
  dark: '014d7a',
  text: '333333',
  textLight: '666666',
  accent: 'f4a261',
  warningBg: 'fff8e1',
  warning: '7d5e00'
};

// Word ha pieno supporto Unicode (a differenza di pdfkit/Helvetica) ma rimuoviamo
// emoji "decorative" che potrebbero non avere font sul sistema dell'utente.
function safeText(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[☀-➿]/g, '')
    .replace(/ /g, ' ')
    .trim();
}

function getPngDimensions(buffer) {
  if (buffer.length < 24) return null;
  const sig = buffer.slice(0, 8);
  if (sig[0] !== 0x89 || sig[1] !== 0x50 || sig[2] !== 0x4E || sig[3] !== 0x47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function makeHeading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    children: [new TextRun({ text: safeText(text), color: COLORS.primary, bold: true })],
    spacing: { before: 280, after: 120 }
  });
}

function makeParagraph(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({
      text: safeText(text),
      color: opts.color || COLORS.text,
      italics: opts.italic || false,
      size: opts.size || 22 // 22 half-points = 11pt
    })],
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: opts.spacing || 120, line: 320 }
  });
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
    charts = [],
    chartImages = [],
    approfondimento = '',
    limitazioni = '',
    question = '',
    type = 'analysis',
    recipesAnalyzed = null
  } = req.body || {};

  try {
    const children = [];

    // --- TYPE BADGE ---
    const typeLabel = type === 'foresight' ? 'FORESIGHT' : 'ANALISI STORICA';
    children.push(new Paragraph({
      children: [new TextRun({
        text: typeLabel,
        bold: true,
        color: type === 'foresight' ? COLORS.accent : COLORS.primary,
        size: 18,
        characterSpacing: 24
      })],
      spacing: { after: 100 }
    }));

    // --- TITOLO ---
    children.push(new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({
        text: safeText(title),
        bold: true,
        color: COLORS.dark,
        size: 44 // 22pt
      })],
      spacing: { after: 120 }
    }));

    // --- META ---
    if (recipesAnalyzed) {
      children.push(new Paragraph({
        children: [new TextRun({
          text: `Basata su ${recipesAnalyzed} ricette del corpus`,
          color: COLORS.textLight,
          size: 20,
          italics: true
        })],
        spacing: { after: 80 }
      }));
    }

    // --- DOMANDA ---
    if (question) {
      children.push(new Paragraph({
        children: [new TextRun({
          text: 'DOMANDA',
          bold: true,
          color: COLORS.textLight,
          size: 18,
          characterSpacing: 20
        })],
        spacing: { before: 240, after: 60 }
      }));
      children.push(new Paragraph({
        children: [new TextRun({
          text: '"' + safeText(question) + '"',
          italics: true,
          color: COLORS.text,
          size: 22
        })],
        spacing: { after: 240 }
      }));
    }

    // --- SINTESI ---
    if (summary) {
      children.push(makeHeading('Sintesi', HeadingLevel.HEADING_1));
      children.push(makeParagraph(summary, { align: AlignmentType.JUSTIFIED }));
    }

    // --- PUNTI CHIAVE ---
    if (Array.isArray(insights) && insights.length > 0) {
      children.push(makeHeading('Punti chiave', HeadingLevel.HEADING_1));
      insights.forEach((it, i) => {
        const safe = safeText(it);
        if (!safe) return;
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: `${String(i + 1).padStart(2, '0')}.  `,
              bold: true,
              color: COLORS.primary,
              size: 22
            }),
            new TextRun({ text: safe, color: COLORS.text, size: 22 })
          ],
          spacing: { after: 120, line: 320 },
          indent: { left: 200, hanging: 200 }
        }));
      });
    }

    // --- GRAFICI ---
    if (Array.isArray(charts) && charts.length > 0) {
      children.push(makeHeading('Visualizzazioni dati', HeadingLevel.HEADING_1));

      for (let i = 0; i < charts.length; i++) {
        const ch = charts[i] || {};
        const imgB64 = chartImages[i];

        if (ch.title) {
          children.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({
              text: safeText(ch.title),
              bold: true,
              color: COLORS.dark,
              size: 26
            })],
            spacing: { before: 240, after: 80 }
          }));
        }

        if (ch.description) {
          children.push(new Paragraph({
            children: [new TextRun({
              text: safeText(ch.description),
              italics: true,
              color: COLORS.textLight,
              size: 20
            })],
            spacing: { after: 120 }
          }));
        }

        // Immagine grafico
        if (imgB64 && typeof imgB64 === 'string' && imgB64.startsWith('data:image')) {
          try {
            const buffer = Buffer.from(imgB64.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64');
            const dims = getPngDimensions(buffer);
            const maxW = 580; // ~ larghezza pagina A4 portrait con margini standard
            let w = 580, h = 360;
            if (dims) {
              const scale = Math.min(1, maxW / dims.width);
              w = Math.round(dims.width * scale);
              h = Math.round(dims.height * scale);
              if (h > 380) {
                const s2 = 380 / h;
                w = Math.round(w * s2);
                h = 380;
              }
            }
            children.push(new Paragraph({
              children: [new ImageRun({
                data: buffer,
                transformation: { width: w, height: h }
              })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 }
            }));
          } catch (imgErr) {
            console.error('docx image error:', imgErr.message);
          }
        }
      }
    }

    // --- APPROFONDIMENTO ---
    if (approfondimento) {
      children.push(makeHeading('Approfondimento', HeadingLevel.HEADING_1));
      const paragraphs = String(approfondimento).split(/\n\s*\n/);
      for (const par of paragraphs) {
        const safe = safeText(par);
        if (!safe) continue;
        children.push(makeParagraph(safe, { align: AlignmentType.JUSTIFIED }));
      }
    }

    // --- LIMITAZIONI ---
    if (limitazioni) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: 'Limitazioni: ', bold: true, color: COLORS.warning, size: 20 }),
          new TextRun({ text: safeText(limitazioni), color: COLORS.warning, size: 20, italics: true })
        ],
        shading: { type: ShadingType.SOLID, color: COLORS.warningBg, fill: COLORS.warningBg },
        border: {
          left: { color: COLORS.accent, space: 6, style: BorderStyle.SINGLE, size: 18 }
        },
        spacing: { before: 360, after: 120, line: 320 },
        indent: { left: 200 }
      }));
    }

    const doc = new Document({
      creator: 'Azzurra Analytics',
      title: safeText(title),
      subject: type === 'foresight' ? 'Foresight cucina italiana' : 'Analisi ricette italiane storiche',
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 22 }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 }
          }
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              children: [new TextRun({
                text: 'AZZURRA  -  ANALISI AI',
                bold: true,
                color: COLORS.primary,
                size: 18
              })],
              alignment: AlignmentType.LEFT
            })]
          })
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Pagina ', color: COLORS.textLight, size: 16 }),
                new TextRun({ children: [PageNumber.CURRENT], color: COLORS.textLight, size: 16 }),
                new TextRun({ text: ' di ', color: COLORS.textLight, size: 16 }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], color: COLORS.textLight, size: 16 }),
                new TextRun({ text: '  -  Azzurra Analytics', color: COLORS.textLight, size: 16 })
              ]
            })]
          })
        },
        children
      }]
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const slug = (title || 'analisi').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
    const today = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="${slug}-${today}.docx"`);
    res.status(200).send(buffer);
  } catch (err) {
    console.error('export-analysis-docx error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
