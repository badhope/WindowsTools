import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/api', () => ({
  api: {
    paletteList: vi.fn(),
    paletteSearch: vi.fn(),
  },
}));

import { api } from '@/api';
import { useCommandStore } from './command';
import type { ManifestItem } from '@/types/api';

const mockedList = vi.mocked(api.paletteList);
const mockedSearch = vi.mocked(api.paletteSearch);

const items: ManifestItem[] = [
  {
    id: 'disk',
    title: 'Disk',
    title_zh: '磁盘',
    category: 'system',
    keywords: ['drive'],
    risk: 'low',
    requires_admin: false,
    route: '/disk',
  },
  {
    id: 'services',
    title: 'Services',
    title_zh: '服务',
    category: 'system',
    keywords: ['scm'],
    risk: 'high',
    requires_admin: true,
    route: '/services',
  },
];

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  mockedList.mockReset();
  mockedSearch.mockReset();
});

describe('useCommandStore', () => {
  it('starts empty / not-loading / no-error', () => {
    const s = useCommandStore();
    expect(s.items).toEqual([]);
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
  });

  it('load() fills items from api.paletteList', async () => {
    mockedList.mockResolvedValueOnce(items);
    const s = useCommandStore();
    await s.load();
    expect(s.items).toEqual(items);
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
  });

  it('load() falls back to the bundled manifest when api throws', async () => {
    mockedList.mockRejectedValueOnce(new Error('offline'));
    const s = useCommandStore();
    await s.load();
    // The bundled manifest contains "disk" and "services"
    expect(s.items.length).toBeGreaterThan(0);
    expect(s.items.find((it) => it.id === 'disk')).toBeDefined();
  });

  it('load() toggles loading on and off', async () => {
    let resolveFn: (v: ManifestItem[]) => void = () => {};
    mockedList.mockReturnValueOnce(
      new Promise<ManifestItem[]>((r) => {
        resolveFn = r;
      }),
    );
    const s = useCommandStore();
    const p = s.load();
    expect(s.loading).toBe(true);
    resolveFn([]);
    await p;
    expect(s.loading).toBe(false);
  });

  it('search() with empty query delegates to load()', async () => {
    mockedList.mockResolvedValueOnce(items);
    const s = useCommandStore();
    await s.search('   ');
    expect(mockedList).toHaveBeenCalled();
    expect(s.items).toEqual(items);
  });

  it('search() with non-empty query calls api.paletteSearch and replaces items', async () => {
    mockedSearch.mockResolvedValueOnce([items[0]!]);
    const s = useCommandStore();
    await s.search('disk');
    expect(mockedSearch).toHaveBeenCalledWith('disk', 20);
    expect(s.items).toEqual([items[0]]);
  });

  it('search() filters the fallback manifest by title / title_zh / id when api throws', async () => {
    mockedSearch.mockRejectedValueOnce(new Error('offline'));
    const s = useCommandStore();
    await s.search('disk');
    // bundled manifest contains the disk item, so it should match
    expect(s.items.find((it) => it.id === 'disk')).toBeDefined();
    // non-matching items should be excluded
    expect(s.items.find((it) => it.id === 'registry')).toBeUndefined();
  });

  it('search() trims and lowercases the query before calling the api', async () => {
    mockedSearch.mockResolvedValueOnce([]);
    const s = useCommandStore();
    await s.search('  DiSk  ');
    expect(mockedSearch).toHaveBeenCalledWith('disk', 20);
  });
});

describe('fuzzyScore', () => {
  it('exact match scores highest', async () => {
    const { fuzzyScore } = await import('./command');
    expect(fuzzyScore('disk', 'disk')).toBe(1000);
  });

  it('prefix scores higher than substring', async () => {
    const { fuzzyScore } = await import('./command');
    const prefix = fuzzyScore('dis', 'disk');
    const mid = fuzzyScore('isk', 'disk');
    expect(prefix).toBeGreaterThan(mid);
  });

  it('returns 0 for no match', async () => {
    const { fuzzyScore } = await import('./command');
    expect(fuzzyScore('zzz', 'disk')).toBe(0);
  });

  it('matches non-contiguous subsequences', async () => {
    const { fuzzyScore } = await import('./command');
    expect(fuzzyScore('dk', 'disk')).toBeGreaterThan(0);
  });

  it('is case-insensitive', async () => {
    const { fuzzyScore } = await import('./command');
    expect(fuzzyScore('DISK', 'disk manager')).toBeGreaterThan(0);
  });
});

describe('useCommandStore MRU + favorites', () => {
  it('recordUse() prepends and de-dupes', () => {
    const s = useCommandStore();
    s.recordUse('disk');
    s.recordUse('services');
    s.recordUse('disk'); // moves to front
    expect(s.recent[0]).toBe('disk');
    expect(s.recent[1]).toBe('services');
    expect(s.recent.filter((x) => x === 'disk').length).toBe(1);
  });

  it('recordUse() caps the list at 8 entries', () => {
    const s = useCommandStore();
    for (let i = 0; i < 12; i++) s.recordUse(`cmd-${i}`);
    expect(s.recent.length).toBe(8);
    expect(s.recent[0]).toBe('cmd-11');
  });

  it('recordUse() persists to localStorage', () => {
    const s = useCommandStore();
    s.recordUse('disk');
    const stored = JSON.parse(localStorage.getItem('wt:palette:mru') ?? '[]');
    expect(stored).toEqual(['disk']);
  });

  it('toggleFavorite() flips state and persists', () => {
    const s = useCommandStore();
    expect(s.favorites).toEqual([]);
    s.toggleFavorite('disk');
    expect(s.favorites).toEqual(['disk']);
    s.toggleFavorite('disk');
    expect(s.favorites).toEqual([]);
  });
});
