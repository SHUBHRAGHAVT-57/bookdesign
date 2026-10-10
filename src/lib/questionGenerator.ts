import type { Passage, RecallQuestion } from '../types';

export type QuestionKind = 'comprehension' | 'recall' | 'vocabulary';

const QUESTION_KINDS: QuestionKind[] = ['comprehension', 'recall', 'vocabulary'];

function sentencesOf(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Deterministic, local-only question generation. No passage text leaves the browser. */
export function generateLocalQuestions(passages: Passage[]): Passage[] {
  return passages.map((passage, index) => {
    const kind = QUESTION_KINDS[index % QUESTION_KINDS.length];
    const sentences = sentencesOf(passage.text);
    const keyTerms = [...new Set(passage.concepts)]
      .filter((term) => term.length >= 4)
      .sort((a, b) => b.length - a.length);
    const vocabularyTerm = keyTerms.find((term) =>
      passage.text.toLowerCase().includes(term.toLowerCase()),
    ) ?? keyTerms[0] ?? 'concept';
    const definitionSentence = sentences.find((sentence) =>
      sentence.toLowerCase().includes(vocabularyTerm.toLowerCase()),
    ) ?? sentences[0] ?? passage.text;
    const fallbackConcept = keyTerms[0] ?? 'passage';

    let question: RecallQuestion;
    if (kind === 'comprehension') {
      const concepts = keyTerms.slice(0, 4);
      question = {
        type: kind,
        prompt: 'What is the main idea of this passage?',
        accepted: concepts.length ? concepts : [fallbackConcept],
        modelAnswer: sentences[0] ?? passage.text,
        concept: fallbackConcept,
      };
    } else if (kind === 'vocabulary') {
      question = {
        type: kind,
        prompt: `Which term matches this description: ${definitionSentence}`,
        accepted: [vocabularyTerm],
        modelAnswer: `“${vocabularyTerm}” is an important term in this passage. Context: ${definitionSentence}`,
        concept: vocabularyTerm,
      };
    } else {
      question = {
        type: kind,
        prompt: 'Name one key concept mentioned in this passage.',
        accepted: keyTerms.slice(0, 4).length ? keyTerms.slice(0, 4) : [fallbackConcept],
        modelAnswer: `Key concepts include ${(keyTerms.slice(0, 3).length ? keyTerms.slice(0, 3) : [fallbackConcept]).join(', ')}.`,
        concept: fallbackConcept,
      };
    }

    return { ...passage, question };
  });
}
