import type {
  PageMetrics,
  PageProgress,
  PageStats,
  TypingResult,
  WordMap,
  WordStat,
  WordToken,
} from '../types';

/** After this long without a keystroke the active timer stops counting. */
export const IDLE_MS = 5000;
/** A gap longer than this before a character counts as a hesitation on that word. */
export const HESITATION_MS = 2500;
/** Gaps longer than this mean the learner walked away; not a hesitation. */
export const AWAY_MS = 10000;

export function createEmptyMetrics(): PageMetrics {
  return {
    totalTyped: 0,
    correctKeystrokes: 0,
    incorrectKeystrokes: 0,
    correctedErrors: 0,
    activeMs: 0,
    lastKeyAt: null,
  };
}

export function createEmptyProgress(): PageProgress {
  return {
    typed: '',
    metrics: createEmptyMetrics(),
    wordStats: {},
    weak: null,
    echo: null,
    completedAt: null,
  };
}

/**
 * Normalises harmless differences so the app never feels unfair:
 * curly quotes/dashes become plain ones, line breaks and tabs become spaces,
 * runs of spaces collapse, leading space is dropped, and input is capped
 * at the target length.
 */
export function sanitizeTyped(raw: string, target: string): string {
  const cleaned = raw
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/^ +/, '');
  return cleaned.slice(0, target.length);
}

export function buildWordMap(text: string): WordMap {
  const words: WordToken[] = [];
  const charToWord: number[] = new Array<number>(text.length).fill(0);
  const re = /\S+/g;
  let match: RegExpExecArray | null = re.exec(text);
  while (match !== null) {
    words.push({ text: match[0], start: match.index, end: match.index + match[0].length });
    match = re.exec(text);
  }
  words.forEach((word, index) => {
    for (let i = word.start; i < word.end; i++) charToWord[i] = index;
    if (word.end < text.length) charToWord[word.end] = index;
  });
  return { words, charToWord };
}

export function countCorrect(typed: string, target: string): number {
  let n = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) n++;
  return n;
}

export function countWrong(typed: string, target: string): number {
  return typed.length - countCorrect(typed, target);
}

export function isComplete(typed: string, target: string): boolean {
  return typed === target;
}

/** Keystroke accuracy. Only a flawless run shows 100%, so one typo never rounds away. */
export function calcAccuracy(correct: number, total: number): number {
  if (total === 0 || correct === total) return 100;
  return Math.min(99, Math.round((correct / total) * 100));
}

/** Standard WPM: five characters per word, measured over active typing time. */
export function calcWpm(correctChars: number, activeMs: number): number {
  if (activeMs < 2000) return 0;
  return Math.round(correctChars / 5 / (activeMs / 60000));
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function summarizePage(progress: PageProgress, target: string): PageStats {
  const correct = countCorrect(progress.typed, target);
  const m = progress.metrics;
  return {
    wpm: calcWpm(correct, m.activeMs),
    accuracy: calcAccuracy(m.correctKeystrokes, m.totalTyped),
    mistakes: m.incorrectKeystrokes,
    fixed: m.correctedErrors,
    activeMs: m.activeMs,
    percent: target.length === 0 ? 0 : Math.round((correct / target.length) * 100),
  };
}

/**
 * Applies a new textarea value to the page progress. Works out what changed
 * by comparing against the previous text (so pastes, autocorrect and
 * selections are all handled), and updates every metric.
 */
export function applyTyping(
  prev: PageProgress,
  raw: string,
  target: string,
  map: WordMap,
  now: number,
): TypingResult {
  let next = sanitizeTyped(raw, target);
  const before = prev.typed;
  if (next === before) {
    return { progress: prev, changed: false, addedCorrect: 0, addedIncorrect: 0, complete: next === target };
  }

  let common = 0;
  const limit = Math.min(before.length, next.length);
  while (common < limit && before[common] === next[common]) common++;

  const existingError = before.split('').findIndex((char, index) => char !== target[index]);
  if (existingError !== -1 && next !== before.slice(0, -1)) {
    return { progress: prev, changed: false, addedCorrect: 0, addedIncorrect: 0, complete: false };
  }

  for (let i = common; i < next.length; i++) {
    if (next[i] !== target[i]) {
      next = next.slice(0, i + 1);
      break;
    }
  }

  const metrics: PageMetrics = { ...prev.metrics };
  const wordStats: Record<string, WordStat> = { ...prev.wordStats };
  const bump = (wordIndex: number, key: keyof WordStat): void => {
    const k = String(wordIndex);
    const current = wordStats[k] ?? { errors: 0, corrections: 0, pauses: 0 };
    wordStats[k] = { ...current, [key]: current[key] + 1 };
  };

  // Timing: only count gaps up to the idle limit; log hesitations per word.
  if (metrics.lastKeyAt !== null) {
    const gap = now - metrics.lastKeyAt;
    if (gap <= IDLE_MS) metrics.activeMs += gap;
    if (next.length > before.length && gap > HESITATION_MS && gap <= AWAY_MS && common < target.length) {
      bump(map.charToWord[common], 'pauses');
    }
  }
  metrics.lastKeyAt = now;

  // Removed characters: erasing a wrong character counts as a corrected error.
  for (let j = common; j < before.length; j++) {
    if (before[j] !== target[j]) {
      metrics.correctedErrors++;
      bump(map.charToWord[j], 'corrections');
    }
  }

  // Added characters.
  let addedCorrect = 0;
  let addedIncorrect = 0;
  for (let i = common; i < next.length; i++) {
    metrics.totalTyped++;
    if (next[i] === target[i]) {
      metrics.correctKeystrokes++;
      addedCorrect++;
    } else {
      metrics.incorrectKeystrokes++;
      addedIncorrect++;
      bump(map.charToWord[i], 'errors');
    }
  }

  return {
    progress: { ...prev, typed: next, metrics, wordStats },
    changed: true,
    addedCorrect,
    addedIncorrect,
    complete: next === target,
  };
}
