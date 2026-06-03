import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/api', () => ({
  api: {
    systemInfo: vi.fn(),
    integrity: vi.fn(),
  },
}));

import { api } from '@/api';
import { useSystemStore } from './system';
import type { SystemInfo, IntegrityInfo } from '@/types/api';

const mockedInfo = vi.mocked(api.systemInfo);
const mockedIntegrity = vi.mocked(api.integrity);

const info: SystemInfo = {
  computer_name: 'HOST',
  user_name: 'alice',
  user_sid: 'S-1-5-21-1',
  major: 10,
  minor: 0,
  build: 22631,
  display: 'Win 11',
  edition: 'Pro',
  uptime_seconds: 3600,
  pid: 1234,
  is_elevated: false,
};

const integrity: IntegrityInfo = {
  integrity: 'Medium',
  label: 'Medium',
  elevated: false,
};

beforeEach(() => {
  setActivePinia(createPinia());
  mockedInfo.mockReset();
  mockedIntegrity.mockReset();
});

describe('useSystemStore', () => {
  it('starts with null info/integrity and no error', () => {
    const s = useSystemStore();
    expect(s.info).toBeNull();
    expect(s.integrity).toBeNull();
    expect(s.error).toBeNull();
    expect(s.loading).toBe(false);
  });

  it('refresh() loads both systemInfo and integrity in parallel', async () => {
    mockedInfo.mockResolvedValueOnce(info);
    mockedIntegrity.mockResolvedValueOnce(integrity);
    const s = useSystemStore();
    await s.refresh();
    expect(mockedInfo).toHaveBeenCalledTimes(1);
    expect(mockedIntegrity).toHaveBeenCalledTimes(1);
    expect(s.info).toEqual(info);
    expect(s.integrity).toEqual(integrity);
    expect(s.error).toBeNull();
  });

  it('refresh() stores error string when api throws', async () => {
    mockedInfo.mockRejectedValueOnce(new Error('boom'));
    mockedIntegrity.mockResolvedValueOnce(integrity);
    const s = useSystemStore();
    await s.refresh();
    expect(s.error).toBe('Error: boom');
    expect(s.loading).toBe(false);
  });

  it('refresh() toggles loading on and off', async () => {
    let resolveInfo: (v: SystemInfo) => void = () => {};
    let resolveIntegrity: (v: IntegrityInfo) => void = () => {};
    mockedInfo.mockReturnValueOnce(
      new Promise<SystemInfo>((r) => {
        resolveInfo = r;
      }),
    );
    mockedIntegrity.mockReturnValueOnce(
      new Promise<IntegrityInfo>((r) => {
        resolveIntegrity = r;
      }),
    );
    const s = useSystemStore();
    const p = s.refresh();
    expect(s.loading).toBe(true);
    resolveInfo(info);
    resolveIntegrity(integrity);
    await p;
    expect(s.loading).toBe(false);
  });
});
