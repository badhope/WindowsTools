<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/api';
import type { HostsEntry } from '@/types/api';

const rows = ref<HostsEntry[]>([]);
const err = ref<string | null>(null);
const loading = ref(false);
const editing = ref(false);
const draft = ref<HostsEntry[]>([]);

async function load() {
  loading.value = true;
  err.value = null;
  try {
    rows.value = await api.hostsList();
  } catch (e: unknown) {
    err.value = String(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function startEdit() {
  draft.value = rows.value.map((r) => ({ ...r }));
  editing.value = true;
}
function addRow() {
  draft.value.push({ ip: '127.0.0.1', hostname: '', comment: '' });
}
function delRow(i: number) {
  draft.value.splice(i, 1);
}

async function save() {
  try {
    await api.hostsWrite(draft.value);
    editing.value = false;
    await load();
  } catch (e: unknown) {
    alert(String(e));
  }
}
</script>

<template>
  <section class="page">
    <h1>
      📝 Hosts file
      <button v-if="!editing" @click="startEdit">Edit</button>
      <button v-else class="primary" @click="save">Save</button>
      <button v-if="editing" @click="editing = false">Cancel</button>
      <button class="primary" @click="load">Refresh</button>
    </h1>
    <div v-if="err" class="error">⚠ {{ err }}</div>
    <p v-if="!editing" class="hint">Viewing current hosts entries.</p>
    <table>
      <thead>
        <tr>
          <th>IP</th>
          <th>Hostname</th>
          <th>Comment</th>
          <th v-if="editing" style="width: 60px" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in editing ? draft : rows" :key="i">
          <td v-if="!editing">
            {{ r.ip }}
          </td>
          <td v-else>
            <input v-model="r.ip" />
          </td>
          <td v-if="!editing">
            {{ r.hostname }}
          </td>
          <td v-else>
            <input v-model="r.hostname" />
          </td>
          <td v-if="!editing">
            {{ r.comment || '' }}
          </td>
          <td v-else>
            <input v-model="r.comment" />
          </td>
          <td v-if="editing">
            <button class="danger" @click="delRow(i)">×</button>
          </td>
        </tr>
      </tbody>
    </table>
    <button v-if="editing" @click="addRow">+ Add entry</button>
  </section>
</template>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
}
th,
td {
  padding: 4px 8px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
th {
  background: var(--bg-2);
  font-size: 12px;
  color: var(--fg-2);
  text-transform: uppercase;
}
td input {
  width: 100%;
}
.hint {
  color: var(--fg-3);
  font-size: 12px;
}
.error {
  background: var(--err);
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 10px;
}
</style>
