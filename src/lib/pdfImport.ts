import type { Passage } from '../types';
import { generateLocalQuestions } from './questionGenerator';

const PDFJS_VERSION = '4.10.38';
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PDF_PAGES = 100;
const MAX_PASSAGES = 60;
const MAX_TEXT_CHARS = 800_000;

type PdfTextItem = { str?: string; transform?: number[]; hasEOL?: boolean };
type PdfPage = { getTextContent: () => Promise<{ items: PdfTextItem[] }> };
type PdfMetadata = { info?: { Title?: string; Author?: string } };
type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  getMetadata?: () => Promise<PdfMetadata>;
};
type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (input: { data: Uint8Array }) => { promise: Promise<PdfDocument> };
};

type PdfLine = { y: number; text: string };

function groupItemsIntoLines(items: PdfTextItem[]): PdfLine[] {
  const lines: PdfLine[] = [];
  let current: PdfLine | undefined;
  const Y_TOLERANCE = 2.5;

  for (const item of items) {
    const text = item.str ?? '';
    if (!text) continue;
    const y = typeof item.transform?.[5] === 'number' ? item.transform[5] : 0;
    if (!current || Math.abs(current.y - y) > Y_TOLERANCE || item.hasEOL) {
      current = { y, text };
      lines.push(current);
      continue;
    }

    const needsSpace = current.text.length > 0 &&
      !/\s$/.test(current.text) &&
      text.length > 0 &&
      !/^\s/.test(text);
    current.text += (needsSpace ? ' ' : '') + text;
  }

  return lines.filter((line) => line.text.trim().length > 0);
}

function cleanExtracted(text: string): string {
  return text
    // Remove decorative list markers and glyphs that are not practical to type.
    .replace(/[•●▪◦‣⁃◆◇■□★☆▶►➤➢]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])(?=\S)/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function linesToParagraphs(lines: PdfLine[]): string[] {
  if (!lines.length) return [];
  if (lines.length === 1) return [cleanExtracted(lines[0].text)];

  const gaps: number[] = [];
  for (let index = 1; index < lines.length; index++) {
    gaps.push(lines[index - 1].y - lines[index].y);
  }
  const positiveGaps = gaps.filter((gap) => gap > 0).sort((a, b) => a - b);
  const typicalGap = positiveGaps.length
    ? positiveGaps[Math.floor(positiveGaps.length / 2)]
    : 12;

  const paragraphs: string[] = [];
  let buffer = lines[0].text;
  for (let index = 1; index < lines.length; index++) {
    const gap = gaps[index - 1];
    // Large vertical gaps usually mark a new paragraph; negative gaps often
    // indicate that the PDF's text items changed columns or reading order.
    if (gap > typicalGap * 1.45 || gap < 0) {
      const paragraph = cleanExtracted(buffer);
      if (paragraph) paragraphs.push(paragraph);
      buffer = lines[index].text;
    } else {
      buffer += ' ' + lines[index].text;
    }
  }
  const finalParagraph = cleanExtracted(buffer);
  if (finalParagraph) paragraphs.push(finalParagraph);
  return paragraphs;
}

function splitIntoPassages(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/).map(cleanExtracted).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of (paragraphs.length ? paragraphs : [cleanExtracted(text)])) {
    // Numbered course notes often arrive as one PDF line. Split at item markers
    // before sentence chunking so a single practice passage does not contain a
    // whole list of unrelated topics (for example, "1. ARPANET ... 2. TCP/IP ...").
    const numberedItems = paragraph.split(/(?=\s+\d{1,2}[.)]\s+)/).map((item) => item.trim()).filter(Boolean);
    const units = numberedItems.length > 1 ? numberedItems : [paragraph];
    for (const unit of units) {
      const sentences = unit.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [unit];
      for (const sentenceRaw of sentences) {
      const sentence = cleanExtracted(sentenceRaw);
      if (!sentence) continue;
      if (current && (current.length + sentence.length + 1 > 620 || current.length > 360)) {
        chunks.push(current);
        current = '';
      }
      if (sentence.length > 900) {
        if (current) chunks.push(current);
        current = '';
        for (let index = 0; index < sentence.length; index += 620) {
          const piece = sentence.slice(index, index + 620).trim();
          if (piece) chunks.push(piece);
        }
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
      }
      if (current && (numberedItems.length > 1 || current.length > 280)) {
        chunks.push(current);
        current = '';
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.filter((chunk) => chunk.length >= 35).slice(0, MAX_PASSAGES);
}

export async function importPdfAsPassages(file: File): Promise<{ title: string; passages: Passage[] }> {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    throw new Error('Choose a PDF file.');
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('This PDF is over 20 MB. Please choose a smaller file.');
  if (file.size === 0) throw new Error('This file is empty.');

  let pdfjs: PdfJsModule;
  try {
    pdfjs = await import(/* @vite-ignore */ PDFJS_URL) as PdfJsModule;
  } catch {
    throw new Error('Could not load the PDF reader. Check your internet connection and try again.');
  }
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

  let document: PdfDocument;
  try {
    document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch {
    throw new Error('This PDF could not be opened. It may be damaged or password-protected.');
  }
  if (document.numPages > MAX_PDF_PAGES) {
    throw new Error('This PDF has more than 100 pages. Please use a shorter PDF.');
  }

  let metadata: PdfMetadata = {};
  try {
    metadata = await document.getMetadata?.() ?? {};
  } catch {
    // PDF metadata is optional; the filename remains a reliable fallback.
  }

  const extractedParagraphs: string[] = [];
  let totalChars = 0;
  let pagesWithText = 0;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    let pageText = '';
    try {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const paragraphs = linesToParagraphs(groupItemsIntoLines(content.items));
      pageText = paragraphs.join('\n\n');
    } catch {
      // A single unreadable page should not discard readable text from the rest.
      continue;
    }

    if (pageText.trim()) {
      pagesWithText++;
      extractedParagraphs.push(pageText);
    }
    totalChars += pageText.length;
    if (totalChars > MAX_TEXT_CHARS) {
      throw new Error('This PDF contains too much text. Please use a shorter PDF.');
    }
  }

  if (totalChars < Math.max(80, document.numPages * 15) || pagesWithText === 0) {
    throw new Error(
      'KeyTurn could not find enough selectable text in this PDF. It may be scanned or image-only; OCR is not supported yet. Try a text-based PDF instead.',
    );
  }

  const chunks = splitIntoPassages(extractedParagraphs.join('\n\n'));
  if (!chunks.length) throw new Error('I could not find enough readable text in this PDF.');

  const filenameTitle = file.name.replace(/\.pdf$/i, '').trim();
  const title = metadata.info?.Title?.trim() || filenameTitle || 'My PDF';
  const passages: Passage[] = chunks.map((chunk, index) => {
    const words = chunk.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? [];
    const counts = new Map<string, number>();
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
    const concept = [...counts.keys()].sort(
      (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || b.length - a.length,
    )[0] ?? 'passage';
    const titleWords = chunk.split(/\s+/).slice(0, 6).join(' ');

    return {
      id: `pdf-${index + 1}`,
      chapterNumber: index + 1,
      chapterTitle: `Your PDF · Section ${index + 1}`,
      title: titleWords.length > 48 ? `${titleWords.slice(0, 45)}…` : titleWords,
      text: chunk,
      concepts: [...new Set(words)].slice(0, 8),
      question: {
        prompt: 'Which key word from this passage can you recall?',
        accepted: [concept],
        modelAnswer: concept,
        concept,
      },
    };
  });

  return { title, passages: generateLocalQuestions(passages) };
}
