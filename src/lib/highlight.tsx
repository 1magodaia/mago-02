import type { ReactNode } from "react";

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

/** Case/accent-insensitive contains-any check. */
export function matchesAll(text: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const n = normalize(text);
  return terms.every((t) => n.includes(t));
}

export function matchesAny(text: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const n = normalize(text);
  return terms.some((t) => n.includes(t));
}

interface HighlightProps {
  text: string;
  terms: string[];
  className?: string;
}

/**
 * Render `text` with matched `terms` wrapped in <mark>.
 * Preserves original casing/accents; matches are accent/case-insensitive.
 */
export function Highlight({ text, terms, className }: HighlightProps): ReactNode {
  if (!text) return null;
  const clean = terms.map((t) => t.trim()).filter(Boolean);
  if (clean.length === 0) return <>{text}</>;

  const normText = normalize(text);
  const pattern = new RegExp(`(${clean.map(escapeRegex).join("|")})`, "gi");

  // We match against normalized text but slice the original to preserve accents.
  const parts: Array<{ start: number; end: number; hit: boolean }> = [];
  let idx = 0;
  for (const m of normText.matchAll(pattern)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
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
