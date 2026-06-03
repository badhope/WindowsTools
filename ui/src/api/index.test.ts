import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { api, inTauri } from './index';

const mockedInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockedInvoke.mockReset();
  // Simulate a Tauri 2 runtime so api.* goes through the real `invoke`
  // path. Without this, jsdom's bare `window` is detected as a plain
  // browser and api.* would return the canned mock data.
  (globalThis as unknown as { __TAURI_INTERNALS__: object }).__TAURI_INTERNALS__ = {};
  (window as unknown as { __TAURI_INTERNALS__: object }).__TAURI_INTERNALS__ = {};
});

describe('api/index', () => {
  describe('inTauri()', () => {
    it('returns true when __TAURI_INTERNALS__ is set', () => {
      expect(inTauri()).toBe(true);
    });

    it('returns false on a bare browser', () => {
      delete (window as { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__;
      delete (globalThis as { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__;
      expect(inTauri()).toBe(false);
      // restore for the rest of the suite
      (globalThis as unknown as { __TAURI_INTERNALS__: object }).__TAURI_INTERNALS__ = {};
      (window as unknown as { __TAURI_INTERNALS__: object }).__TAURI_INTERNALS__ = {};
    });
  });

  describe('wrap helper', () => {
    it('passes the original promise through unchanged', async () => {
      mockedInvoke.mockResolvedValueOnce({ pong: true, service: 'svc' });
      await expect(api.ping()).resolves.toEqual({ pong: true, service: 'svc' });
      // `call(cmd)` always passes `args` through to invoke; when the caller
      // did not supply any, that second slot is `undefined`.
      expect(mockedInvoke).toHaveBeenCalledWith('ping', undefined);
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
