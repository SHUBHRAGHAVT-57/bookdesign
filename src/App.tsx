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
import AssistantPanel from './components/BookAssistantPanel';

const RAKHU_AVATAR = 'data:image/jpeg;base64,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';

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
  const [assistantOpen, setAssistantOpen] = useState(false);
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
    if (phase !== 'typing' || transition !== 'idle' || reviewIndex !== null || demoTyping || assistantOpen) return;
    // TypingPage rejects incorrect keys before they enter this controlled value.
    // Keep the engine focused on accepted characters and existing progress.
    const result = applyTyping(progress, raw, passage.text, wordMap, Date.now());
    if (!result.changed) return;
    setState((s) => ({ ...s, pages: { ...s.pages, [passage.id]: result.progress } }));
    if (result.addedIncorrect > 0) play('error');
    else if (result.addedCorrect > 0) play('key');
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
  const typingActive = phase === 'typing' && transition === 'idle' && reviewIndex === null && !assistantOpen;
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
                  disabled={phase !== 'typing' || transition !== 'idle' || reviewIndex !== null || demoTyping || assistantOpen || !isLeftActive}
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
                    disabled={phase !== 'typing' || transition !== 'idle' || reviewIndex !== null || demoTyping || assistantOpen || isLeftActive}
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

      {showBook && (
        <>
          <button
            type="button"
            className="assistant-fab"
            aria-label={assistantOpen ? 'Close AI assistant' : 'Open AI assistant'}
            aria-expanded={assistantOpen}
            onClick={() => {
              if (!assistantOpen) {
                // Exclude time spent chatting from the next keystroke's active-time gap.
                setState((s) => ({
                  ...s,
                  pages: {
                    ...s.pages,
                    [passage.id]: {
                      ...(s.pages[passage.id] ?? createEmptyProgress()),
                      metrics: { ...(s.pages[passage.id] ?? createEmptyProgress()).metrics, lastKeyAt: null },
                    },
                  },
                }));
              }
              setAssistantOpen((open) => !open);
            }}
          >{assistantOpen ? '×' : <img src={RAKHU_AVATAR} alt="" />}</button>
          {assistantOpen && (
            <AssistantPanel
              bookTitle={customBook?.title ?? 'Small Wonders'}
              passage={passage}
              pageNumber={displayIndex + 1}
              onClose={() => setAssistantOpen(false)}
            />
          )}
        </>
      )}

      {confirmingReset && <ConfirmDialog onConfirm={confirmReset} onCancel={() => setConfirmingReset(false)} />}
    </div>
  );
}
