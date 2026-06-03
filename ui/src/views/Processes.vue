<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { api } from '@/api';
import { bytes } from '@/utils/format';
import type { ProcessRow } from '@/types/api';
import ResourceState from '@/components/ResourceState.vue';
import Loading from '@/components/Loading.vue';

const { t } = useI18n();
const rows = ref<ProcessRow[]>([]);
const filter = ref('');
const loading = ref(false);
const err = ref<string | null>(null);

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase();
  if (!q) return rows.value;
  return rows.value.filter((r) => r.name.toLowerCase().includes(q) || String(r.pid).includes(q));
});

async function load() {
  loading.value = true;
  err.value = null;
  try {
    rows.value = await api.processList();
  } catch (e: unknown) {
    err.value = String(e);
  } finally {
    loading.value = false;
  }
}

async function kill(p: ProcessRow) {
  if (!confirm(t('common.confirm') + `: ${p.name} (PID ${p.pid})?`)) return;
  try {
    await api.processKill({ pid: p.pid, tree: false });
    await load();
  } catch (e: unknown) {
    alert(String(e));
  }
}

onMounted(load);
</script>

<template>
  <section class="page">
    <h1>
      ⚙ {{ t('nav.processes') }}
      <button class="primary" @click="load">{{ t('common.refresh') }}</button>
    </h1>
    <div class="toolbar">
      <input v-model="filter" :placeholder="t('common.search')" aria-label="Filter" />
      <span class="count">{{ filtered.length }} / {{ rows.length }}</span>
    </div>

    <Loading v-if="loading && rows.length === 0" :label="t('common.loading')" />

    <table v-else-if="filtered.length" class="data-table">
      <thead>
        <tr>
          <th style="width: 80px">{{ t('dashboard.pid') }}</th>
          <th>Name</th>
          <th>User</th>
          <th>Parent</th>
          <th>Threads</th>
          <th>Memory</th>
          <th style="width: 80px"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in filtered" :key="r.pid">
          <td class="mono">{{ r.pid }}</td>
          <td>{{ r.name }}</td>
          <td>{{ r.user }}</td>
          <td class="mono">{{ r.parent_pid }}</td>
          <td class="mono">{{ r.threads }}</td>
          <td class="mono">{{ bytes(r.working_set_bytes) }}</td>
          <td>
            <button class="danger" @click="kill(r)">{{ t('common.kill') }}</button>
          </td>
        </tr>
      </tbody>
    </table>

    <ResourceState v-else :error="err" :loading="loading" @retry="load" />
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.count {
  color: var(--fg-3);
  font-size: var(--fs-sm);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th,
.data-table td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--border-subtle);
}
.data-table th {
  background: var(--bg-2);
  font-size: var(--fs-xs);
  color: var(--fg-2);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  position: sticky;
  top: 0;
  z-index: 1;
}
.data-table tbody tr {
  transition: background var(--motion-fast) var(--ease-standard);
}
.data-table tbody tr:hover {
  background: var(--bg-hover);
}
</style>
