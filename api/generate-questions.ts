type QuestionKind = 'comprehension' | 'recall' | 'vocabulary';
type InputPassage = { id: string; text: string; concepts?: string[] };
type GeneratedQuestion = {
  id: string;
  type: QuestionKind;
  prompt: string;
  accepted: string[];
  modelAnswer: string;
  concept: string;
};

type ApiRequest = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBody(body: unknown): unknown {
  if (typeof body !== 'string') return body;
  try { return JSON.parse(body) as unknown; } catch { return null; }
}

function validateQuestions(value: unknown, ids: Set<string>): GeneratedQuestion[] {
  if (!Array.isArray(value)) throw new Error('The question service returned an invalid response.');
  return value.flatMap((item): GeneratedQuestion[] => {
    if (!isRecord(item) || typeof item.id !== 'string' || !ids.has(item.id)) return [];
    const type = item.type;
    const accepted = Array.isArray(item.accepted)
      ? item.accepted.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0).slice(0, 8)
      : [];
    if (
      (type !== 'comprehension' && type !== 'recall' && type !== 'vocabulary') ||
      typeof item.prompt !== 'string' || item.prompt.length > 240 ||
      typeof item.modelAnswer !== 'string' || item.modelAnswer.length > 900 ||
      typeof item.concept !== 'string' || item.concept.length > 80 ||
      accepted.length === 0
    ) return [];
    return [{ id: item.id, type, prompt: item.prompt, accepted, modelAnswer: item.modelAnswer, concept: item.concept }];
  });
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Use POST to generate questions.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'AI questions are not configured yet. Local questions still work.' });
    return;
  }

  const body = parseBody(req.body);
  const passages = isRecord(body) && Array.isArray(body.passages) ? body.passages : null;
  if (!passages || passages.length < 1 || passages.length > 8) {
    res.status(400).json({ error: 'Send between 1 and 8 passages per request.' });
    return;
  }

  const validPassages: InputPassage[] = [];
  for (const item of passages) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.text !== 'string' ||
      item.text.length < 35 || item.text.length > 1400) {
      res.status(400).json({ error: 'A passage was missing text or exceeded the allowed size.' });
      return;
    }
    validPassages.push({
      id: item.id,
      text: item.text,
      concepts: Array.isArray(item.concepts)
        ? item.concepts.filter((term): term is string => typeof term === 'string').slice(0, 12)
        : [],
    });
  }

  const prompt = [
    'Create exactly one useful study question for each supplied passage.',
    'Use only facts explicitly supported by the passage. Do not invent facts.',
    'Use a mix of comprehension, recall, and vocabulary questions across the batch.',
    'Questions should be answerable briefly without looking at the passage.',
    'Return ONLY JSON matching this shape: {"questions":[{"id":"same id","type":"comprehension|recall|vocabulary","prompt":"...","accepted":["short answer or equivalent phrase"],"modelAnswer":"brief answer grounded in text","concept":"one key word"}]}.',
    'Include 1 to 5 accepted answers or equivalent phrases. Keep modelAnswer under 80 words.',
    JSON.stringify(validPassages),
  ].join('\n\n');

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
    if (!response.ok) {
      res.status(response.status === 429 ? 429 : 502).json({
        error: response.status === 429
          ? 'The AI question service is busy or rate-limited. Try again later.'
          : 'The AI question service could not complete this request. Local questions are still available.',
      });
      return;
    }
    const payload: unknown = await response.json();
    if (!isRecord(payload) || !Array.isArray(payload.candidates)) throw new Error('Invalid AI response.');
    const first = payload.candidates[0];
    if (!isRecord(first) || !isRecord(first.content) || !Array.isArray(first.content.parts)) {
      throw new Error('The AI response did not contain questions.');
    }
    const text = first.content.parts
      .filter((part): part is Record<string, unknown> => isRecord(part) && typeof part.text === 'string')
      .map((part) => part.text as string)
      .join('\n');
    const parsed: unknown = JSON.parse(text);
    const rawQuestions = isRecord(parsed) ? parsed.questions : null;
    const questions = validateQuestions(rawQuestions, new Set(validPassages.map((passage) => passage.id)));
    if (questions.length !== validPassages.length) throw new Error('The AI response did not include a valid question for every passage.');
    res.status(200).json({ questions });
  } catch {
    res.status(502).json({ error: 'Could not generate AI questions right now. Your local questions are unchanged.' });
  }
}
