import { describe, expect, it } from 'vitest';
import { createInitialState, isAppState } from './appState';
import { createEmptyProgress } from './typingEngine';
import { PASSAGES } from '../data/bookData';

describe('persisted state boundary', () => {
  const id = PASSAGES[0].id;
  it.each([
    { recall: { [id]: null } },
    { echo: { [id]: null } },
    { weakWords: { plant: null } },
    { weakWords: { plant: { score: 1, pages: null, reviewed: false } } },
    { pages: { [id]: { ...createEmptyProgress(), wordStats: { '0': null } } } },
    { pages: { [id]: { ...createEmptyProgress(), weak: { word: 'plant' } } } },
    { pages: { [id]: { ...createEmptyProgress(), echo: { word: 42 } } } },
    { pages: { [id]: { ...createEmptyProgress(), metrics: { ...createEmptyProgress().metrics, activeMs: -1 } } } },
    { completed: [null] },
  ])('rejects invalid nested saved values: %j', (partial) => {
    expect(isAppState({ ...createInitialState(), ...partial })).toBe(false);
  });

  it('keeps a valid v1 save including optional memory-round fields', () => {
    expect(isAppState({
      ...createInitialState(),
      pages: { [id]: createEmptyProgress() },
      weakWords: { plant: { score: 4, pages: [id], reviewed: false } },
      recall: { [id]: { answer: 'oxygen', correct: true } },
      echo: { [id]: { word: 'plant', solved: true, attempts: 1, revealed: false } },
    })).toBe(true);
  });
});
