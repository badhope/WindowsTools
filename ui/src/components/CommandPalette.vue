<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useCommandStore } from '@/stores/command';
import { useUiStore } from '@/stores/ui';
import type { ManifestItem } from '@/types/api';
import RiskChip from './RiskChip.vue';

const router = useRouter();
const cmd = useCommandStore();
const ui = useUiStore();
const { t, locale } = useI18n();
const q = ref('');
const items = ref<ManifestItem[]>([]);
const selected = ref(0);
const input = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLUListElement | null>(null);

const refresh = async () => {
  if (q.value.trim()) {
    await cmd.search(q.value, 20);
    items.value = cmd.items;
  } else {
    // No query: show the user's recent + favorites as quick picks.
    items.value = buildQuickPicks();
  }
  selected.value = 0;
};

function buildQuickPicks(): ManifestItem[] {
  const seen = new Set<string>();
  const out: ManifestItem[] = [];
  const push = (id: string) => {
    if (seen.has(id)) return;
    const it = cmd.items.find((x) => x.id === id) ?? manifestLookup.get(id);
    if (it) {
      seen.add(id);
      out.push(it);
    }
  };
  cmd.favorites.forEach(push);
  cmd.recent.forEach(push);
  return out;
}

// Quick-pick fallback uses the bundled manifest when the api list is empty.
import fallbackManifestRaw from '@/manifest/commands.json?raw';
const manifestLookup = (() => {
  try {
    const parsed = JSON.parse(fallbackManifestRaw) as { items: ManifestItem[] };
    return new Map(parsed.items.map((it) => [it.id, it]));
  } catch {
    return new Map<string, ManifestItem>();
  }
})();

onMounted(() => {
  refresh();
  input.value?.focus();
});

watch(q, refresh);

// Re-run search when the user toggles language so the result
// list reflects the current locale.
watch(locale, refresh);

function go(it: ManifestItem) {
  cmd.recordUse(it.id);
  ui.closePalette();
  router.push(it.route);
}

function toggleFav(it: ManifestItem, e: Event) {
  e.stopPropagation();
  e.preventDefault();
  cmd.toggleFavorite(it.id);
}

function onKey(e: KeyboardEvent) {
  if (items.value.length === 0) {
    if (e.key === 'Escape') ui.closePalette();
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selected.value = (selected.value + 1) % items.value.length;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    selected.value = (selected.value - 1 + items.value.length) % items.value.length;
  }
  if (e.key === 'Home') {
    e.preventDefault();
    selected.value = 0;
  }
  if (e.key === 'End') {
    e.preventDefault();
    selected.value = items.value.length - 1;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    const it = items.value[selected.value];
    if (it) go(it);
  }
  if (e.key === 'Escape') {
    ui.closePalette();
  }
}

function titleFor(it: ManifestItem): string {
  return locale.value === 'zh-CN' && it.title_zh ? it.title_zh : it.title;
}

function isFav(id: string): boolean {
  return cmd.favorites.includes(id);
}

function isRecent(id: string): boolean {
  return cmd.recent.includes(id);
}

// Keep the highlighted row visible when navigating with the keyboard.
watch(selected, async () => {
  await Promise.resolve();
  const list = listEl.value;
  if (!list) return;
  const row = list.querySelector<HTMLElement>(`[data-idx="${selected.value}"]`);
  row?.scrollIntoView({ block: 'nearest' });
});

const showAdminBadge = (it: ManifestItem): boolean => Boolean(it.requires_admin);
const placeholder = computed(() => t('palette.placeholder'));
const showQuickHeader = computed(() => !q.value.trim() && items.value.length > 0);
</script>

