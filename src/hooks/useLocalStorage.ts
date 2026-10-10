import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface Envelope {
  version: number;
  data: unknown;
}

function load<T>(key: string, version: number, validate: (value: unknown) => value is T): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const envelope = parsed as Envelope;
    if (envelope.version !== version) return null; // old/unknown schema: start fresh
    return validate(envelope.data) ? envelope.data : null;
  } catch {
    return null;
  }
}

/**
 * useState that persists to localStorage inside a versioned envelope.
 * Corrupt, outdated or invalid saves fall back to `createInitial()`.
 * If storage is unavailable the app keeps working in memory.
 */
export function useLocalStorage<T>(
  key: string,
  version: number,
  createInitial: () => T,
  validate: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => load(key, version, validate) ?? createInitial());

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify({ version, data: value }));
    } catch {
      // Storage full or blocked: keep running without persistence.
    }
  }, [key, version, value]);

  return [value, setValue];
}
