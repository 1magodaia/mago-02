import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

/**
 * SmartAutocomplete — drop-in `<input>` replacement with an accessible
 * suggestion dropdown. Additive to the existing UI: renders exactly the
 * same input element consumers pass in, and layers suggestions on top.
 *
 * - Debounce (default 250ms), in-memory cache and request cancellation.
 * - Fuzzy match (accent/case-insensitive, substring) over static lists.
 * - Optional async source (server-backed suggestions) with graceful fallback.
 * - Keyboard: ↑↓ navigate, Enter select, Esc close, Tab commits highlight.
 * - Touch-friendly: 44px min row height, wraps input width, no layout shift.
 */

export interface SuggestionItem {
  id: string;
  label: string;
  secondary?: string;
  /** Optional payload passed back on selection (e.g. placeId). */
  payload?: unknown;
}

type AsyncSource = (
  input: string,
  signal: AbortSignal,
) => Promise<SuggestionItem[]>;

interface SmartAutocompleteProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "onSelect"> {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (item: SuggestionItem) => void;
  /** Static string list (fuzzy-matched locally). */
  staticList?: string[];
  /** Async source; runs alongside staticList when both are set. */
  asyncSource?: AsyncSource;
  /** ms debounce for async and typing settle. Default 250. */
  debounceMs?: number;
  /** Minimum characters before fetching / showing. Default 1. */
  minChars?: number;
  /** Max rows in the dropdown. Default 8. */
  maxItems?: number;
  /** Optional leading icon rendered inside the field. */
  leading?: ReactNode;
  /** Wrapper class for the input row (matches existing label styles). */
  wrapperClassName?: string;
  autocomplete?: boolean; // opt-out toggle
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function fuzzyMatch(needle: string, haystack: string): number {
  // Higher = better match. 0 = no match.
  const n = normalize(needle);
  const h = normalize(haystack);
  if (!n) return 0;
  if (h === n) return 1000;
  if (h.startsWith(n)) return 500 - (h.length - n.length);
  const idx = h.indexOf(n);
  if (idx >= 0) return 200 - idx;
  // Tolerate 1-2 missing chars (very light typo tolerance).
  let i = 0;
  let j = 0;
  let skips = 0;
  while (i < n.length && j < h.length) {
    if (n[i] === h[j]) i++;
    else skips++;
    j++;
  }
  if (i === n.length && skips <= 2) return 80 - skips;
  return 0;
}

function filterStatic(list: string[], input: string, max: number): SuggestionItem[] {
  if (!input.trim()) return [];
  return list
    .map((label) => ({ label, score: fuzzyMatch(input, label) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => ({ id: `s:${x.label}`, label: x.label }));
}

// Simple module-level cache for async sources.
const asyncCache = new Map<string, { at: number; items: SuggestionItem[] }>();
const CACHE_TTL_MS = 60_000;

export const SmartAutocomplete = forwardRef<HTMLInputElement, SmartAutocompleteProps>(
  function SmartAutocomplete(
    {
      value,
      onChange,
      onSelect,
      staticList,
      asyncSource,
      debounceMs = 250,
      minChars = 1,
      maxItems = 8,
      leading,
      wrapperClassName = "flex items-center gap-2 rounded-xl bg-glass px-4 py-3 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary/70",
      className = "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
      autocomplete = true,
      onKeyDown,
      onFocus,
      onBlur,
      id,
      ...inputProps
    },
    ref,
  ) {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<SuggestionItem[]>([]);
    const [highlight, setHighlight] = useState(-1);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      },
      [ref],
    );

    const staticItems = useMemo(
      () => (staticList ? filterStatic(staticList, value, maxItems) : []),
      [staticList, value, maxItems],
    );

    // Debounced async fetch merged with static results.
    useEffect(() => {
      if (!autocomplete) {
        setItems([]);
        setLoading(false);
        setSearched(false);
        return;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      const q = value.trim();
      if (q.length < minChars) {
        setItems(staticItems);
        setLoading(false);
        setSearched(false);
        return;
      }
      if (!asyncSource) {
        setItems(staticItems);
        setLoading(false);
        setSearched(true);
        return;
      }
      const cacheKey = normalize(q);
      const cached = asyncCache.get(cacheKey);
      if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        setItems(mergeUnique(staticItems, cached.items, maxItems));
        setLoading(false);
        setSearched(true);
        return;
      }
      setItems(staticItems);
      setLoading(true);
      setSearched(false);
      timerRef.current = setTimeout(async () => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        try {
          const remote = await asyncSource(q, ac.signal);
          if (ac.signal.aborted) return;
          asyncCache.set(cacheKey, { at: Date.now(), items: remote });
          setItems(mergeUnique(staticItems, remote, maxItems));
        } catch {
          // silent — keep static suggestions
        } finally {
          if (!ac.signal.aborted) {
            setLoading(false);
            setSearched(true);
          }
        }
      }, debounceMs);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, [value, staticItems, asyncSource, autocomplete, debounceMs, minChars, maxItems]);


    // Close on outside click.
    useEffect(() => {
      function onDocClick(e: MouseEvent) {
        if (!rootRef.current) return;
        if (!rootRef.current.contains(e.target as Node)) setOpen(false);
      }
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    const commit = (item: SuggestionItem) => {
      onChange(item.label);
      onSelect?.(item);
      setOpen(false);
      setHighlight(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (autocomplete && open && items.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlight((h) => (h + 1) % items.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlight((h) => (h <= 0 ? items.length - 1 : h - 1));
          return;
        }
        if (e.key === "Enter" && highlight >= 0) {
          e.preventDefault();
          commit(items[highlight]);
          return;
        }
        if (e.key === "Escape") {
          setOpen(false);
          setHighlight(-1);
          return;
        }
        if (e.key === "Tab" && highlight >= 0) {
          commit(items[highlight]);
          return;
        }
      }
      onKeyDown?.(e);
    };

    const hasQuery = value.trim().length >= minChars;
    const showList = autocomplete && open && items.length > 0;
    const showLoading = autocomplete && open && hasQuery && loading && items.length === 0;
    const showEmpty = autocomplete && open && hasQuery && !loading && searched && items.length === 0;
    const showPanel = showList || showLoading || showEmpty;

    return (
      <div ref={rootRef} className="relative w-full">
        <label className={wrapperClassName}>
          {leading}
          <input
            {...inputProps}
            id={id}
            ref={setRefs}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
              setHighlight(-1);
            }}
            onFocus={(e) => {
              setOpen(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              // Delay close so click on option fires first.
              setTimeout(() => setOpen(false), 120);
              onBlur?.(e);
            }}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={showList ? listId : undefined}
            aria-activedescendant={
              showList && highlight >= 0 ? `${listId}-opt-${highlight}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
            className={className}
          />
        </label>
        {showPanel && (
          <div
            className="absolute left-0 right-0 top-full mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-elevated"
            style={{ zIndex: 2147483000 }}
          >

            {showLoading && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground"
              >
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary/40 border-t-primary" aria-hidden />
                Carregando sugestões...
              </div>
            )}
            {showEmpty && (
              <div
                role="status"
                aria-live="polite"
                className="px-4 py-3 text-sm text-muted-foreground"
              >
                Nenhum resultado encontrado para "{value.trim()}".
              </div>
            )}
            {showList && (
              <ul
                id={listId}
                role="listbox"
                className="max-h-72 overflow-auto"
              >
                {items.map((it, idx) => (
                  <li
                    key={it.id}
                    id={`${listId}-opt-${idx}`}
                    role="option"
                    aria-selected={idx === highlight}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commit(it);
                    }}
                    onMouseEnter={() => setHighlight(idx)}
                    className={`min-h-11 cursor-pointer px-4 py-2.5 text-sm ${
                      idx === highlight
                        ? "bg-primary/15 text-primary-foreground"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="truncate font-medium">{it.label}</div>
                    {it.secondary && (
                      <div className="truncate text-xs text-muted-foreground">{it.secondary}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  },
);


function mergeUnique(a: SuggestionItem[], b: SuggestionItem[], max: number): SuggestionItem[] {
  const seen = new Set<string>();
  const out: SuggestionItem[] = [];
  for (const item of [...a, ...b]) {
    const key = normalize(item.label);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}