<template>
  <div class="overlay" @click.self="ui.closePalette()">
    <div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <input
        ref="input"
        v-model="q"
        :placeholder="placeholder"
        aria-label="Command palette search"
        aria-autocomplete="list"
        aria-controls="palette-listbox"
        :aria-activedescendant="items.length ? `palette-row-${selected}` : undefined"
        @keydown="onKey"
      />
      <div v-if="showQuickHeader" class="quick-header" aria-hidden="true">
        ★ {{ t('palette.favorites') }} · ⏱ {{ t('palette.recent') }}
      </div>
      <ul id="palette-listbox" ref="listEl" role="listbox" aria-label="Commands">
        <li v-if="items.length === 0" class="empty" role="status">
          {{ t('palette.empty') }}
        </li>
        <li
          v-for="(it, i) in items"
          :id="`palette-row-${i}`"
          :key="it.id"
          :data-idx="i"
          role="option"
          :aria-selected="i === selected"
          :class="{ active: i === selected }"
          @click="go(it)"
          @mousemove="selected = i"
        >
          <span class="t">{{ titleFor(it) }}</span>
          <span class="z">{{ locale === 'zh-CN' ? it.title : it.title_zh }}</span>
          <span v-if="isRecent(it.id) && !isFav(it.id)" class="rec" title="Recent">⏱</span>
          <button
            class="fav-btn"
            type="button"
            :aria-label="isFav(it.id) ? 'Remove from favorites' : 'Add to favorites'"
            :aria-pressed="isFav(it.id)"
            @click="toggleFav(it, $event)"
          >
            {{ isFav(it.id) ? '★' : '☆' }}
          </button>
          <span v-if="showAdminBadge(it)" class="admin">admin</span>
          <RiskChip :level="it.risk" />
        </li>
      </ul>
      <div class="hint" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>Enter</kbd> select</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: start center;
  padding-top: 100px;
  z-index: var(--z-modal);
  animation: overlay-in var(--motion-base) var(--ease-decelerate);
}
.palette {
  width: 640px;
  max-width: 92vw;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-4);
  box-shadow: var(--shadow-3);
  overflow: hidden;
  animation: palette-in var(--motion-base) var(--ease-emphasized);
}
@keyframes overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes palette-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-size: var(--fs-lg);
  background: transparent;
  color: var(--fg);
  border: 0;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
}
input:focus {
  outline: none;
  border-color: var(--accent-1);
  box-shadow: none;
}
.quick-header {
  padding: var(--space-1) var(--space-4);
  font-size: var(--fs-xs);
  color: var(--fg-3);
  background: var(--bg-2);
  border-bottom: 1px solid var(--border-subtle);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
ul {
  list-style: none;
  margin: 0;
  padding: var(--space-1) 0;
  max-height: 400px;
  overflow: auto;
}
li {
  display: grid;
  grid-template-columns: 1fr auto auto auto auto auto;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  align-items: center;
}
li.active,
li:hover {
  background: var(--bg-hover);
}
li.empty {
  color: var(--fg-3);
  cursor: default;
  padding: var(--space-4);
  text-align: center;
}
.t {
  font-weight: 500;
}
.z {
  color: var(--fg-2);
  font-size: var(--fs-sm);
}
.admin {
  font-size: var(--fs-xs);
  padding: 1px 5px;
  border-radius: var(--radius-1);
  background: var(--warn);
  color: #fff;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.rec {
  font-size: var(--fs-sm);
  color: var(--fg-3);
}
.fav-btn {
  background: transparent;
  border: 0;
  padding: 0 var(--space-1);
  color: var(--fg-3);
  font-size: var(--fs-md);
  line-height: 1;
  border-radius: var(--radius-1);
  cursor: pointer;
}
.fav-btn:hover {
  color: var(--warn);
  background: var(--bg-2);
}
.fav-btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}
.hint {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-xs);
  color: var(--fg-3);
  background: var(--bg-2);
}
kbd {
  background: var(--bg-3);
  border: 1px solid var(--border);
  padding: 0 4px;
  border-radius: var(--radius-1);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  margin-right: 2px;
}
</style>
