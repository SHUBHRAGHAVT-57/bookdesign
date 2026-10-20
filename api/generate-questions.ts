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

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!groqKey && !geminiKey && !(openaiKey && process.env.ENABLE_PAID_OPENAI === 'true')) {
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

  let groqFailure = '';
  try {
    // Groq is the preferred free-tier provider. Never send requests to paid OpenAI
    // unless the user explicitly enables it in the server environment.
    if (groqKey) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          signal: AbortSignal.timeout(15000),
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + groqKey },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'Generate exactly one grounded study question per supplied passage. Use only facts in each passage. Return JSON with a questions array. Each item must contain id, type (comprehension, recall, or vocabulary), prompt, accepted (array of short answer variants), modelAnswer, and concept. Keep answers concise.' },
              { role: 'user', content: prompt },
            ],
          }),
        });
        if (groqResponse.ok) {
          const groqPayload: unknown = await groqResponse.json();
          const choices = isRecord(groqPayload) && Array.isArray(groqPayload.choices) ? groqPayload.choices : [];
          const choice = choices[0];
          const message = isRecord(choice) && isRecord(choice.message) ? choice.message : null;
          const content = message && typeof message.content === 'string' ? message.content : '';
          if (content) {
            const parsedGroq: unknown = JSON.parse(content);
            const raw = isRecord(parsedGroq) ? parsedGroq.questions : null;
            const questions = validateQuestions(raw, new Set(validPassages.map((passage) => passage.id)));
            if (questions.length === validPassages.length) {
              res.status(200).json({ questions, provider: 'groq' });
              return;
            }
            groqFailure = 'Groq returned question data that did not pass validation.';
          } else {
            groqFailure = 'Groq returned an empty response.';
          }
        } else {
          groqFailure = groqResponse.status === 429
            ? 'Groq free-tier rate limit or quota reached.'
            : groqResponse.status === 401 || groqResponse.status === 403
              ? 'Groq did not authorize the API key. Check GROQ_API_KEY in Vercel.'
              : 'Groq returned HTTP ' + groqResponse.status + '.';
        }
      } catch {
        groqFailure = 'Groq request failed or timed out.';
      }
    }
  let openaiFailure = '';
  try {
    // Prefer OpenAI for quality; if it is unavailable or returns invalid output,
    // fall through to Gemini so existing deployments keep working.
    if (openaiKey && process.env.ENABLE_PAID_OPENAI === 'true') {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          signal: AbortSignal.timeout(12000),
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + openaiKey },
          body: JSON.stringify({
            model: 'gpt-4.1-mini',
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'Generate exactly one grounded study question per supplied passage. Use only facts in each passage. Return JSON with a questions array. Each item must contain id, type (comprehension, recall, or vocabulary), prompt, accepted (array of short answer variants), modelAnswer, and concept. Keep answers concise.' },
              { role: 'user', content: prompt },
            ],
          }),
        });
        if (!openaiResponse.ok) {
          openaiFailure = openaiResponse.status === 401 ? 'OpenAI rejected the API key (401). Check OPENAI_API_KEY in Vercel Preview and confirm the key is active.'
            : openaiResponse.status === 429 ? 'OpenAI returned 429: check API billing, credits, and rate limits.'
            : 'OpenAI returned HTTP ' + openaiResponse.status + '.';
        }
        if (openaiResponse.ok) {
          const openaiPayload: unknown = await openaiResponse.json();
          const choices = isRecord(openaiPayload) && Array.isArray(openaiPayload.choices) ? openaiPayload.choices : [];
          const choice = choices[0];
          const message = isRecord(choice) && isRecord(choice.message) ? choice.message : null;
          const content = message && typeof message.content === 'string' ? message.content : '';
          if (content) {
            const parsedOpenAI: unknown = JSON.parse(content);
            const raw = isRecord(parsedOpenAI) ? parsedOpenAI.questions : null;
            const questions = validateQuestions(raw, new Set(validPassages.map((passage) => passage.id)));
            if (questions.length === validPassages.length) {
              res.status(200).json({ questions, provider: 'openai' });
              return;
            }
            openaiFailure = 'OpenAI responded, but its question data did not pass validation.';
          } else {
            openaiFailure = 'OpenAI responded without usable question data.';
          }
        }
      } catch (error) {
        openaiFailure = error instanceof Error && error.name === 'TimeoutError'
          ? 'OpenAI request timed out.'
          : 'OpenAI request failed before a valid response was received.';
        // Continue to Gemini fallback on timeout, provider errors, or invalid output.
      }
    }
    if (!geminiKey) {
      res.status(502).json({ error: (groqFailure ? groqFailure + ' ' : '') + 'No free AI fallback is configured. Add GEMINI_API_KEY or use local questions, which are still available.' });
      return;
    }
    // Discover models available to this exact API key/project instead of relying on
    // a hard-coded model name that may not be enabled for the user's API project.
    const modelListResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': geminiKey },
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
    // Select only text-capable Gemini Flash models; never fall back to embeddings or media models.
    const flashModels = availableModels.filter((item) => /^models\/gemini-[a-z0-9.-]*flash[a-z0-9.-]*$/i.test(String(item.name)));
    const preferredNames = ['models/gemini-2.5-flash', 'models/gemini-3.5-flash', 'models/gemini-3.6-flash', 'models/gemini-3.8-flash', 'models/gemini-2.5-flash-lite'];
    const candidates = [
      ...preferredNames.map((name) => flashModels.find((item) => item.name === name)).filter((item): item is Record<string, unknown> => !!item),
      ...flashModels.filter((item) => !preferredNames.includes(String(item.name))),
    ].slice(0, 3);
    if (!candidates.length) {
      res.status(502).json({ error: 'This Gemini API key has no available Flash text model. Check Gemini API access in Google AI Studio. Local questions are still available.' });
      return;
    }
    let response: Response | null = null;
    for (const model of candidates) {
      const modelId = String(model.name).replace(/^models\//, '');
      const attempt = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`, {
        signal: AbortSignal.timeout(12000),
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }),
      });
      response = attempt;
      if (attempt.ok || ![400, 404, 429, 500, 502, 503, 504].includes(attempt.status)) break;
    }
    if (!response || !response.ok) {
      // Keep provider credentials and raw error payloads private, but give the user
      // a useful next step for common configuration and quota failures.
      const status = response?.status ?? 502;
      const message = status === 400
        ? 'Gemini rejected the request for every available Flash model. Check Gemini API access and model availability. Local questions are still available.'
        : status === 401 || status === 403
          ? 'Gemini did not authorize this API key. Check that GEMINI_API_KEY is valid and enabled for the Gemini API. Local questions are still available.'
          : status === 404
            ? 'None of the available Flash models accepted this request. Check Gemini API access for this key. Local questions are still available.'
            : status === 429
              ? 'Gemini is rate-limited or the API quota is exhausted. Check your AI Studio quota/billing and try again later. Local questions are still available.'
              : 'Gemini could not complete this request (provider status ' + status + '). Local questions are still available.';
      const combinedMessage = [groqFailure, openaiFailure, message].filter(Boolean).join(' ');
      res.status(status === 429 ? 429 : 502).json({ error: combinedMessage });
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
