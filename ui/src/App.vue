<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useUiStore } from '@/stores/ui';
import { useCommandStore } from '@/stores/command';
import Sidebar from '@/components/Sidebar.vue';
import StatusBar from '@/components/StatusBar.vue';
import CommandPalette from '@/components/CommandPalette.vue';

const ui = useUiStore();
const cmd = useCommandStore();
const router = useRouter();
const { locale } = useI18n();

ui.initTheme();
ui.initLang();
cmd.load();

// Keep vue-i18n in sync with the Pinia language preference.
watch(
  () => ui.lang,
  (next) => {
    locale.value = next as 'en' | 'zh-CN';
    try {
      localStorage.setItem('wt:lang', next);
    } catch {
      /* ignore */
    }
  },
  { immediate: true },
);

// Reset scroll on every navigation so long lists don't keep the user
// pinned to the bottom of the previous page.
const onRouteChange = () => {
  // next tick: the new view needs to mount before we can scroll its container
  requestAnimationFrame(() => {
    const main = document.querySelector<HTMLElement>('main.main');
    if (main) main.scrollTo({ top: 0 });
  });
};
router.afterEach(onRouteChange);

let escListener: ((e: KeyboardEvent) => void) | null = null;
let cmdKListener: ((e: KeyboardEvent) => void) | null = null;

onMounted(() => {
  escListener = (e) => {
    if (e.key === 'Escape') ui.closePalette();
  };
  cmdKListener = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      ui.togglePalette();
    }
  };
  window.addEventListener('keydown', escListener);
  window.addEventListener('keydown', cmdKListener);
});
onUnmounted(() => {
  if (escListener) window.removeEventListener('keydown', escListener);
  if (cmdKListener) window.removeEventListener('keydown', cmdKListener);
});
</script>

<template>
  <a class="skip-link" href="#main-content">{{
    $t('common.skipToContent') || 'Skip to content'
  }}</a>
  <div class="app">
    <Sidebar />
    <main id="main-content" class="main" tabindex="-1">
      <RouterView v-slot="{ Component, route }">
        <Transition name="page" mode="out-in" appear>
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </main>
    <StatusBar />
    <CommandPalette v-if="ui.paletteOpen" />
  </div>
</template>

<style scoped>
.app {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr 28px;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
.main {
  overflow: auto;
  outline: none; /* programmatic focus shouldn't draw an extra ring */
}
.main:focus-visible {
  box-shadow: inset 0 0 0 2px var(--accent-1);
}

.skip-link {
  position: absolute;
  top: -100px;
  left: var(--space-3);
  background: var(--accent-1);
  color: var(--fg-on-accent);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-2);
  z-index: var(--z-toast);
  font-weight: 600;
  text-decoration: none;
  transition: top var(--motion-fast) var(--ease-standard);
}
.skip-link:focus {
  top: var(--space-3);
}

/* Page transition */
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-enter-active {
  transition:
    opacity var(--motion-base) var(--ease-decelerate),
    transform var(--motion-base) var(--ease-decelerate);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.page-leave-active {
  transition:
    opacity var(--motion-fast) var(--ease-standard),
    transform var(--motion-fast) var(--ease-standard);
}
</style>
