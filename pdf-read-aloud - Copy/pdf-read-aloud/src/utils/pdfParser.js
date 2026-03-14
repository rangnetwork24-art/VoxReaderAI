import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Load a PDF document from an ArrayBuffer.
 * Returns the pdfjs document proxy for canvas rendering.
 */
export async function loadPdfDocument(arrayBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

/**
 * In-memory cache for extracted page text.
 * Keyed by a combination of document fingerprint + page number.
 */
const textCache = new Map();

function getCacheKey(pdfDoc, pageNumber) {
  // pdfDoc.fingerprints gives a unique ID per document
  const fp = pdfDoc.fingerprints?.[0] || 'unknown';
  return `${fp}_${pageNumber}`;
}

/**
 * Clear the text cache (call when loading a new document).
 */
export function clearTextCache() {
  textCache.clear();
}

/**
 * Extract text with positions from a single PDF page.
 * Results are cached — subsequent calls for the same page return instantly.
 * Returns { sentences, textItems, rawText, pageNumber }
 */
export async function extractPageText(pdfDoc, pageNumber) {
  const key = getCacheKey(pdfDoc, pageNumber);
  if (textCache.has(key)) {
    return textCache.get(key);
  }

  const page = await pdfDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });

  // Collect text items with position info
  const textItems = textContent.items
    .filter(item => item.str && item.str.trim().length > 0)
    .map(item => {
      const tx = item.transform;
      return {
        str: item.str,
        x: tx[4],
        y: viewport.height - tx[5],
        width: item.width,
        height: item.height || Math.abs(tx[3]) || 12,
        fontSize: Math.abs(tx[3]) || Math.abs(tx[0]) || 12,
      };
    });

  // Build raw text with smart spacing
  let rawText = '';
  let lastY = -1;
  for (const item of textContent.items) {
    if (!item.str) continue;
    const currentY = item.transform[5];
    if (lastY !== -1 && Math.abs(currentY - lastY) > 2) {
      if (Math.abs(currentY - lastY) > 15) {
        rawText += '\n\n';
      } else {
        rawText += ' ';
      }
    }
    rawText += item.str;
    lastY = currentY;
  }

  // Split into sentences
  const sentences = splitIntoSentences(rawText.trim());

  const result = {
    sentences,
    textItems,
    rawText: rawText.trim(),
    pageNumber,
  };

  textCache.set(key, result);
  return result;
}

/**
 * Split text into readable sentences for TTS.
 * Handles common abbreviations and edge cases.
 */
function splitIntoSentences(text) {
  if (!text || text.trim().length === 0) return [];

  text = text.replace(/\s+/g, ' ').trim();

  const raw = text.match(/[^.!?\n]+(?:[.!?]+["']?|$|\n)/g);

  if (!raw) return [text.trim()].filter(s => s.length > 0);

  const sentences = [];
  let buffer = '';

  for (const chunk of raw) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    buffer += (buffer ? ' ' : '') + trimmed;

    if (buffer.length > 15 || /[.!?]["']?$/.test(buffer)) {
      sentences.push(buffer.trim());
      buffer = '';
    }
  }

  if (buffer.trim()) {
    sentences.push(buffer.trim());
  }

  return sentences.filter(s => s.length > 0);
}
