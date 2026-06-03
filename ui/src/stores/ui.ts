import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useUiStore = defineStore('ui', () => {
  const paletteOpen = ref(false);
  const theme = ref<'light' | 'dark'>('dark');
  const lang = ref<'en' | 'zh-CN'>('en');
  const sidebarCollapsed = ref(false);
  const lastError = ref<string | null>(null);

  function applyTheme(next: 'light' | 'dark') {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('wt:theme', next);
    } catch {
      /* ignore */
    }
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    applyTheme(theme.value);
  }

  function setTheme(next: 'light' | 'dark') {
    if (next !== 'light' && next !== 'dark') return;
    if (theme.value === next) return;
    theme.value = next;
    applyTheme(next);
  }

  function initTheme() {
    let initial: 'light' | 'dark' = 'dark';
    try {
      const stored = localStorage.getItem('wt:theme');
      if (stored === 'light' || stored === 'dark') initial = stored;
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        initial = 'light';
      }
    } catch {
      /* ignore */
    }
    theme.value = initial;
    applyTheme(initial);
  }

  function initLang() {
    try {
      const stored = localStorage.getItem('wt:lang');
      if (stored === 'en' || stored === 'zh-CN') lang.value = stored;
      else if (navigator.language && navigator.language.toLowerCase().startsWith('zh')) {
        lang.value = 'zh-CN';
      }
    } catch {
      /* ignore */
    }
  }

  function setError(msg: string | null) {
    lastError.value = msg;
  }

  function openPalette() {
    paletteOpen.value = true;
  }
  function closePalette() {
    paletteOpen.value = false;
  }
  function togglePalette() {
    paletteOpen.value = !paletteOpen.value;
  }

  // Keep the dataset attribute in sync even if `theme` is mutated
  // outside of toggleTheme / setTheme (e.g. via v-model in Settings).
  // Guard against transient 'undefined' strings emitted by v-model
  // while <option> children re-render on locale change. If the
  // setter ever lands on a bogus value, snap it back to the last
  // good theme so the v-model binding doesn't keep the bad value.
  let lastGoodTheme: 'light' | 'dark' = 'dark';
  watch(theme, (next) => {
    if (next === 'light' || next === 'dark') {
      lastGoodTheme = next;
      applyTheme(next);
    } else {
      theme.value = lastGoodTheme;
    }
  });

  return {
    paletteOpen,
    theme,
    lang,
    sidebarCollapsed,
    lastError,
    toggleTheme,
    setTheme,
    initTheme,
    initLang,
    setError,
    openPalette,
    closePalette,
    togglePalette,
  };
});
