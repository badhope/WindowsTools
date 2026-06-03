import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api';
import type { ManifestItem } from '@/types/api';
import fallbackManifestRaw from '@/manifest/commands.json?raw';

interface ManifestFile {
  items: ManifestItem[];
}

function getFallback(): ManifestItem[] {
  try {
    const parsed = JSON.parse(fallbackManifestRaw) as ManifestFile;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

const FALLBACK_ITEMS: ManifestItem[] = getFallback();

const MRU_KEY = 'wt:palette:mru';
const FAV_KEY = 'wt:palette:favorites';
const MRU_MAX = 8;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/**
 * Light-weight fuzzy match: every character of `query` must appear in
 * `target`, in order, but not necessarily contiguously. Returns a score
 * where higher = better. 0 means no match.
 *
 * Bonuses:
 *  - exact substring match (case-insensitive): +100
 *  - prefix match: +40
 *  - word-boundary hit (char after space / underscore / dash): +8
 *  - contiguous run length: +2 per char
 */
export function fuzzyScore(query: string, target: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (!t) return 0;

  const subIdx = t.indexOf(q);
  if (subIdx === 0 && t.length === q.length) return 1000; // exact
  if (subIdx === 0) return 100; // prefix
  if (subIdx > 0) return 80; // substring

  // subsequence scan
  let qi = 0;
  let score = 0;
  let run = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      run++;
      score += 2 * run;
      const prev = ti > 0 ? t[ti - 1] : '';
      if (prev === ' ' || prev === '_' || prev === '-' || prev === '/') {
        score += 8;
      }
    } else {
      run = 0;
    }
  }
  return qi === q.length ? score : 0;
}

function bestScore(item: ManifestItem, query: string): number {
  return Math.max(
    fuzzyScore(query, item.title),
    fuzzyScore(query, item.title_zh),
    fuzzyScore(query, item.id),
    item.keywords.reduce((acc, k) => Math.max(acc, fuzzyScore(query, k)), 0),
  );
}

function rankLocal(query: string, limit: number): ManifestItem[] {
  return FALLBACK_ITEMS.map((it) => ({ it, s: bestScore(it, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.it);
}

export const useCommandStore = defineStore('command', () => {
  const items = ref<ManifestItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Persisted state -----------------------------------------------------
  const recent = ref<string[]>(readJSON<string[]>(MRU_KEY, []));
  const favorites = ref<string[]>(readJSON<string[]>(FAV_KEY, []));

  function recordUse(id: string) {
    const next = [id, ...recent.value.filter((x) => x !== id)].slice(0, MRU_MAX);
    recent.value = next;
    writeJSON(MRU_KEY, next);
  }

  function toggleFavorite(id: string) {
    const exists = favorites.value.includes(id);
    const next = exists ? favorites.value.filter((x) => x !== id) : [...favorites.value, id];
    favorites.value = next;
    writeJSON(FAV_KEY, next);
  }

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      items.value = await api.paletteList();
    } catch {
      items.value = FALLBACK_ITEMS.slice();
    } finally {
      loading.value = false;
    }
  }

  async function search(q: string, limit = 20) {
    const query = q.trim().toLowerCase();
    if (!query) {
      await load();
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      items.value = await api.paletteSearch(query, limit);
    } catch {
      items.value = rankLocal(query, limit);
    } finally {
      loading.value = false;
    }
  }

  return {
    items,
    loading,
    error,
    recent,
    favorites,
    load,
    search,
    recordUse,
    toggleFavorite,
  };
});
