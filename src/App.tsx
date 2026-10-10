import { useEffect, useMemo, useRef, useState } from 'react';
import { PASSAGES } from './data/bookData';
import type { Passage } from './types';
import {
  STATE_VERSION,
  STORAGE_KEY,
  completePage,
  continueAfterRecall,
  createInitialState,
  isAppState,
  recordEcho,
  recordEchoReturn,
  recordRecall,
  resetProgress,
  summarizeBook,
} from './lib/appState';
import { checkRecallAnswer } from './lib/recall';
import { playSound } from './lib/sound';
import type { SoundKind } from './lib/sound';
import { applyTyping, buildWordMap, createEmptyProgress, isComplete, summarizePage } from './lib/typingEngine';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { AppState, EchoResult, Settings, Transition } from './types';
import BookSpread from './components/BookSpread';
import ConfirmDialog from './components/ConfirmDialog';
import EchoReview from './components/EchoReview';
import FinishedBook from './components/FinishedBook';
import FlowSteps from './components/FlowSteps';
import LiveStats from './components/LiveStats';
import Onboarding from './components/Onboarding';
import RecallModal from './components/RecallModal';
import SettingsMenu from './components/SettingsMenu';
import StatsPanel from './components/StatsPanel';
import TypingPage from './components/TypingPage';

const SUCCESS_MS = 900;
const TURN_MS = 1000;

