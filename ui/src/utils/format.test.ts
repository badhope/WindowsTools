import { describe, it, expect } from 'vitest';
import { bytes, seconds, percent } from './format';

describe('utils/format', () => {
  describe('bytes', () => {
    it('returns B for values < 1024', () => {
      expect(bytes(0)).toBe('0.0 B');
      expect(bytes(512)).toBe('512.0 B');
      expect(bytes(1023)).toBe('1023.0 B');
    });

    it('returns KB for values < 1 MB', () => {
      expect(bytes(1024)).toBe('1.0 KB');
      expect(bytes(1536)).toBe('1.5 KB');
    });

    it('returns MB for values < 1 GB', () => {
      expect(bytes(1024 * 1024)).toBe('1.0 MB');
      expect(bytes(512 * 1024 * 1024)).toBe('512.0 MB');
    });

    it('returns GB for values < 1 TB', () => {
      expect(bytes(1024 ** 3)).toBe('1.0 GB');
      expect(bytes(2.5 * 1024 ** 3)).toBe('2.5 GB');
    });

    it('returns TB for values < 1 PB', () => {
      expect(bytes(1024 ** 4)).toBe('1.0 TB');
    });

    it('returns PB for astronomical values', () => {
      expect(bytes(1024 ** 5)).toBe('1.0 PB');
    });
  });

  describe('seconds', () => {
    it('formats 0 seconds as 0h 0m', () => {
      expect(seconds(0)).toBe('0h 0m');
    });

    it('formats sub-hour values', () => {
      expect(seconds(60)).toBe('0h 1m');
      expect(seconds(3599)).toBe('0h 59m');
    });

    it('formats hour+minute values', () => {
      expect(seconds(3600)).toBe('1h 0m');
      expect(seconds(3660)).toBe('1h 1m');
      expect(seconds(7325)).toBe('2h 2m');
    });

    it('handles 24h+ without day roll-over', () => {
      // The contract: this is hours+minutes, not d/h/m
      expect(seconds(86400)).toBe('24h 0m');
      expect(seconds(90000)).toBe('25h 0m');
    });
  });

  describe('percent', () => {
    it('defaults to 1 digit', () => {
      expect(percent(0)).toBe('0.0%');
      expect(percent(50)).toBe('50.0%');
      expect(percent(99.95)).toBe('100.0%');
    });

    it('respects digit count', () => {
      expect(percent(33.333, 0)).toBe('33%');
      expect(percent(33.333, 2)).toBe('33.33%');
      expect(percent(33.333, 4)).toBe('33.3330%');
    });
  });
});
