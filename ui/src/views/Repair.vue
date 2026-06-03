<script setup lang="ts">
import { ref } from 'vue';
import { api } from '@/api';

const sfcOut = ref<string | null>(null);
const dismOut = ref<string | null>(null);
const sfcLoading = ref(false);
const dismLoading = ref(false);
const sfcErr = ref<string | null>(null);
const dismErr = ref<string | null>(null);

async function runSfc() {
  sfcLoading.value = true;
  sfcErr.value = null;
  sfcOut.value = null;
  try {
    sfcOut.value = JSON.stringify(await api.sfc(), null, 2);
  } catch (e: unknown) {
    sfcErr.value = String(e);
  } finally {
    sfcLoading.value = false;
  }
}
async function runDism() {
  dismLoading.value = true;
  dismErr.value = null;
  dismOut.value = null;
  try {
    dismOut.value = JSON.stringify(await api.dism(), null, 2);
  } catch (e: unknown) {
    dismErr.value = String(e);
  } finally {
    dismLoading.value = false;
  }
}
</script>

<template>
  <section class="page">
    <h1>🛠 System repair</h1>
    <p class="hint">These operations require administrator elevation and may take a long time.</p>
    <div class="actions">
      <button class="primary" :disabled="sfcLoading" @click="runSfc">
        {{ sfcLoading ? 'Running SFC…' : 'Run sfc /scannow' }}
      </button>
      <button class="primary" :disabled="dismLoading" @click="runDism">
        {{ dismLoading ? 'Running DISM…' : 'Run DISM RestoreHealth' }}
      </button>
    </div>
    <div v-if="sfcErr" class="error">SFC: {{ sfcErr }}</div>
    <div v-if="dismErr" class="error">DISM: {{ dismErr }}</div>
    <h2>SFC output</h2>
    <pre>{{ sfcOut || '—' }}</pre>
    <h2>DISM output</h2>
    <pre>{{ dismOut || '—' }}</pre>
  </section>
</template>

<style scoped>
.actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
pre {
  background: var(--bg-2);
  padding: 12px;
  border-radius: 4px;
  overflow: auto;
  max-height: 300px;
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
