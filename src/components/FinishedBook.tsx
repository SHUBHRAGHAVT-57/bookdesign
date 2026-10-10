import { useState } from 'react';
import { BOOK, PASSAGES } from '../data/bookData';
import { buildExercise, checkEchoAnswer } from '../lib/echo';
import { formatDuration, summarizePage } from '../lib/typingEngine';
import type { AppState, BookSummary, EchoExercise, WeakWordRecord } from '../types';
import WhyItWorks from './WhyItWorks';

interface FinishedBookProps {
  state: AppState;
  summary: BookSummary;
  onRestart: () => void;
  onEchoReturn: (word: string, firstTrySolved: boolean) => void;
}

type WordStatus = 'mastered' | 'still shaky' | 'not yet reviewed';

function statusOf(record: WeakWordRecord): WordStatus {
  if (record.returnSolved) return 'mastered';
  return (record.returnAttempts ?? 0) > 0 ? 'still shaky' : 'not yet reviewed';
}

function sourcePage(record: WeakWordRecord): number {
  const index = PASSAGES.findIndex((p) => record.pages.includes(p.id));
  return index < 0 ? 1 : index + 1;
}

/** Plain-language line about the Echo effect, measured only from this session. */
function echoEffectLine(records: WeakWordRecord[]): string {
  const total = records.length;
  const tried = records.filter((r) => (r.returnAttempts ?? 0) > 0).length;
  const remembered = records.filter((r) => r.returnSolved).length;
  if (total === 0) return 'No word gave you real trouble, so there was nothing to bring back.';
  if (tried === 0) return `You have ${total} shaky ${total === 1 ? 'word' : 'words'} to bring back in the Memory Round below.`;
  return `${remembered} of ${total} returning ${total === 1 ? 'word' : 'words'} remembered on the first try.`;
}

