<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { api } from '@/api';
import type { ServiceRow } from '@/types/api';

const rows = ref<ServiceRow[]>([]);
const filter = ref('');
const loading = ref(false);
const err = ref<string | null>(null);

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter(
    (r) => r.name.toLowerCase().includes(q) || (r.display || '').toLowerCase().includes(q),
  );
});

async function load() {
  loading.value = true;
  err.value = null;
  try {
    rows.value = await api.serviceList();
  } catch (e: unknown) {
    err.value = String(e);
  } finally {
    loading.value = false;
  }
}

async function start(s: ServiceRow) {
  try {
    await api.serviceStart(s.name);
    await load();
  } catch (e: unknown) {
    alert(String(e));
  }
}
async function stop(s: ServiceRow) {
  if (!confirm(`Stop service ${s.name}?`)) return;
  try {
    await api.serviceStop(s.name);
    await load();
  } catch (e: unknown) {
    alert(String(e));
  }
}

onMounted(load);
</script>

<template>
  <section class="page">
    <h1>🔧 Services <button class="primary" @click="load">Refresh</button></h1>
    <div class="toolbar">
      <input v-model="filter" placeholder="Filter by name or display…" />
      <span class="count">{{ filtered.length }} / {{ rows.length }}</span>
    </div>
    <div v-if="err" class="error">⚠ {{ err }}</div>
    <table v-if="filtered.length">
      <thead>
        <tr>
          <th>Name</th>
          <th>Display</th>
          <th>Status</th>
          <th>Start type</th>
          <th>PID</th>
          <th style="width: 140px" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in filtered" :key="r.name">
          <td>{{ r.name }}</td>
          <td>{{ r.display }}</td>
          <td>
            <span :class="['status', r.status]">{{ r.status }}</span>
          </td>
          <td>{{ r.start_type }}</td>
          <td>{{ r.pid || '—' }}</td>
          <td>
            <button :disabled="r.status === 'running'" @click="start(r)">Start</button>
            <button
              class="danger"
              :disabled="r.status !== 'running' || !r.can_stop"
              @click="stop(r)"
            >
              Stop
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!loading" class="empty">No services.</p>
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.count {
  color: var(--fg-3);
  font-size: 12px;
}
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
tbody tr:hover {
  background: var(--bg-2);
}
.status {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
}
.status.running {
  background: var(--ok);
  color: #fff;
}
.status.stopped {
  background: var(--bg-3);
  color: var(--fg);
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