function readSavedCustomBook(): { title: string; passages: Passage[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('keyturn.custom-book');
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const book = value as { title?: unknown; passages?: unknown };
    if (typeof book.title !== 'string' || !Array.isArray(book.passages) || book.passages.length === 0) return null;
    const valid = book.passages.every((item) =>
      typeof item === 'object' && item !== null &&
      typeof (item as Passage).id === 'string' &&
      typeof (item as Passage).text === 'string' &&
      typeof (item as Passage).title === 'string' &&
      Array.isArray((item as Passage).concepts) &&
      typeof (item as Passage).question?.prompt === 'string',
    );
    return valid ? { title: book.title, passages: book.passages as Passage[] } : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [customBook, setCustomBook] = useState<{ title: string; passages: Passage[] } | null>(readSavedCustomBook);
  const passages = customBook?.passages ?? PASSAGES;
  const [state, setState] = useLocalStorage<AppState>(STORAGE_KEY, STATE_VERSION, createInitialState, (value) => isAppState(value, passages));
  const [transition, setTransition] = useState<Transition>('idle');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [demoTyping, setDemoTyping] = useState(false);
  const timers = useRef<number[]>([]);
  const sequenceRunning = useRef(false);

  const { phase, settings } = state;
  const displayIndex = reviewIndex ?? state.pageIndex;
  const passage = passages[displayIndex];
  const leftIndex = Math.floor(displayIndex / 2) * 2;
  const leftPassage = passages[leftIndex];
  const rightPassage = passages[leftIndex + 1];
  const leftProgress = state.pages[leftPassage.id] ?? createEmptyProgress();
  const rightProgress = rightPassage ? state.pages[rightPassage.id] ?? createEmptyProgress() : createEmptyProgress();
  const isLeftActive = displayIndex % 2 === 0;
  const isLastPage = state.pageIndex === passages.length - 1;
  const wordMap = useMemo(() => buildWordMap(passage.text), [passage.text]);
  const progress = state.pages[passage.id] ?? createEmptyProgress();
  const pageComplete = isComplete(progress.typed, passage.text);
  const leftMap = useMemo(() => buildWordMap(leftPassage.text), [leftPassage.text]);
  const rightMap = useMemo(() => rightPassage ? buildWordMap(rightPassage.text) : buildWordMap(''), [rightPassage?.text]);

  const play = (kind: SoundKind): void => playSound(kind, settings.sound);

  const clearTimers = (): void => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    sequenceRunning.current = false;
  };

  // Typing completion leads to recall first; page turning happens after recall/review.
  // Safe to call again after a refresh.
  const beginCompletion = (passageId: string): void => {
    if (sequenceRunning.current) return;
    sequenceRunning.current = true;
    const reduced = settings.reducedMotion;
    play('success');
    setTransition('success');
    const finish = (): void => {
      const targetIndex = passages.findIndex((p) => p.id === passageId);
      const target = passages[targetIndex];
      if (target) {
        if (targetIndex % 2 === 0 && targetIndex + 1 < passages.length) {
          setState((s) => {
            const completed = completePage(s, target, Date.now());
            return { ...completed, phase: 'typing', pageIndex: targetIndex + 1 };
          });
        } else {
          setState((s) => completePage(s, target, Date.now()));
        }
      }
      setTransition('idle');
      sequenceRunning.current = false;
    };
    timers.current.push(window.setTimeout(finish, reduced ? 600 : SUCCESS_MS));
  };

  // Hide the recall/review dialog while the current leaf turns, then advance the
  // persisted book state only after the animation has finished.
  const turnToNextPage = (finish: () => void): void => {
    if (settings.reducedMotion) {
      finish();
      return;
    }
    setTransition('turning');
    play('turn');
    timers.current.push(
      window.setTimeout(() => {
        finish();
        setTransition('idle');
      }, TURN_MS),
    );
  };

  const handleRecallContinue = (): void => {
    if (progress.echo) {
      setState((s) => continueAfterRecall(s, passage, passages));
      return;
    }
    if (settings.reducedMotion) {
      setState((s) => continueAfterRecall(s, passage, passages));
      return;
    }
    setState((s) => ({ ...s, phase: 'typing' }));
    turnToNextPage(() => {
      setState((s) => continueAfterRecall({ ...s, phase: 'recall' }, passage, passages));
    });
  };

  // If the page was refreshed right after the last character was typed, continue the sequence.
  // The cleanup also keeps React StrictMode's mount/unmount/mount cycle from stranding the timers.
  useEffect(() => {
    if (state.phase === 'typing' && pageComplete) beginCompletion(passage.id);
    return clearTimers;
  }, []);

  const handleType = (raw: string): void => {
    if (phase !== 'typing' || transition !== 'idle' || reviewIndex !== null || demoTyping) return;
    // Strict mode: when the last character is wrong, the next key replaces
    // that character instead of appending past it. This lets the learner correct
    // the typo directly; progress remains locked at the expected character.
    const lastIndex = progress.typed.length - 1;
    const hasLockedMistake = lastIndex >= 0 && progress.typed[lastIndex] !== passage.text[lastIndex];
    const nextRaw = hasLockedMistake && raw.length > progress.typed.length
      ? progress.typed.slice(0, lastIndex) + raw.slice(-1)
      : raw;
    const result = applyTyping(progress, nextRaw, passage.text, wordMap, Date.now());
    if (!result.changed) return;
    setState((s) => ({ ...s, pages: { ...s.pages, [passage.id]: result.progress } }));
    if (result.addedIncorrect > 0) {
      play('error');
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(45);
    } else if (result.addedCorrect > 0) play('key');
    if (result.complete) beginCompletion(passage.id);
  };

  const handleRecallSubmit = (answer: string): void => {
    const correct = checkRecallAnswer(answer, passage.question.accepted);
    play(correct ? 'chime' : 'error');
    setState((s) => recordRecall(s, passage, answer, correct));
  };

  const handleEchoDone = (result: EchoResult): void => {
    if (result.solved) play('chime');
    if (settings.reducedMotion) {
      setState((s) => recordEcho(s, passage, result, passages));
      return;
    }
    setState((s) => ({ ...s, phase: 'typing' }));
    turnToNextPage(() => {
      setState((s) => recordEcho({ ...s, phase: 'echo' }, passage, result, passages));
    });
  };

  const updateSettings = (next: Settings): void => setState((s) => ({ ...s, settings: next }));

  const jumpToDemoPage = (pageIndex: number): void => {
    clearTimers();
    setTransition('idle');
    setDemoTyping(false);
    setReviewIndex(null);
    setState((s) => ({ ...s, phase: 'typing', pageIndex }));
  };

  const autoTypeDemo = (charsPerSecond: number, word: string): void => {
    if (phase !== 'typing' || transition !== 'idle' || reviewIndex !== null || pageComplete || demoTyping) return;
    clearTimers();
    setDemoTyping(true);

    const target = passage.text;
    let localProgress = progress;
    let typed = localProgress.typed;
    let cursor = typed.length;
    const wordStart = target.toLowerCase().indexOf(word.toLowerCase(), cursor);
    const typoAt = wordStart >= cursor ? wordStart + Math.min(3, word.length - 1) : -1;
    const delay = Math.max(12, Math.floor(1000 / charsPerSecond));

    const applyInput = (raw: string): void => {
      const result = applyTyping(localProgress, raw, target, wordMap, Date.now());
      if (!result.changed) return;
      localProgress = result.progress;
      typed = localProgress.typed;
      setState((s) => ({ ...s, pages: { ...s.pages, [passage.id]: localProgress } }));
      if (result.addedIncorrect > 0) play('error');
      else if (result.addedCorrect > 0) play('key');
    };

    const step = (): void => {
      if (cursor >= target.length) {
        setDemoTyping(false);
        beginCompletion(passage.id);
        return;
      }
      if (cursor === typoAt) {
        const wrong = target[cursor].toLowerCase() === 'x' ? 'z' : 'x';
        const typo = target[cursor] === target[cursor].toUpperCase() ? wrong.toUpperCase() : wrong;
        applyInput(typed + typo);
        timers.current.push(window.setTimeout(() => {
          applyInput(typed.slice(0, -1));
          applyInput(typed + target[cursor]);
          cursor++;
          timers.current.push(window.setTimeout(step, delay));
        }, delay));
        return;
      }
      applyInput(typed + target[cursor]);
      cursor++;
      if (cursor >= target.length) {
        setDemoTyping(false);
        beginCompletion(passage.id);
      } else {
        timers.current.push(window.setTimeout(step, delay));
      }
    };

    step();
  };

  const confirmReset = (): void => {
    clearTimers();
    setTransition('idle');
    setDemoTyping(false);
    setConfirmingReset(false);
    setReviewIndex(null);
    setState((s) => resetProgress(s));
  };

  const startBook = (book?: { title: string; passages: Passage[] }): void => {
    setReviewIndex(null);
    setCustomBook(book ?? null);
    try {
      if (book) window.localStorage.setItem('keyturn.custom-book', JSON.stringify(book));
      else window.localStorage.removeItem('keyturn.custom-book');
    } catch {
      // The selected PDF still works for this session if browser storage is unavailable.
    }
    setState((s) => ({ ...createInitialState(), settings: s.settings, phase: 'typing', pageIndex: 0 }));
  };

  const saveBookAndProgress = (): void => {
    const payload = { format: 'keyturn-save-v1', savedAt: new Date().toISOString(), book: customBook, progress: state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeTitle = (customBook?.title ?? 'keyturn-demo').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '');
    anchor.href = url;
    anchor.download = (safeTitle || 'keyturn') + '-save.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openPdfSetup = (): void => {
    clearTimers();
    setTransition('idle');
    setDemoTyping(false);
    setReviewIndex(null);
    setState((current) => ({ ...current, phase: 'onboarding' }));
  };

  const summary = summarizeBook(state, passages);
  const showBook = phase === 'typing' || phase === 'recall' || phase === 'echo';
  const typingActive = phase === 'typing' && transition === 'idle' && reviewIndex === null;
  const demoWords = passage.concepts.filter((word) =>
    passage.text.toLowerCase().indexOf(word.toLowerCase(), progress.typed.length) >= progress.typed.length,
  );

  return (
    <div className={`app${settings.reducedMotion ? ' reduce-motion' : ''}`}>
      <a className="skip-link" href="#main">Skip to the book</a>

      <header className="app-header">
        <div className="brand">
          <h1 className="brand-name">KeyTurn</h1>{customBook && <p className="brand-tag">Practising: {customBook.title}</p>}
          <p className="brand-tag">Your Personal Memory Edition</p>
        </div>
        <FlowSteps phase={phase} />
        {showBook && <div className="header-actions">{customBook && <button type="button" className="btn" onClick={saveBookAndProgress}>Save book &amp; progress</button>}<button type="button" className="btn" onClick={openPdfSetup}>{customBook ? 'PDF / AI options' : 'Choose a PDF'}</button></div>}
        <SettingsMenu
          settings={settings}
          onChange={updateSettings}
          onReset={() => setConfirmingReset(true)}
          pageIndex={state.pageIndex}
          pageCount={passages.length}
          demoWords={demoWords}
          demoTyping={demoTyping}
          onDemoJump={jumpToDemoPage}
          onDemoType={autoTypeDemo}
        />
      </header>

      <main id="main" className="app-main" tabIndex={-1}>
        {phase === 'onboarding' && <Onboarding initialBook={customBook} onStart={startBook} />}

        {showBook && (
          <>
            <LiveStats
              page={summarizePage(progress, passage.text)}
              pageNumber={displayIndex + 1}
              totalPages={passages.length}
              lastKeyAt={progress.metrics.lastKeyAt}
              typingActive={typingActive}
            />
            {phase === 'typing' && state.completed.length > 0 && (
              <nav className="page-history" aria-label="Completed pages">
                <span>Look back through your ink:</span>
                {state.completed.map((id) => {
                  const index = passages.findIndex((item) => item.id === id);
                  return (
                    <button
                      type="button"
                      className="btn"
                      key={id}
                      aria-pressed={reviewIndex === index}
                      onClick={() => setReviewIndex(index)}
                    >
                      Page {index + 1}
                    </button>
                  );
                })}
                {reviewIndex !== null && (
                  <button type="button" className="btn btn-primary" onClick={() => setReviewIndex(null)}>
                    Return to current page
                  </button>
                )}
              </nav>
            )}
            <BookSpread
              key={`${leftPassage.id}-${rightPassage?.id ?? 'blank'}`}
              leftChapterLabel={`Chapter ${leftPassage.chapterNumber} · ${leftPassage.chapterTitle}`}
              rightChapterLabel={rightPassage ? `Chapter ${rightPassage.chapterNumber} · ${rightPassage.chapterTitle}` : 'End of book'}
              leftTitle={leftPassage.title}
              rightTitle={rightPassage?.title ?? 'The End'}
              leftPageNumber={leftIndex * 2 + 2}
              rightPageNumber={leftIndex * 2 + 3}
              leafText={passage.text}
              turning={transition === 'turning'}
              complete={pageComplete}
              source={
                <TypingPage
                  passageId={leftPassage.id}
                  target={leftPassage.text}
                  map={leftMap}
                  typed={leftProgress.typed}
                  disabled={phase !== 'typing' || transition !== 'idle' || reviewIndex !== null || demoTyping || !isLeftActive}
                  complete={isComplete(leftProgress.typed, leftPassage.text)}
                  ariaLabel="Type the passage on the left page"
                  onType={handleType}
                />
              }
              memory={
                rightPassage ? (
                  <TypingPage
                    passageId={rightPassage.id}
                    target={rightPassage.text}
                    map={rightMap}
                    typed={rightProgress.typed}
                    disabled={phase !== 'typing' || transition !== 'idle' || reviewIndex !== null || demoTyping || isLeftActive}
                    complete={isComplete(rightProgress.typed, rightPassage.text)}
                    ariaLabel="Type the passage on the right page"
                    onType={handleType}
                  />
                ) : <p className="prose">You have reached the end of Small Wonders.</p>
              }
            />
            <StatsPanel book={summary} totalPages={passages.length} />
          </>
        )}

        {phase === 'finished' && (
          <FinishedBook
            state={state}
            summary={summary}
            onRestart={() => setConfirmingReset(true)}
            onEchoReturn={(word, solved) => setState((s) => recordEchoReturn(s, word, solved))}
          />
        )}

        {transition === 'success' && (
          <p className="toast" aria-hidden="true">
            Page complete. Every line is now ink.
          </p>
        )}
      </main>

      {phase === 'recall' && (
        <RecallModal
          key={passage.id}
          passage={passage}
          result={state.recall[passage.id]}
          echoPlan={progress.echo}
          isLast={isLastPage}
          onSubmit={handleRecallSubmit}
          onContinue={handleRecallContinue}
        />
      )}

      {phase === 'echo' && progress.echo && (
        <EchoReview
          key={passage.id}
          passage={passage}
          plan={progress.echo}
          isLast={isLastPage}
          onDone={handleEchoDone}
        />
      )}

      {confirmingReset && <ConfirmDialog onConfirm={confirmReset} onCancel={() => setConfirmingReset(false)} />}
    </div>
  );
}
