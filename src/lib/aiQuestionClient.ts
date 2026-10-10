import type { Passage, RecallQuestion } from '../types';

type GeneratedQuestion = { id: string; question: RecallQuestion };
type ApiResponse = { questions?: unknown; error?: unknown };

function isQuestion(value: unknown): value is Omit<RecallQuestion, 'type'> & { type: RecallQuestion['type'] } {
  if (typeof value !== 'object' || value === null) return false;
  const question = value as Record<string, unknown>;
  return (
    (question.type === 'comprehension' || question.type === 'recall' || question.type === 'vocabulary') &&
    typeof question.prompt === 'string' &&
    Array.isArray(question.accepted) &&
    question.accepted.length > 0 &&
    question.accepted.every((answer) => typeof answer === 'string') &&
    typeof question.modelAnswer === 'string' &&
    typeof question.concept === 'string'
  );
}

/** Calls the optional server-side AI endpoint in small batches; the PDF stays in the browser. */
export async function generateAiQuestions(passages: Passage[], onProgress?: (done: number, total: number) => void): Promise<Passage[]> {
  const generated: GeneratedQuestion[] = [];
  const totalBatches = Math.ceil(passages.length / 8);
  for (let start = 0; start < passages.length; start += 8) {
    const batch = passages.slice(start, start + 8);
    let response: Response;
    try {
      response = await fetch('/api/generate-questions', {
      signal: AbortSignal.timeout(25000),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passages: batch.map(({ id, text, concepts }) => ({ id, text, concepts })),
      }),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new Error('Gemini took too long to answer. Your local questions are safe; try again later or continue without AI.');
      }
      throw new Error('Could not reach Gemini. Your local questions are safe; check your connection or try again later.');
    }

    let payload: ApiResponse;
    try {
      payload = await response.json() as ApiResponse;
    } catch {
      throw new Error('The AI service returned an unreadable response. Your local questions are unchanged.');
    }
    if (!response.ok) {
      throw new Error(typeof payload.error === 'string' ? payload.error : 'AI question generation failed. Your local questions are unchanged.');
    }
    if (!Array.isArray(payload.questions)) {
      throw new Error('The AI service returned an invalid question set. Your local questions are unchanged.');
    }
    for (const item of payload.questions) {
      if (typeof item !== 'object' || item === null) continue;
      const value = item as Record<string, unknown>;
      const passageId = value['id'];
      if (typeof passageId === 'string' && isQuestion(value)) {
        generated.push({
          id: passageId,
          question: {
            type: value.type,
            prompt: value.prompt,
            accepted: value.accepted as string[],
            modelAnswer: value.modelAnswer,
            concept: value.concept,
          },
        });
      }
    }
    onProgress?.(Math.min(start + batch.length, passages.length) / 8 > totalBatches ? totalBatches : Math.ceil((start + batch.length) / 8), totalBatches);
    if (generated.length !== start + batch.length) {
      throw new Error('The AI service did not return a question for every passage. Your local questions are unchanged.');
    }
  }

  const byId = new Map(generated.map((item) => [item.id, item.question]));
  return passages.map((passage) => {
    const question = byId.get(passage.id);
    return question ? { ...passage, question } : passage;
  });
}
