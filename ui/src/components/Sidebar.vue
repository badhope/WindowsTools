<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useUiStore } from '@/stores/ui';

const { t } = useI18n();
const ui = useUiStore();
const route = useRoute();

const items = [
  { to: '/', icon: '⊞', key: 'dashboard' },
  { to: '/processes', icon: '⚙', key: 'processes' },
  { to: '/services', icon: '🔧', key: 'services' },
  { to: '/registry', icon: '📦', key: 'registry' },
  { to: '/network', icon: '🌐', key: 'network' },
  { to: '/disk', icon: '💾', key: 'disk' },
  { to: '/startup', icon: '🚀', key: 'startup' },
  { to: '/performance', icon: '📈', key: 'performance' },
  { to: '/hosts', icon: '📝', key: 'hosts' },
  { to: '/repair', icon: '🛠', key: 'repair' },
  { to: '/tasks', icon: '⏱', key: 'tasks' },
  { to: '/settings', icon: '⚙', key: 'settings' },
];

const collapseTitle = computed(() => (ui.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'));
</script>

<template>
  <nav class="sidebar" :class="{ collapsed: ui.sidebarCollapsed }" :aria-label="t('app.name')">
    <button
      class="collapse"
      type="button"
      :aria-expanded="!ui.sidebarCollapsed"
      :aria-label="collapseTitle"
      :title="collapseTitle"
      @click="ui.sidebarCollapsed = !ui.sidebarCollapsed"
    >
      {{ ui.sidebarCollapsed ? '›' : '‹' }}
    </button>
    <ul class="menu" role="list">
      <li v-for="it in items" :key="it.to">
        <RouterLink
          :to="it.to"
          class="item"
          :class="{ active: route.path === it.to }"
          :aria-current="route.path === it.to ? 'page' : undefined"
        >
          <span class="icon" aria-hidden="true">{{ it.icon }}</span>
          <span v-if="!ui.sidebarCollapsed" class="label">{{ t(`nav.${it.key}`) }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.sidebar {
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  padding: var(--space-2) 0;
  border-right: 1px solid var(--border);
  width: var(--sidebar-w);
  transition: width var(--motion-base) var(--ease-standard);
}
.sidebar.collapsed {
  width: var(--sidebar-w-collapsed);
}
.menu {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.collapse {
  align-self: flex-end;
  margin: 0 var(--space-1) var(--space-2);
  background: transparent;
  border: 0;
  color: var(--fg-2);
  font-size: var(--fs-lg);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-2);
}
.collapse:hover {
  background: var(--bg-hover);
  color: var(--fg);
}
.collapse:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}
.item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  color: var(--fg);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  border-radius: var(--radius-2);
  margin: 0 var(--space-1);
  transition:
    background var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}
.item:hover {
  background: var(--bg-hover);
  text-decoration: none;
}
.item:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}
.item.active {
  background: var(--accent-1);
  color: var(--fg-on-accent);
  font-weight: 600;
}
.icon {
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}
</style>
