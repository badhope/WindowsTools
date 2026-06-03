<script setup lang="ts">
import { ref, computed } from 'vue';
import { api } from '@/api';

const path = ref('HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion');
const name = ref('ProductName');
const value = ref<unknown>(null);
const err = ref<string | null>(null);
const subkeys = ref<string[]>([]);
const loading = ref(false);
const listLoading = ref(false);

async function read() {
  loading.value = true;
  err.value = null;
  try {
    value.value = await api.regGet(path.value, name.value);
  } catch (e: unknown) {
    err.value = String(e);
    value.value = null;
  } finally {
    loading.value = false;
  }
}

async function list() {
  listLoading.value = true;
  err.value = null;
  try {
    subkeys.value = await api.regListSubkeys({ path: path.value });
  } catch (e: unknown) {
    err.value = String(e);
    subkeys.value = [];
  } finally {
    listLoading.value = false;
  }
}

async function del() {
  if (!confirm(`Delete value ${name.value} at ${path.value}?`)) return;
  try {
    await api.regDelValue({ path: path.value, name: name.value });
    await read();
  } catch (e: unknown) {
    alert(String(e));
  }
}

const valueText = computed(() =>
  value.value === null ? '—' : JSON.stringify(value.value, null, 2),
);
</script>

<template>
  <section class="page">
    <h1>📦 Registry</h1>
    <div class="form">
      <label>Path: <input v-model="path" /></label>
      <label>Name: <input v-model="name" /></label>
      <div class="actions">
        <button class="primary" @click="read">Read</button>
        <button @click="list">List subkeys</button>
        <button class="danger" @click="del">Delete value</button>
      </div>
    </div>
    <div v-if="err" class="error">⚠ {{ err }}</div>
    <h2>Value</h2>
    <pre class="value">{{ valueText }}</pre>
    <h2>Subkeys</h2>
    <p v-if="listLoading">Loading…</p>
    <ul v-else-if="subkeys.length" class="subkeys">
      <li
        v-for="k in subkeys"
        :key="k"
        @click="path = path + (path.endsWith('\\') ? '' : '\\') + k"
      >
        📁 {{ k }}
      </li>
    </ul>
    <p v-else class="empty">No subkeys (or path not loaded).</p>
  </section>
</template>

<style scoped>
.form {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}
.form label {
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 8px;
  align-items: center;
}
.actions {
  display: flex;
  gap: 6px;
}
.value {
  background: var(--bg-2);
  padding: 12px;
  border-radius: 4px;
  overflow: auto;
  max-height: 200px;
}
.subkeys {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 4px;
  list-style: none;
  padding: 0;
}
.subkeys li {
  padding: 4px 8px;
  background: var(--bg-2);
  border-radius: 3px;
  cursor: pointer;
}
.subkeys li:hover {
  background: var(--bg-3);
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
