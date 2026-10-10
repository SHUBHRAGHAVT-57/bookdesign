import { describe, expect, it } from 'vitest';
import type { Passage } from '../types';
import { generateLocalQuestions } from './questionGenerator';

function passage(id: string, text: string): Passage {
  return {
    id,
    chapterNumber: 1,
    chapterTitle: 'Uploaded PDF',
    title: 'Test passage',
    text,
    concepts: ['photosynthesis', 'chlorophyll', 'glucose', 'plants'],
    question: {
      prompt: 'Placeholder',
      accepted: ['photosynthesis'],
      modelAnswer: 'photosynthesis',
      concept: 'photosynthesis',
    },
  };
}

describe('generateLocalQuestions', () => {
  it('creates comprehension, recall, and vocabulary questions without a remote service', () => {
    const input = [
      passage('one', 'Photosynthesis allows plants to convert sunlight into energy.'),
      passage('two', 'Chlorophyll absorbs light that plants use during photosynthesis.'),
      passage('three', 'Glucose stores chemical energy produced by photosynthesis.'),
    ];
    const result = generateLocalQuestions(input);

    expect(result.map((item) => item.question.type)).toEqual(['comprehension', 'recall', 'vocabulary']);
    expect(result.every((item) => item.question.prompt.length > 0)).toBe(true);
    expect(result.every((item) => item.question.accepted.length > 0)).toBe(true);
    expect(result.every((item) => item.question.modelAnswer.length > 0)).toBe(true);
    expect(result.map((item) => item.id)).toEqual(input.map((item) => item.id));
  });

  it('keeps the original passages unchanged', () => {
    const input = [passage('one', 'Photosynthesis allows plants to convert sunlight into energy.')];
    const originalQuestion = input[0].question;
    const result = generateLocalQuestions(input);

    expect(input[0].question).toBe(originalQuestion);
    expect(result[0]).not.toBe(input[0]);
  });
});
