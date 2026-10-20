export interface ActivitySession {
  id: string;
  startedAt: string;
}

export interface ActivitySummary {
  totalSessions: number;
  sessions: ActivitySession[];
}

const ACTIVITY_KEY = 'keyturn.activity-v1';
const TAB_SESSION_KEY = 'keyturn.activity-tab-session';
const MAX_SESSIONS = 365;

function readSessions(): ActivitySession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ActivitySession =>
      typeof item === 'object' && item !== null &&
      typeof (item as ActivitySession).id === 'string' &&
      typeof (item as ActivitySession).startedAt === 'string' &&
      Number.isFinite(Date.parse((item as ActivitySession).startedAt)),
    ).slice(-MAX_SESSIONS);
  } catch {
    return [];
  }
}

/** Records one browser-tab visit, not an authenticated login. */
export function recordAppSession(now = new Date()): ActivitySummary {
  if (typeof window === 'undefined') return { totalSessions: 0, sessions: [] };
  let tabSession = '';
  try {
    tabSession = window.sessionStorage.getItem(TAB_SESSION_KEY) ?? '';
  } catch {
    // Storage may be disabled; still return the saved activity below.
  }
  const sessions = readSessions();
  if (!tabSession) {
    const id = `visit-${now.getTime()}-${sessions.length}`;
    const next = [...sessions, { id, startedAt: now.toISOString() }].slice(-MAX_SESSIONS);
    try {
      window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
      window.sessionStorage.setItem(TAB_SESSION_KEY, id);
    } catch {
      // The dashboard remains usable if browser storage is unavailable.
    }
    return { totalSessions: next.length, sessions: next };
  }
  return { totalSessions: sessions.length, sessions };
}

export function readActivitySummary(): ActivitySummary {
  const sessions = readSessions();
  return { totalSessions: sessions.length, sessions };
}
