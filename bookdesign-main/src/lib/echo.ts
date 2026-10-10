import type {
  EchoExercise,
  Passage,
  WeakCandidate,
  WeakWordRecord,
  WordMap,
  WordStat,
} from '../types';

/** Minimum weighted score for a word to be called "weak" on a page. */
export const WEAK_THRESHOLD = 3;
/** Words scoring at least this are remembered in the cross-page history. */
const RECORD_THRESHOLD = 2;

const STOP_WORDS = new Set([
  'the', 'and', 'that', 'with', 'from', 'this', 'they', 'their', 'there', 'into', 'such',
  'which', 'when', 'while', 'then', 'than', 'have', 'has', 'was', 'were', 'are', 'for',
  'but', 'not', 'all', 'one', 'can', 'its', 'our', 'out', 'who', 'how', 'why', 'what',
  'more', 'most', 'each', 'every', 'only', 'over', 'does', 'make', 'makes', 'made', 'your',
  'you', 'will', 'would', 'could', 'been', 'being', 'also', 'some', 'others', 'back',
]);

export function cleanWord(token: string): string {
  return token.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Transparent scoring: each mistyped key is worth 2, each correction 1 and
 * each long pause 1.5 (each capped at 3 events so one disaster can't dominate).
 */
export function baseScore(stat: WordStat): number {
  return Math.min(stat.errors, 3) * 2 + Math.min(stat.corrections, 3) + Math.min(stat.pauses, 3) * 1.5;
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export function describeStruggle(stat: WordStat): string {
  const parts: string[] = [];
  if (stat.errors > 0) parts.push(plural(stat.errors, 'mistyped key', 'mistyped keys'));
  if (stat.corrections > 0) parts.push(plural(stat.corrections, 'correction', 'corrections'));
  if (stat.pauses > 0) parts.push(plural(stat.pauses, 'long pause', 'long pauses'));
  return parts.join(', ');
}

/** Merges per-position stats into per-word stats (a word may appear twice). */
export function aggregateWordStats(map: WordMap, stats: Record<string, WordStat>): Map<string, WordStat> {
  const out = new Map<string, WordStat>();
  map.words.forEach((word, index) => {
    const stat = stats[String(index)];
    if (!stat) return;
    const key = cleanWord(word.text);
    if (key.length < 3 || STOP_WORDS.has(key)) return;
    const current = out.get(key) ?? { errors: 0, corrections: 0, pauses: 0 };
    out.set(key, {
      errors: current.errors + stat.errors,
      corrections: current.corrections + stat.corrections,
      pauses: current.pauses + stat.pauses,
    });
  });
  return out;
}

export function selectWeakWord(
  passage: Passage,
  map: WordMap,
  stats: Record<string, WordStat>,
  history: Record<string, WeakWordRecord>,
): WeakCandidate | null {
  let best: { word: string; stat: WordStat; base: number; rank: number } | null = null;
  for (const [word, stat] of Array.from(aggregateWordStats(map, stats).entries())) {
    const base = baseScore(stat);
    if (base < WEAK_THRESHOLD) continue;
    // History and concept bonuses only break ties between words that already qualify.
    const rank =
      base + Math.min(2, (history[word]?.score ?? 0) * 0.25) + (passage.concepts.includes(word) ? 0.5 : 0);
    if (best === null || rank > best.rank) best = { word, stat, base, rank };
  }
  if (best === null) return null;
  return {
    word: best.word,
    reason: `You made mistakes or paused on \u201C${best.word}\u201D (${describeStruggle(best.stat)}). Let\u2019s practise it once more.`,
    stats: { ...best.stat, score: best.base },
  };
}

export function mergeWeakWords(
  history: Record<string, WeakWordRecord>,
  passageId: string,
  aggregated: Map<string, WordStat>,
): Record<string, WeakWordRecord> {
  const out: Record<string, WeakWordRecord> = { ...history };
  for (const [word, stat] of Array.from(aggregated.entries())) {
    const score = baseScore(stat);
    if (score < RECORD_THRESHOLD) continue;
    const prev = out[word];
    out[word] = {
      score: (prev?.score ?? 0) + score,
      pages: prev && prev.pages.includes(passageId) ? prev.pages : [...(prev?.pages ?? []), passageId],
      reviewed: prev?.reviewed ?? false,
    };
  }
  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Finds the first sentence containing the word and blanks that word out. */
export function buildExercise(text: string, word: string): EchoExercise | null {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
  for (const raw of sentences) {
    const sentence = raw.trim();
    const match = pattern.exec(sentence);
    if (match) {
      return {
        before: sentence.slice(0, match.index),
        after: sentence.slice(match.index + match[0].length),
        answer: word,
        hint: `${word.length} letters, starts with \u201C${word[0]}\u201D`,
      };
    }
  }
  return null;
}

export function checkEchoAnswer(input: string, word: string): boolean {
  const trimmed = input.trim();
  if (trimmed === '' || /\s/.test(trimmed)) return false;
  return cleanWord(trimmed) === word;
}
