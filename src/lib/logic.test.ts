import { describe, expect, it } from 'vitest';
import { PASSAGES } from '../data/bookData';
import { completePage, continueAfterRecall, createInitialState, isAppState, recordEcho, recordEchoReturn, recordRecall } from './appState';
import { buildExercise, selectWeakWord } from './echo';
import { checkRecallAnswer } from './recall';
import { applyTyping, buildWordMap, calcAccuracy, calcWpm, createEmptyProgress, sanitizeTyped } from './typingEngine';

describe('typing engine', () => {
  const target = 'Photosynthesis grows.';
  const map = buildWordMap(target);
  it('normalizes quotes, line breaks, repeated and leading spaces and caps length', () => {
    expect(sanitizeTyped('  “A”\n\t  B', '"A" B')).toBe('"A" B');
    expect(sanitizeTyped('a  b', 'a b')).toBe('a b');
    expect(sanitizeTyped('a\nb', 'a b')).toBe('a b');
  });
  it('attributes typos, corrections and long pauses, including paste diffs', () => {
    const first = applyTyping(createEmptyProgress(), 'Photosynx', target, map, 1000).progress;
    const corrected = applyTyping(first, 'Photosyn', target, map, 1200).progress;
    expect(corrected.metrics.incorrectKeystrokes).toBe(1);
    expect(corrected.metrics.correctedErrors).toBe(1);
    expect(corrected.wordStats['0']).toEqual({ errors: 1, corrections: 1, pauses: 0 });
    const paused = applyTyping(corrected, 'Photosynth', target, map, 4000).progress;
    expect(paused.wordStats['0'].pauses).toBe(1);
    expect(applyTyping(createEmptyProgress(), target, target, map, 5000).progress.metrics.correctKeystrokes).toBe(target.length);
  });
  it('calculates accuracy and WPM safely', () => {
    expect(calcAccuracy(0, 0)).toBe(100);
    expect(calcAccuracy(99, 100)).toBe(99);
    expect(calcWpm(50, 1000)).toBe(0);
    expect(calcWpm(50, 60000)).toBe(10);
  });
});

describe('Echo and recall', () => {
  const plant = PASSAGES[0];
  it('applies the weak-word threshold and deterministic tie breaks', () => {
    const map = buildWordMap('chlorophyll photosynthesis');
    expect(selectWeakWord(plant, map, { '0': { errors: 1, corrections: 0, pauses: 0 } }, {})).toBeNull();
    expect(selectWeakWord(plant, map, {
      '0': { errors: 1, corrections: 1, pauses: 0 },
      '1': { errors: 1, corrections: 0, pauses: 1 },
    }, {})?.word).toBe('photosynthesis');
  });
  it('builds fill-in-the-blank exercises and checks plural, typo and empty answers', () => {
    expect(buildExercise(plant.text, 'photosynthesis')).toMatchObject({ answer: 'photosynthesis', hint: '14 letters, starts with “p”' });
    expect(checkRecallAnswer('The plants release oxygens.', ['oxygen'])).toBe(true);
    expect(checkRecallAnswer('photosynthesi', ['photosynthesis'])).toBe(true);
    expect(checkRecallAnswer('  ', ['oxygen'])).toBe(false);
  });
});

