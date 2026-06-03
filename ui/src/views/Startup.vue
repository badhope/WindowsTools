<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/api';
import type { StartupItem } from '@/types/api';

const rows = ref<StartupItem[]>([]);
const err = ref<string | null>(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  err.value = null;
  try {
    rows.value = await api.startupList();
  } catch (e: unknown) {
    err.value = String(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

async function disable(s: StartupItem) {
  if (!confirm(`Disable ${s.name}?`)) return;
  try {
    await api.startupDisable({ name: s.name, command: s.command, source: s.source });
    await load();
  } catch (e: unknown) {
    alert(String(e));
  }
}
</script>

<template>
  <section class="page">
    <h1>🚀 Startup <button class="primary" @click="load">Refresh</button></h1>
    <div v-if="err" class="error">⚠ {{ err }}</div>
    <table v-if="rows.length">
      <thead>
        <tr>
          <th>Name</th>
          <th>Command</th>
          <th>Source</th>
          <th>Status</th>
          <th style="width: 120px" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in rows" :key="s.name + s.source">
          <td>{{ s.name }}</td>
          <td class="cmd">
            {{ s.command }}
          </td>
          <td>{{ s.source }}</td>
          <td>
            <span :class="s.enabled ? 'on' : 'off'">{{ s.enabled ? 'enabled' : 'disabled' }}</span>
          </td>
          <td>
            <button class="danger" :disabled="!s.enabled" @click="disable(s)">Disable</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!loading" class="empty">No startup items.</p>
  </section>
</template>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 6px 10px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
th {
  background: var(--bg-2);
  font-size: 12px;
  color: var(--fg-2);
  text-transform: uppercase;
}
.cmd {
  font-family: monospace;
  font-size: 12px;
  max-width: 600px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.on {
  color: var(--ok);
}
.off {
  color: var(--fg-3);
}
.error {
  background: var(--err);
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 10px;
}
.empty {
  color: var(--fg-3);
}
</style>
