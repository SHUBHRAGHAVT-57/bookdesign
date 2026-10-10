// ---------- Book content ----------
export interface RecallQuestion {
  /** Question category used for custom-book practice. Demo-book questions may omit it. */
  type?: 'comprehension' | 'recall' | 'vocabulary';
  prompt: string;
  /** Keywords / short phrases; an answer containing any of them counts as correct. */
  accepted: string[];
  modelAnswer: string;
  /** A word from the passage used for Echo Review if the answer was missed. */
  concept: string;
}

export interface Passage {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  title: string;
  text: string;
  concepts: string[];
  question: RecallQuestion;
}

export interface BookInfo {
  title: string;
  subtitle: string;
  edition: string;
}

// ---------- Flow ----------
export type Phase = 'onboarding' | 'typing' | 'recall' | 'echo' | 'finished';
export type Transition = 'idle' | 'success' | 'turning';

export interface Settings {
  sound: boolean;
  reducedMotion: boolean;
}

// ---------- Typing ----------
export interface WordToken {
  text: string;
  start: number;
  /** Exclusive end index (the space after the word is at `end`). */
  end: number;
}

export interface WordMap {
  words: WordToken[];
  /** Character index -> word index (a space belongs to the word before it). */
  charToWord: number[];
}

export interface WordStat {
  errors: number;
  corrections: number;
  pauses: number;
}

export interface PageMetrics {
  totalTyped: number;
  correctKeystrokes: number;
  incorrectKeystrokes: number;
  correctedErrors: number;
  activeMs: number;
  lastKeyAt: number | null;
}

export interface WeakStats extends WordStat {
  score: number;
}

export interface WeakCandidate {
  word: string;
  reason: string;
  stats: WeakStats;
}

export interface EchoPlan {
  word: string;
  source: 'typing' | 'recall';
  reason: string;
  stats: WeakStats | null;
}

export interface PageProgress {
  typed: string;
  metrics: PageMetrics;
  /** Keyed by word index (as a string, so it survives JSON). */
  wordStats: Record<string, WordStat>;
  weak: WeakCandidate | null;
  echo: EchoPlan | null;
  completedAt: number | null;
}

export interface TypingResult {
  progress: PageProgress;
  changed: boolean;
  addedCorrect: number;
  addedIncorrect: number;
  complete: boolean;
}

export interface PageStats {
  wpm: number;
  accuracy: number;
  mistakes: number;
  fixed: number;
  activeMs: number;
  percent: number;
}

// ---------- Recall & Echo ----------
export interface RecallResult {
  answer: string;
  correct: boolean;
}

export interface EchoExercise {
  before: string;
  after: string;
  answer: string;
  hint: string;
}

export interface EchoResult {
  word: string;
  solved: boolean;
  attempts: number;
  revealed: boolean;
}

export interface WeakWordRecord {
  score: number;
  pages: string[];
  reviewed: boolean;
  returnAttempts?: number;
  returnSolved?: boolean;
}

// ---------- Persisted app state ----------
export interface AppState {
  phase: Phase;
  pageIndex: number;
  pages: Record<string, PageProgress>;
  completed: string[];
  recall: Record<string, RecallResult>;
  echo: Record<string, EchoResult>;
  weakWords: Record<string, WeakWordRecord>;
  settings: Settings;
}

export interface BookSummary {
  pagesCompleted: number;
  wpm: number;
  accuracy: number;
  activeMs: number;
  mistakes: number;
  recallAnswered: number;
  recallCorrect: number;
  echoSolved: number;
}
