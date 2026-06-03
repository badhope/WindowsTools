<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSystemStore } from '@/stores/system';
import { useUiStore } from '@/stores/ui';

const sys = useSystemStore();
const ui = useUiStore();
const { t } = useI18n();
onMounted(() => sys.refresh());

const integrityText = computed(() => sys.integrity?.label ?? 'Unknown');
const themeLabel = computed(() =>
  ui.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
);
</script>

<template>
  <footer class="statusbar" role="contentinfo">
    <span class="left">
      <span
        class="dot"
        :class="sys.info?.is_elevated ? 'ok' : 'warn'"
        :aria-label="sys.info?.is_elevated ? 'elevated' : 'not elevated'"
      />
      <span
        >integrity: <b>{{ integrityText }}</b></span
      >
      <span v-if="sys.info" aria-hidden="true">|</span>
      <span v-if="sys.info" class="mono">{{ sys.info.computer_name }}</span>
    </span>
    <span class="right">
      <button
        class="icon-btn"
        type="button"
        :aria-label="themeLabel"
        :title="themeLabel"
        @click="ui.toggleTheme"
      >
        {{ ui.theme === 'dark' ? '☀' : '☾' }}
      </button>
      <span class="hint"> <kbd>Ctrl</kbd>+<kbd>K</kbd> {{ t('palette.placeholder') }} </span>
    </span>
  </footer>
</template>

<style scoped>
.statusbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-3);
  font-size: var(--fs-sm);
  background: var(--bg-2);
  border-top: 1px solid var(--border);
  user-select: none;
  color: var(--fg-2);
}
.left,
.right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.dot.ok {
  background: var(--ok);
  box-shadow: 0 0 0 2px var(--ok-soft);
}
.dot.warn {
  background: var(--warn);
  box-shadow: 0 0 0 2px var(--warn-soft);
}
kbd {
  background: var(--bg-3);
  border: 1px solid var(--border);
  padding: 0 4px;
  border-radius: var(--radius-1);
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
}
.icon-btn {
  background: transparent;
  border: 0;
  color: var(--fg);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-2);
  font-size: var(--fs-md);
  line-height: 1;
}
.icon-btn:hover {
  background: var(--bg-hover);
}
.icon-btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}
</style>
