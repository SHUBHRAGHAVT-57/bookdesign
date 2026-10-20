export interface KeyMetric { attempts: number; errors: number; }
export type KeyMetrics = Record<string, KeyMetric>;

const KEY = 'keyturn.key-analytics-v1';

function normalise(key: string): string | null {
  if (key === ' ') return 'Space';
  const upper = key.toUpperCase();
  return /^[A-Z0-9.,;:'"!?\-]$/.test(upper) ? upper : null;
}

export function readKeyMetrics(): KeyMetrics {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => {
      const metric = value as Partial<KeyMetric>;
      return typeof metric.attempts === 'number' && typeof metric.errors === 'number';
    })) as KeyMetrics;
  } catch { return {}; }
}

/** Stores only aggregate key attempts/errors in this browser; never the typed text. */
export function recordKeyAttempt(key: string, correct: boolean): KeyMetrics {
  const name = normalise(key);
  const current = readKeyMetrics();
  if (!name) return current;
  const before = current[name] ?? { attempts: 0, errors: 0 };
  const next = { ...current, [name]: { attempts: before.attempts + 1, errors: before.errors + (correct ? 0 : 1) } };
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage is optional */ }
  return next;
}
