import type { Passage } from '../types';

const PDFJS_VERSION = '4.10.38';
const PDFJS_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PDF_PAGES = 100;
const MAX_PASSAGES = 60;
const MAX_TEXT_CHARS = 800_000;

type PdfTextItem = { str?: string };
type PdfPage = { getTextContent: () => Promise<{ items: PdfTextItem[] }> };
type PdfDocument = { numPages: number; getPage: (pageNumber: number) => Promise<PdfPage> };
type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (input: { data: Uint8Array }) => { promise: Promise<PdfDocument> };
};

function splitIntoPassages(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/).map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const paragraph of (paragraphs.length ? paragraphs : [text.replace(/\s+/g, ' ').trim()])) {
    const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [paragraph];
    for (const sentenceRaw of sentences) {
      const sentence = sentenceRaw.trim();
      if (!sentence) continue;
      if (current && (current.length + sentence.length + 1 > 620 || current.length > 360)) {
        chunks.push(current);
        current = '';
      }
      if (sentence.length > 900) {
        if (current) chunks.push(current);
        current = '';
        for (let i = 0; i < sentence.length; i += 620) chunks.push(sentence.slice(i, i + 620).trim());
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
    }
    if (current && current.length > 280) {
      chunks.push(current);
      current = '';
    }
  }
  if (current) chunks.push(current);
  return chunks.filter((chunk) => chunk.length >= 35).slice(0, MAX_PASSAGES);
}

export async function importPdfAsPassages(file: File): Promise<{ title: string; passages: Passage[] }> {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') throw new Error('Choose a PDF file.');
  if (file.size > MAX_FILE_BYTES) throw new Error('This PDF is over 20 MB. Please choose a smaller file.');
  if (file.size === 0) throw new Error('This file is empty.');

  const pdfjsUrl = PDFJS_URL;
  let pdfjs: PdfJsModule;
  try {
    pdfjs = await import(/* @vite-ignore */ pdfjsUrl) as PdfJsModule;
  } catch {
    throw new Error('Could not load the PDF reader. Check your internet connection and try again.');
  }
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  let document: PdfDocument;
  try {
    document = await pdfjs.getDocument({ data: bytes }).promise;
  } catch {
    throw new Error('This PDF could not be opened. It may be damaged or password-protected.');
  }
  if (document.numPages > MAX_PDF_PAGES) throw new Error('This PDF has more than 100 pages. Please use a shorter PDF.');

  const extracted: string[] = [];
  let totalChars = 0;
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const pageText = (await page.getTextContent()).items.map((item) => item.str ?? '').join(' ').replace(/[ \t]+/g, ' ').trim();
    if (pageText) extracted.push(pageText);
    totalChars += pageText.length;
    if (totalChars > MAX_TEXT_CHARS) throw new Error('This PDF contains too much text. Please use a shorter PDF.');
  }
  const text = extracted.join('\n\n');
  if (text.replace(/\s/g, '').length < 80) throw new Error('No selectable text was found. This looks like a scanned/image-only PDF; OCR is not supported yet.');

  const chunks = splitIntoPassages(text);
  if (!chunks.length) throw new Error('I could not find enough readable text in this PDF.');
  const title = file.name.replace(/\.pdf$/i, '').trim() || 'My PDF';
  const passages: Passage[] = chunks.map((chunk, index) => {
    const words = chunk.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? [];
    const counts = new Map<string, number>();
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
    const concept = [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || b.length - a.length)[0] ?? 'passage';
    const titleWords = chunk.split(/\s+/).slice(0, 6).join(' ');
    return {
      id: `pdf-${index + 1}`,
      chapterNumber: index + 1,
      chapterTitle: `Your PDF · Section ${index + 1}`,
      title: titleWords.length > 48 ? `${titleWords.slice(0, 45)}…` : titleWords,
      text: chunk,
      concepts: [...new Set(words)].slice(0, 8),
      question: { prompt: 'Which key word from this passage can you recall?', accepted: [concept], modelAnswer: concept, concept },
    };
  });
  return { title, passages };
}