export default function FinishedBook({ state, summary, onRestart, onEchoReturn }: FinishedBookProps) {
  const watch = Object.entries(state.weakWords).sort((a, b) => b[1].score - a[1].score);
  const [copied, setCopied] = useState(false);

  const copySummary = async (): Promise<void> => {
    const lines = [
      `${BOOK.title} - Memory Report`,
      `Typing: ${summary.wpm} WPM, ${summary.accuracy}% keystroke accuracy, ${formatDuration(summary.activeMs)} active time.`,
      `Recall: ${summary.recallCorrect} of ${summary.recallAnswered} answers correct.`,
      `Echo: ${echoEffectLine(watch.map(([, record]) => record))}`,
      ...PASSAGES.map((p) => {
        const page = state.pages[p.id];
        const stats = page ? summarizePage(page, p.text) : null;
        const recall = state.recall[p.id];
        return `${p.title}: typing ${stats ? `${stats.wpm} WPM, ${stats.accuracy}% accuracy` : 'not completed'}; recall ${recall ? (recall.correct ? 'correct' : 'missed') : 'not answered'}.`;
      }),
    ];
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      const input = document.createElement('textarea');
      input.value = text;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.append(input);
      input.select();
      const success = document.execCommand('copy');
      input.remove();
      setCopied(success);
    }
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="book">
      <article className="spread" aria-labelledby="end-title">
        <section className="page page-left" aria-label="Your Memory Edition is complete">
          <header className="page-head">
            <span className="page-label">The end</span>
            <span className="page-chapter">{BOOK.title}</span>
          </header>
          <h2 id="end-title" className="page-title">Your Memory Edition is complete</h2>
          <div className="page-body">
            <p className="prose">
              You read, typed, recalled and reviewed {summary.pagesCompleted} pages. Every line of this book is in your
              own hand.
            </p>
            <dl className="end-stats">
              <div><dt>Typing speed</dt><dd>{summary.wpm} WPM</dd></div>
              <div><dt>Keystroke accuracy</dt><dd>{summary.accuracy}%</dd></div>
              <div><dt>Active time</dt><dd>{formatDuration(summary.activeMs)}</dd></div>
              <div><dt>Echo reviews solved</dt><dd>{summary.echoSolved}</dd></div>
            </dl>
            <p className="echo-effect" role="status">
              <strong>Echo effect.</strong> {echoEffectLine(watch.map(([, record]) => record))}
            </p>
            <section className="report-pages" aria-labelledby="page-report-title">
              <h3 id="page-report-title" className="end-heading">Page by page</h3>
              <div className="report-chart" role="img" aria-label="Typing accuracy by page">
                {PASSAGES.map((p) => {
                  const stats = state.pages[p.id] ? summarizePage(state.pages[p.id], p.text) : null;
                  return (
                    <div className="report-bar-row" key={p.id}>
                      <span>{p.chapterNumber}</span>
                      <span className="report-bar-track"><span style={{ width: `${stats?.accuracy ?? 0}%` }} /></span>
                      <span>{stats ? `${stats.accuracy}%` : '—'}</span>
                    </div>
                  );
                })}
              </div>
              <ul className="report-page-list">
                {PASSAGES.map((p) => {
                  const stats = state.pages[p.id] ? summarizePage(state.pages[p.id], p.text) : null;
                  const recall = state.recall[p.id];
                  return (
                    <li key={p.id}>
                      <strong>{p.title}</strong>
                      <span>Typing: {stats ? `${stats.wpm} WPM · ${stats.accuracy}% accuracy · ${formatDuration(stats.activeMs)}` : 'not completed'}</span>
                      <span>Recall: {recall ? (recall.correct ? 'recalled' : 'missed') : 'not reviewed'}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
            <WhyItWorks />
          </div>
        </section>

        <section className="page page-right" aria-label="Memory Report">
          <header className="page-head">
            <span className="page-label page-label-accent">Memory Report</span>
            <span className="page-chapter">Typing and recall, reported separately</span>
          </header>
          <h2 className="page-title">
            {summary.recallCorrect} of {summary.recallAnswered} recalled
          </h2>
          <div className="page-body">
            <ul className="end-list">
              {PASSAGES.map((p) => {
                const r = state.recall[p.id];
                return (
                  <li key={p.id}>
                    <span className="end-mark" aria-hidden="true">{r ? (r.correct ? '✓' : '✕') : '–'}</span>
                    <span>
                      {p.title}
                      <span className="visually-hidden">{r ? (r.correct ? ': recalled' : ': missed') : ': not answered'}</span>
                    </span>
                  </li>
                );
              })}
            </ul>

            <h3 className="end-heading">Words to keep an eye on</h3>
            {watch.length === 0 ? (
              <p className="prose">No word gave you real trouble. Nicely done.</p>
            ) : (
              <ul className="end-words">
                {watch.map(([word, record]) => {
                  const status = statusOf(record);
                  return (
                    <li key={word}>
                      <strong>{word}</strong>
                      <span className="end-word-meta">stumbled on page {sourcePage(record)}</span>
                      <span className={`word-status${status === 'mastered' ? ' is-mastered' : status === 'still shaky' ? ' is-shaky' : ''}`}>
                        {status === 'mastered' ? '✓ ' : status === 'still shaky' ? '! ' : ''}
                        {status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {watch.length > 0 && (
              <section className="memory-round" aria-labelledby="memory-round-title">
                <h3 id="memory-round-title" className="end-heading">Echo returns · Memory Round</h3>
                <p className="memory-round-note">You stumbled on these words earlier. Bring each one back from memory.</p>
                {watch.map(([word, record]) => {
                  const source = PASSAGES.find((p) => record.pages.includes(p.id));
                  const exercise = source ? buildExercise(source.text, word) : null;
                  return exercise ? (
                    <EchoReturn
                      key={word}
                      word={word}
                      pageNumber={sourcePage(record)}
                      exercise={exercise}
                      previousAttempts={record.returnAttempts ?? 0}
                      retired={Boolean(record.returnSolved)}
                      onResult={onEchoReturn}
                    />
                  ) : null;
                })}
              </section>
            )}


            <p className="memory-report-time">Total active typing time: {formatDuration(summary.activeMs)}</p>
            <button type="button" className="btn" onClick={() => void copySummary()}>
              {copied ? 'Summary copied' : 'Copy summary'}
            </button>
            <button type="button" className="btn btn-primary" onClick={onRestart}>
              Start the demo again
            </button>
          </div>
        </section>
      </article>
    </div>
  );
}

interface EchoReturnProps {
  word: string;
  pageNumber: number;
  exercise: EchoExercise;
  previousAttempts: number;
  retired: boolean;
  onResult: (word: string, firstTrySolved: boolean) => void;
}

function EchoReturn({ word, pageNumber, exercise, previousAttempts, retired, onResult }: EchoReturnProps) {
  const [answer, setAnswer] = useState('');
  const [misses, setMisses] = useState(0);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');

  const check = (): void => {
    if (done || retired || !answer.trim()) return;
    const solved = checkEchoAnswer(answer, word);
    // Only a correct answer on the very first return attempt retires the word.
    onResult(word, solved && previousAttempts === 0);
    if (solved) {
      setDone(true);
      setMessage(
        previousAttempts === 0
          ? 'Remembered on the first try. This word is retired.'
          : 'Got it this time. It stays marked shaky because it was not first try.',
      );
    } else {
      const next = misses + 1;
      setMisses(next);
      setMessage(next >= 2 ? `Not yet. The word was “${word}”.` : `Not yet. Hint: ${exercise.hint}.`);
      if (next >= 2) setDone(true);
    }
  };

  const showWord = retired || done;

  return (
    <div className="echo-return">
      <p>
        <strong>Echo returns</strong> · You stumbled on “{word}” on page {pageNumber}; here it is again.
      </p>
      <p className="prose echo-return-sentence">
        {exercise.before}
        <span className="return-blank">{showWord ? word : '_____'}</span>
        {exercise.after}
      </p>
      {!showWord && (
        <div className="echo-return-controls">
          <label className="visually-hidden" htmlFor={`return-${word}`}>Recall the missing word for {word.length} letters</label>
          <input
            id={`return-${word}`}
            className="field"
            value={answer}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') check();
            }}
          />
          <button type="button" className="btn" onClick={check} disabled={!answer.trim()}>Check</button>
        </div>
      )}
      {retired && !message && <p className="end-word-meta">Mastered on an earlier return.</p>}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
