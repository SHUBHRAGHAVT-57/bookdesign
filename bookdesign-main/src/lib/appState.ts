import { PASSAGES } from '../data/bookData';
import type {
  AppState,
  BookSummary,
  EchoPlan,
  EchoResult,
  Passage,
  Phase,
} from '../types';
import { aggregateWordStats, mergeWeakWords, selectWeakWord } from './echo';
import { buildWordMap, calcAccuracy, calcWpm, countCorrect, createEmptyProgress } from './typingEngine';

export const STORAGE_KEY = 'keyturn.memory-edition';
export const STATE_VERSION = 1;

const PHASES: Phase[] = ['onboarding', 'typing', 'recall', 'echo', 'finished'];

export function createInitialState(): AppState {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    phase: 'onboarding',
    pageIndex: 0,
    pages: {},
    completed: [],
    recall: {},
    echo: {},
    weakWords: {},
    settings: { sound: false, reducedMotion: prefersReducedMotion },
  };
}

/** Wipes progress but keeps the learner's sound / motion settings. */
export function resetProgress(state: AppState): AppState {
  return { ...createInitialState(), settings: state.settings };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isProgress(value: unknown): boolean {
  if (!isRecord(value) || typeof value.typed !== 'string' || !isRecord(value.metrics) || !isRecord(value.wordStats)) {
    return false;
  }
  const m = value.metrics;
  return (
    isNumber(m.totalTyped) &&
    isNumber(m.correctKeystrokes) &&
    isNumber(m.incorrectKeystrokes) &&
    isNumber(m.correctedErrors) &&
    isNumber(m.activeMs) &&
    (m.lastKeyAt === null || isNumber(m.lastKeyAt))
  );
}

/** Defensive check so a stale or hand-edited save can never crash the app. */
export function isAppState(value: unknown): value is AppState {
  if (!isRecord(value)) return false;
  if (typeof value.phase !== 'string' || !PHASES.includes(value.phase as Phase)) return false;
  if (!isNumber(value.pageIndex) || !Number.isInteger(value.pageIndex)) return false;
  if (value.pageIndex < 0 || value.pageIndex >= PASSAGES.length) return false;
  if (!isRecord(value.pages) || !Array.isArray(value.completed)) return false;
  if (!isRecord(value.recall) || !isRecord(value.echo) || !isRecord(value.weakWords)) return false;
  if (!isRecord(value.settings)) return false;
  if (typeof value.settings.sound !== 'boolean' || typeof value.settings.reducedMotion !== 'boolean') return false;
  if (!Object.values(value.pages).every(isProgress)) return false;

  const passage = PASSAGES[value.pageIndex];
  const page = value.pages[passage.id] as { typed?: string; echo?: unknown } | undefined;
  if ((value.phase === 'recall' || value.phase === 'echo') && page?.typed !== passage.text) return false;
  if (value.phase === 'echo' && !page?.echo) return false;
  return true;
}

function advance(state: AppState): AppState {
  const next = state.pageIndex + 1;
  if (next < PASSAGES.length) return { ...state, phase: 'typing', pageIndex: next };
  return { ...state, phase: 'finished' };
}

/** Typing finished: lock the page, find the weak word, remember struggles. */
export function completePage(state: AppState, passage: Passage, now: number): AppState {
  if (state.phase !== 'typing') return state;
  const progress = state.pages[passage.id];
  if (!progress || progress.typed !== passage.text) return state;

  const map = buildWordMap(passage.text);
  const weak = selectWeakWord(passage, map, progress.wordStats, state.weakWords);
  const aggregated = aggregateWordStats(map, progress.wordStats);
  return {
    ...state,
    phase: 'recall',
    completed: state.completed.includes(passage.id) ? state.completed : [...state.completed, passage.id],
    weakWords: mergeWeakWords(state.weakWords, passage.id, aggregated),
    pages: { ...state.pages, [passage.id]: { ...progress, weak, completedAt: now } },
  };
}

/** Saves the recall answer and decides whether an Echo Review is needed. */
export function recordRecall(state: AppState, passage: Passage, answer: string, correct: boolean): AppState {
  const progress = state.pages[passage.id];
  if (state.phase !== 'recall' || !progress || state.recall[passage.id]) return state;

  let echo: EchoPlan | null = null;
  if (progress.weak) {
    echo = { word: progress.weak.word, source: 'typing', reason: progress.weak.reason, stats: progress.weak.stats };
  } else if (!correct) {
    const word = passage.question.concept;
    echo = {
      word,
      source: 'recall',
      reason: `You missed the recall question, so let\u2019s rehearse its key word \u201C${word}\u201D once more.`,
      stats: null,
    };
  }
  return {
    ...state,
    recall: { ...state.recall, [passage.id]: { answer, correct } },
    pages: { ...state.pages, [passage.id]: { ...progress, echo } },
  };
}

export function continueAfterRecall(state: AppState, passage: Passage): AppState {
  if (state.phase !== 'recall' || !state.recall[passage.id]) return state;
  return state.pages[passage.id]?.echo ? { ...state, phase: 'echo' } : advance(state);
}

export function recordEcho(state: AppState, passage: Passage, result: EchoResult): AppState {
  if (state.phase !== 'echo') return state;
  const prev = state.weakWords[result.word];
  const weakWords = {
    ...state.weakWords,
    [result.word]: {
      score: prev?.score ?? 0,
      pages: prev?.pages ?? [passage.id],
      reviewed: result.solved || (prev?.reviewed ?? false),
    },
  };
  return advance({ ...state, echo: { ...state.echo, [passage.id]: result }, weakWords });
}

/** Records the final Memory Round. A first-try return retires a word; otherwise it stays shaky. */
export function recordEchoReturn(state: AppState, word: string, solved: boolean): AppState {
  const previous = state.weakWords[word];
  if (!previous || previous.returnSolved) return state;
  return {
    ...state,
    weakWords: {
      ...state.weakWords,
      [word]: {
        ...previous,
        returnAttempts: (previous.returnAttempts ?? 0) + 1,
        returnSolved: solved,
      },
    },
  };
}

export function summarizeBook(state: AppState): BookSummary {
  let correctChars = 0;
  let activeMs = 0;
  let correctKeys = 0;
  let totalKeys = 0;
  let mistakes = 0;
  for (const passage of PASSAGES) {
    const progress = state.pages[passage.id] ?? createEmptyProgress();
    correctChars += countCorrect(progress.typed, passage.text);
    activeMs += progress.metrics.activeMs;
    correctKeys += progress.metrics.correctKeystrokes;
    totalKeys += progress.metrics.totalTyped;
    mistakes += progress.metrics.incorrectKeystrokes;
  }
  const answers = Object.values(state.recall);
  return {
    pagesCompleted: state.completed.length,
    wpm: calcWpm(correctChars, activeMs),
    accuracy: calcAccuracy(correctKeys, totalKeys),
    activeMs,
    mistakes,
    recallAnswered: answers.length,
    recallCorrect: answers.filter((a) => a.correct).length,
    echoSolved: Object.values(state.echo).filter((e) => e.solved).length,
  };
}
