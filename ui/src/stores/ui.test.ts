import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUiStore } from './ui';

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('useUiStore', () => {
  describe('palette', () => {
    it('opens and closes the palette', () => {
      const s = useUiStore();
      expect(s.paletteOpen).toBe(false);
      s.openPalette();
      expect(s.paletteOpen).toBe(true);
      s.closePalette();
      expect(s.paletteOpen).toBe(false);
    });

    it('toggles the palette', () => {
      const s = useUiStore();
      s.togglePalette();
      expect(s.paletteOpen).toBe(true);
      s.togglePalette();
      expect(s.paletteOpen).toBe(false);
    });
  });

  describe('theme', () => {
    it('initTheme defaults to dark when no preference', () => {
      const s = useUiStore();
      s.initTheme();
      expect(s.theme).toBe('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(localStorage.getItem('wt:theme')).toBe('dark');
    });

    it('initTheme reads stored theme', () => {
      localStorage.setItem('wt:theme', 'light');
      const s = useUiStore();
      s.initTheme();
      expect(s.theme).toBe('light');
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('toggleTheme flips between dark and light', () => {
      const s = useUiStore();
      s.initTheme();
      s.toggleTheme();
      expect(s.theme).toBe('light');
      s.toggleTheme();
      expect(s.theme).toBe('dark');
    });

    it('setTheme is a no-op when value is unchanged', () => {
      const s = useUiStore();
      s.initTheme();
      s.setTheme('dark');
      expect(s.theme).toBe('dark');
    });

    it('setTheme persists the new value', () => {
      const s = useUiStore();
      s.initTheme();
      s.setTheme('light');
      expect(s.theme).toBe('light');
      expect(localStorage.getItem('wt:theme')).toBe('light');
    });
  });

  describe('lang', () => {
    it('initLang defaults to en', () => {
      const s = useUiStore();
      s.initLang();
      expect(s.lang).toBe('en');
    });

    it('initLang reads stored value', () => {
      localStorage.setItem('wt:lang', 'zh-CN');
      const s = useUiStore();
      s.initLang();
      expect(s.lang).toBe('zh-CN');
    });

    it('initLang ignores unknown stored values', () => {
      localStorage.setItem('wt:lang', 'fr-FR');
      const s = useUiStore();
      s.initLang();
      expect(s.lang).toBe('en');
    });
  });

  describe('errors', () => {
    it('setError stores the last error', () => {
      const s = useUiStore();
      s.setError('something went wrong');
      expect(s.lastError).toBe('something went wrong');
      s.setError(null);
      expect(s.lastError).toBeNull();
    });
  });
});
