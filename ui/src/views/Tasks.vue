<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/api';
import type { ScheduledTaskRow } from '@/types/api';

const rows = ref<ScheduledTaskRow[]>([]);
const err = ref<string | null>(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  err.value = null;
  try {
    rows.value = await api.taskList();
  } catch (e: unknown) {
    err.value = String(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

async function run(t: ScheduledTaskRow) {
  try {
    await api.taskRunNow({ name: t.name });
  } catch (e: unknown) {
    alert(String(e));
  }
}
</script>

<template>
  <section class="page">
    <h1>⏱ Scheduled tasks <button class="primary" @click="load">Refresh</button></h1>
    <div v-if="err" class="error">⚠ {{ err }}</div>
    <table v-if="rows.length">
      <thead>
        <tr>
          <th>Name</th>
          <th>Path</th>
          <th>State</th>
          <th>Last run</th>
          <th>Next run</th>
          <th style="width: 100px" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in rows" :key="t.path + t.name">
          <td>{{ t.name }}</td>
          <td class="path">
            {{ t.path }}
          </td>
          <td>{{ t.state }}</td>
          <td>{{ t.last_run }}</td>
          <td>{{ t.next_run }}</td>
          <td>
            <button @click="run(t)">Run now</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!loading" class="empty">No tasks.</p>
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
.path {
  font-family: monospace;
  font-size: 12px;
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
