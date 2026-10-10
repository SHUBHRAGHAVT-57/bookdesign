import { useState } from 'react';
import type { Passage } from '../types';
import { BOOK } from '../data/bookData';
import { importPdfAsPassages } from '../lib/pdfImport';
import { generateAiQuestions } from '../lib/aiQuestionClient';
import WhyItWorks from './WhyItWorks';

interface OnboardingProps { initialBook?: { title: string; passages: Passage[] } | null; onStart: (book?: { title: string; passages: Passage[] }) => void; }

export default function Onboarding({ initialBook, onStart }: OnboardingProps) {
  const [selectedBook, setSelectedBook] = useState<{ title: string; passages: Passage[] } | null>(initialBook ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [allowAi, setAllowAi] = useState(false);
  const [aiProgress, setAiProgress] = useState('');

  const handleFile = async (file?: File): Promise<void> => {
    if (!file) return;
    setBusy(true); setError(''); setSelectedBook(null); setAllowAi(false);
    try { setSelectedBook(await importPdfAsPassages(file)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not read this PDF.'); }
    finally { setBusy(false); }
  };

  const enhanceQuestions = async (): Promise<void> => {
    if (!selectedBook || !allowAi || busy) return;
    setBusy(true);
    setError('');
    try {
      const passages = await generateAiQuestions(selectedBook.passages, (done, total) => setAiProgress(`Generating questions: batch ${done} of ${total}…`));
      setSelectedBook({ ...selectedBook, passages });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI question generation failed. Local questions are still available.');
    } finally {
      setBusy(false);
      setAiProgress('');
    }
  };

  return (
    <section className="cover" aria-labelledby="cover-title">
      <div className="cover-board">
        <p className="cover-kicker">{BOOK.edition}</p>
        <h2 id="cover-title" className="cover-title">{selectedBook?.title ?? BOOK.title}</h2>
        <p className="cover-sub">{selectedBook ? `${selectedBook.passages.length} practice passages extracted from your PDF` : BOOK.subtitle}</p>
        <p className="cover-owner">{selectedBook ? 'Your document, your practice' : 'Written in your own hand'}</p>
      </div>
      <div className="cover-page">
        <h3 className="cover-heading">Make this book yours</h3>
        <p className="cover-note">Upload a text-based PDF and KeyTurn will turn its text into typing practice passages. Your file is processed in your browser; it is not uploaded to a KeyTurn server.</p>
        <div className="pdf-upload">
          <label className="field-label" htmlFor="pdf-upload">Choose a PDF (max 20 MB)</label>
          <input id="pdf-upload" className="field" type="file" accept="application/pdf,.pdf" disabled={busy}
            onChange={(event) => void handleFile(event.currentTarget.files?.[0])} />
          {busy && <p className="modal-note" role="status">{aiProgress || 'Reading PDF and preparing passages…'}</p>}
          {error && <p className="field-error" role="alert">{error}</p>}
          {selectedBook && <p className="pdf-success" role="status">Ready: {selectedBook.passages.length} passages with local questions. Start when you’re ready.</p>}
          {selectedBook && (
            <div className="ai-question-option">
              <label className="ai-consent">
                <input type="checkbox" checked={allowAi} onChange={(event) => setAllowAi(event.currentTarget.checked)} disabled={busy} />
                <span>I agree to send extracted passage text to Google Gemini to improve the questions.</span>
              </label>
              <p className="modal-note">Optional: only extracted passages are sent, not the PDF file. This uses an external AI service and may incur service costs. If you leave this unchecked, local questions remain available.</p>
              <button type="button" className="btn" onClick={() => void enhanceQuestions()} disabled={!allowAi || busy}>
                {busy ? 'Generating questions…' : 'Improve questions with AI'}
              </button>
            </div>
          )}
          {selectedBook && <button type="button" className="btn" onClick={() => { setSelectedBook(null); setError(''); setAllowAi(false); }}>Remove PDF</button>}
        </div>
        <h3 className="cover-heading">How practice works</h3>
        <ol className="cover-steps">
          <li><strong>Read</strong> the source passage on the left page.</li>
          <li><strong>Type</strong> it on the opposite page. Correct letters turn into ink.</li>
          <li><strong>Recall</strong> a key word from memory.</li>
          <li><strong>Review</strong> words you stumble on in Echo Review.</li>
        </ol>
        <WhyItWorks />
        <p className="cover-note">Text is extracted locally in your browser. Scanned PDFs containing only page images are not supported yet.</p>
        <button type="button" className="btn btn-primary btn-large" disabled={busy} onClick={() => onStart(selectedBook ?? undefined)}>
          {selectedBook ? 'Start my PDF' : 'Open the demo book'}
        </button>
      </div>
    </section>
  );
}
