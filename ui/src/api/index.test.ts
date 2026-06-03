import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { api } from './index';

const mockedInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockedInvoke.mockReset();
});

describe('api/index', () => {
  describe('wrap helper', () => {
    it('passes the original promise through unchanged', async () => {
      mockedInvoke.mockResolvedValueOnce({ pong: true, service: 'svc' });
      await expect(api.ping()).resolves.toEqual({ pong: true, service: 'svc' });
      expect(mockedInvoke).toHaveBeenCalledWith('ping');
    });

    it('propagates rejection (errors are not swallowed)', async () => {
      mockedInvoke.mockRejectedValueOnce(new Error('boom'));
      await expect(api.ping()).rejects.toThrow('boom');
    });
  });

  describe('argument shape', () => {
    it('passes scalar args directly to invoke', async () => {
      mockedInvoke.mockResolvedValueOnce({
        mount_point: 'C:',
        label: 'OS',
        fs: 'NTFS',
        total_bytes: 1,
        free_bytes: 1,
        kind: 'fixed',
      });
      await api.diskFree('C:\\');
      expect(mockedInvoke).toHaveBeenCalledWith('disk_free', { path: 'C:\\' });
    });

    it('wraps compound args under `args`', async () => {
      mockedInvoke.mockResolvedValueOnce(undefined);
      await api.processKill({ pid: 1234, tree: true });
      expect(mockedInvoke).toHaveBeenCalledWith('processes_kill', {
        args: { pid: 1234, tree: true },
      });
    });

    it('serializes paletteSearch payload under `args` with q + limit', async () => {
      mockedInvoke.mockResolvedValueOnce([]);
      await api.paletteSearch('disk', 5);
      expect(mockedInvoke).toHaveBeenCalledWith('palette_search', {
        args: { q: 'disk', limit: 5 },
      });
    });
  });

  describe('default args', () => {
    it('env() passes name as null when omitted', async () => {
      mockedInvoke.mockResolvedValueOnce([]);
      await api.env();
      expect(mockedInvoke).toHaveBeenCalledWith('system_env', { name: null });
    });

    it('env() passes name when provided', async () => {
      mockedInvoke.mockResolvedValueOnce([]);
      await api.env('PATH');
      expect(mockedInvoke).toHaveBeenCalledWith('system_env', { name: 'PATH' });
    });
  });
});
