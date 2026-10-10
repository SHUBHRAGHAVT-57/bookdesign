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
    // Discover models available to this exact API key/project instead of relying on
    // a hard-coded model name that may not be enabled for the user's API project.
    const modelListResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': apiKey },
    });
    if (!modelListResponse.ok) {
      const status = modelListResponse.status;
      const message = status === 401 || status === 403
        ? 'Gemini did not authorize this API key. Check GEMINI_API_KEY and enable the Gemini API for its project. Local questions are still available.'
        : status === 429
          ? 'Gemini model discovery is rate-limited or the API quota is exhausted. Local questions are still available.'
          : 'Could not list Gemini models for this API key (provider status ' + status + '). Local questions are still available.';
      res.status(status === 429 ? 429 : 502).json({ error: message });
      return;
    }

    const modelPayload: unknown = await modelListResponse.json();
    const availableModels = isRecord(modelPayload) && Array.isArray(modelPayload.models)
      ? modelPayload.models.filter((item): item is Record<string, unknown> =>
          isRecord(item) &&
          typeof item.name === 'string' &&
          /^models\/[a-zA-Z0-9._-]+$/.test(item.name) &&
          Array.isArray(item.supportedGenerationMethods) &&
          item.supportedGenerationMethods.includes('generateContent'))
      : [];
    const flashModels = availableModels.filter((item) => /gemini.*flash/i.test(String(item.name)));
    const preferredNames = ['models/gemini-2.5-flash', 'models/gemini-2.0-flash'];
    const model = preferredNames
      .map((name) => flashModels.find((item) => item.name === name))
      .find((item) => item !== undefined) ?? flashModels[0] ?? availableModels[0];
    if (!model || typeof model.name !== 'string') {
      res.status(502).json({ error: 'This Gemini API key has no available model that supports question generation. Check the model access in Google AI Studio. Local questions are still available.' });
      return;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model.name}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
    if (!response.ok) {
      // Keep provider credentials and raw error payloads private, but give the user
      // a useful next step for common configuration and quota failures.
      const status = response.status;
      const message = status === 400
        ? 'Gemini rejected the request. Check the model/API configuration and try again. Local questions are still available.'
        : status === 401 || status === 403
          ? 'Gemini did not authorize this API key. Check that GEMINI_API_KEY is valid and enabled for the Gemini API. Local questions are still available.'
          : status === 404
            ? 'The configured Gemini model was not found for this API. Check the model name in the server endpoint. Local questions are still available.'
            : status === 429
              ? 'Gemini is rate-limited or the API quota is exhausted. Check your AI Studio quota/billing and try again later. Local questions are still available.'
              : 'Gemini could not complete this request (provider status ' + status + '). Local questions are still available.';
      res.status(status === 429 ? 429 : 502).json({ error: message });
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