describe('persisted state transitions', () => {
  it('validates initial state and rejects malformed state', () => {
    expect(isAppState(createInitialState())).toBe(true);
    expect(isAppState({ phase: 'typing', pageIndex: 999 })).toBe(false);
  });
  it('completes a page, records recall, then records Echo and advances', () => {
    const passage = PASSAGES[0];
    const typing = {
      ...createInitialState(),
      phase: 'typing' as const,
      pages: { [passage.id]: { ...createEmptyProgress(), typed: passage.text, wordStats: { '0': { errors: 2, corrections: 0, pauses: 0 } } } },
    };
    const complete = completePage(typing, passage, 10);
    expect(complete.phase).toBe('recall');
    const recalled = recordRecall(complete, passage, 'oxygen', true);
    expect(recalled.recall[passage.id].correct).toBe(true);
    expect(continueAfterRecall(recalled, passage).phase).toBe('echo');
    const afterEcho = recordEcho({ ...recalled, phase: 'echo' }, passage, { word: 'photosynthesis', solved: true, attempts: 1, revealed: false });
    expect(afterEcho.pageIndex).toBe(1);
    expect(afterEcho.phase).toBe('typing');
    expect(recordEchoReturn(afterEcho, 'photosynthesis', true).weakWords.photosynthesis.returnSolved).toBe(true);
  });
});

describe('Echo returns', () => {
  const withWord = (extra: Partial<{ returnAttempts: number; returnSolved: boolean }> = {}) => ({
    ...createInitialState(),
    weakWords: { photosynthesis: { score: 5, pages: ['plants'], reviewed: true, ...extra } },
  });
  it('retires a word on a first-try success', () => {
    const next = recordEchoReturn(withWord(), 'photosynthesis', true);
    expect(next.weakWords.photosynthesis.returnSolved).toBe(true);
    expect(next.weakWords.photosynthesis.returnAttempts).toBe(1);
  });
  it('keeps a word shaky after a miss and ignores unknown or already retired words', () => {
    const missed = recordEchoReturn(withWord(), 'photosynthesis', false);
    expect(missed.weakWords.photosynthesis.returnSolved).toBe(false);
    expect(recordEchoReturn(missed, 'unknown', true)).toBe(missed);
    const retired = recordEchoReturn(withWord(), 'photosynthesis', true);
    expect(recordEchoReturn(retired, 'photosynthesis', false)).toBe(retired);
  });
});

describe('book content integrity', () => {
  it('has 4 to 6 single-spaced, plain-ASCII passages with unique ids', () => {
    expect(PASSAGES.length).toBeGreaterThanOrEqual(4);
    expect(PASSAGES.length).toBeLessThanOrEqual(6);
    expect(new Set(PASSAGES.map((p) => p.id)).size).toBe(PASSAGES.length);
    for (const p of PASSAGES) {
      expect(/^[\x20-\x7E]+$/.test(p.text)).toBe(true);
      expect(p.text.includes('  ')).toBe(false);
      expect(p.text.trim()).toBe(p.text);
    }
  });
  it('gives every question a grounded concept, accepted keywords and a model answer that passes its own check', () => {
    for (const p of PASSAGES) {
      expect(new RegExp(`\\b${p.question.concept}\\b`, 'i').test(p.text)).toBe(true);
      expect(buildExercise(p.text, p.question.concept)).not.toBeNull();
      expect(p.question.accepted.length).toBeGreaterThan(0);
      expect(checkRecallAnswer(p.question.modelAnswer, p.question.accepted)).toBe(true);
      expect(checkRecallAnswer('I have no idea', p.question.accepted)).toBe(false);
      for (const concept of p.concepts) expect(new RegExp(concept, 'i').test(p.text)).toBe(true);
    }
  });
  it('accepts reasonable paraphrases for the pollination question', () => {
    const pollination = PASSAGES.find((p) => p.id === 'pollination');
    expect(checkRecallAnswer('By carrying pollen between flowers', pollination?.question.accepted ?? [])).toBe(true);
    expect(checkRecallAnswer('It carries pollen to another flower', pollination?.question.accepted ?? [])).toBe(true);
  });
});

describe('saved-state validation', () => {
  it('rejects an echo phase with no Echo plan and a recall phase for an unfinished page', () => {
    const base = createInitialState();
    expect(isAppState({ ...base, phase: 'recall' })).toBe(false);
    expect(isAppState({ ...base, phase: 'echo' })).toBe(false);
    expect(isAppState({ ...base, phase: 'finished' })).toBe(true);
  });
});
