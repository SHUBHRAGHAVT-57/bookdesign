/** Lowercases, strips accents and punctuation, and collapses whitespace. */
export function normalizeAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Very light plural folding so "clouds" matches "cloud" and "absorbs" matches "absorb". */
function stem(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

function tokens(raw: string): string[] {
  const normalized = normalizeAnswer(raw);
  return normalized === '' ? [] : normalized.split(' ').map(stem);
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/**
 * Deterministic answer check: the normalised answer must contain one of the
 * accepted keywords/phrases. Single long keywords tolerate one typo.
 */
export function checkRecallAnswer(answer: string, accepted: string[]): boolean {
  const answerTokens = tokens(answer);
  if (answerTokens.length === 0) return false;
  const padded = ` ${answerTokens.join(' ')} `;
  return accepted.some((keyword) => {
    const keywordTokens = tokens(keyword);
    if (keywordTokens.length === 0) return false;
    if (padded.includes(` ${keywordTokens.join(' ')} `)) return true;
    if (keywordTokens.length === 1 && keywordTokens[0].length >= 6) {
      return answerTokens.some((t) => editDistanceAtMostOne(t, keywordTokens[0]));
    }
    return false;
  });
}
