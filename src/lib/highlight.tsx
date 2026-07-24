import type { ReactNode } from "react";

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Max edit distance allowed per term based on its length. */
function maxDistFor(term: string): number {
  if (term.length <= 3) return 0;
  if (term.length <= 5) return 1;
  if (term.length <= 8) return 2;
  return 3;
}

/**
 * Bounded Levenshtein distance. Returns `limit + 1` if the true
 * distance exceeds `limit`. O(a.length * b.length) but cheap for
 * short strings (< ~30 chars) which is our use case (search tokens).
 */
function boundedLevenshtein(a: string, b: string, limit: number): number {
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > limit) return limit + 1;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prev = new Array<number>(bl + 1);
  let curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > limit) return limit + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

/**
 * Fuzzy substring search: find the best window in `text` (already
 * normalized) that matches `term` within `maxDist` edits. Returns
 * all non-overlapping match spans (start, end) in the normalized text.
 */
function fuzzyFindSpans(normText: string, term: string, maxDist: number): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  const tl = term.length;
  if (tl === 0 || normText.length === 0) return spans;

  // Exact substring fast path.
  if (maxDist === 0) {
    let from = 0;
    while (from <= normText.length - tl) {
      const idx = normText.indexOf(term, from);
      if (idx < 0) break;
      spans.push([idx, idx + tl]);
      from = idx + tl;
    }
    return spans;
  }

  const minLen = Math.max(1, tl - maxDist);
  const maxLen = tl + maxDist;
  let i = 0;
  while (i <= normText.length - minLen) {
    let best: { end: number; dist: number } | null = null;
    const upper = Math.min(normText.length, i + maxLen);
    for (let end = i + minLen; end <= upper; end++) {
      const window = normText.slice(i, end);
      const d = boundedLevenshtein(window, term, maxDist);
      if (d <= maxDist && (!best || d < best.dist)) {
        best = { end, dist: d };
        if (d === 0) break;
      }
    }
    if (best) {
      spans.push([i, best.end]);
      i = best.end;
    } else {
      i++;
    }
  }
  return spans;
}

/**
 * Split a raw query string into search tokens (words of 2+ chars).
 * Accent- and case-insensitive.
 */
export function toTerms(query: string | null | undefined): string[] {
  if (!query) return [];
  return normalize(query)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/** Fuzzy contains: text has a window matching term within maxDist edits. */
function fuzzyContains(normText: string, term: string): boolean {
  const maxDist = maxDistFor(term);
  if (maxDist === 0) return normText.includes(term);
  return fuzzyFindSpans(normText, term, maxDist).length > 0;
}

export function matchesAll(text: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const n = normalize(text);
  return terms.every((t) => fuzzyContains(n, t));
}

export function matchesAny(text: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const n = normalize(text);
  return terms.some((t) => fuzzyContains(n, t));
}

interface HighlightProps {
  text: string;
  terms: string[];
  className?: string;
}

/**
 * Render `text` with matched `terms` wrapped in <mark>.
 * Preserves original casing/accents; matches are accent/case-insensitive
 * AND fuzzy (tolerates small typos).
 */
export function Highlight({ text, terms, className }: HighlightProps): ReactNode {
  if (!text) return null;
  const clean = terms.map((t) => t.trim()).filter(Boolean);
  if (clean.length === 0) return <>{text}</>;

  const normText = normalize(text);

  // Collect spans from every term, then merge overlaps.
  const raw: Array<[number, number]> = [];
  for (const t of clean) {
    const dist = maxDistFor(t);
    raw.push(...fuzzyFindSpans(normText, t, dist));
  }
  if (raw.length === 0) return <>{text}</>;

  raw.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Array<[number, number]> = [];
  for (const span of raw) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) {
      last[1] = Math.max(last[1], span[1]);
    } else {
      merged.push([span[0], span[1]]);
    }
  }

  const parts: Array<{ start: number; end: number; hit: boolean }> = [];
  let idx = 0;
  for (const [start, end] of merged) {
    if (idx < start) parts.push({ start: idx, end: start, hit: false });
    parts.push({ start, end, hit: true });
    idx = end;
  }
  if (idx < text.length) parts.push({ start: idx, end: text.length, hit: false });

  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <mark
            key={i}
            className={
              className ??
              "rounded-sm bg-warn/40 px-0.5 text-foreground"
            }
          >
            {text.slice(p.start, p.end)}
          </mark>
        ) : (
          <span key={i}>{text.slice(p.start, p.end)}</span>
        ),
      )}
    </>
  );
}
