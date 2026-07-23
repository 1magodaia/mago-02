// Local persistence for favorites / contacted / search history.
// Deliberately localStorage-only: no auth in MVP, keeps PII off backend.

const K_FAV = "bm.favorites";
const K_CONTACTED = "bm.contacted";
const K_HISTORY = "bm.history";
const K_CACHE = "bm.searchCache";

export interface SavedLead {
  place_id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  google_maps_uri: string | null;
  saved_at: string;
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  region: string;
  radiusKm: number;
  used_gps: boolean;
  count: number;
  created_at: string;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function getFavorites(): SavedLead[] { return read(K_FAV, []); }
export function getContacted(): SavedLead[] { return read(K_CONTACTED, []); }
export function getHistory(): SearchHistoryEntry[] { return read(K_HISTORY, []); }

export function toggleFavorite(lead: SavedLead): SavedLead[] {
  const list = getFavorites();
  const existing = list.find((l) => l.place_id === lead.place_id);
  const next = existing ? list.filter((l) => l.place_id !== lead.place_id) : [lead, ...list];
  write(K_FAV, next);
  return next;
}

export function toggleContacted(lead: SavedLead): SavedLead[] {
  const list = getContacted();
  const existing = list.find((l) => l.place_id === lead.place_id);
  const next = existing ? list.filter((l) => l.place_id !== lead.place_id) : [lead, ...list];
  write(K_CONTACTED, next);
  return next;
}

export function isFavorite(place_id: string): boolean {
  return getFavorites().some((l) => l.place_id === place_id);
}

export function isContacted(place_id: string): boolean {
  return getContacted().some((l) => l.place_id === place_id);
}

export function addHistory(entry: Omit<SearchHistoryEntry, "id" | "created_at">) {
  const list = getHistory();
  const next: SearchHistoryEntry[] = [
    { ...entry, id: crypto.randomUUID(), created_at: new Date().toISOString() },
    ...list,
  ].slice(0, 25);
  write(K_HISTORY, next);
}

// --- Search cache (24h) ---
interface CacheEntry<T> { data: T; ts: number }
const TTL_MS = 24 * 60 * 60 * 1000;

export function cacheGet<T>(key: string): T | null {
  const map = read<Record<string, CacheEntry<T>>>(K_CACHE, {});
  const hit = map[key];
  if (!hit) return null;
  if (Date.now() - hit.ts > TTL_MS) return null;
  return hit.data;
}

export function cacheSet<T>(key: string, data: T) {
  const map = read<Record<string, CacheEntry<T>>>(K_CACHE, {});
  map[key] = { data, ts: Date.now() };
  // keep last ~40 entries
  const keys = Object.keys(map).sort((a, b) => map[b].ts - map[a].ts).slice(0, 40);
  const trimmed: Record<string, CacheEntry<T>> = {};
  for (const k of keys) trimmed[k] = map[k];
  write(K_CACHE, trimmed);
}

export function exportToCsv(rows: Array<Record<string, unknown>>, filename: string) {
  if (typeof window === "undefined" || rows.length === 0) return;
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set()),
  );
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
