<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/api';
import { bytes } from '@/utils/format';
import type { VolumeRow } from '@/types/api';

const rows = ref<VolumeRow[]>([]);
const err = ref<string | null>(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  err.value = null;
  try {
    rows.value = await api.diskDrives();
  } catch (e: unknown) {
    err.value = String(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function pct(v: VolumeRow): number {
  if (!v.total_bytes) return 0;
  return ((v.total_bytes - v.free_bytes) / v.total_bytes) * 100;
}
</script>

<template>
  <section class="page">
    <h1>💾 Disk <button class="primary" @click="load">Refresh</button></h1>
    <div v-if="err" class="error">⚠ {{ err }}</div>
    <table v-if="rows.length">
      <thead>
        <tr>
          <th>Mount</th>
          <th>Label</th>
          <th>FS</th>
          <th>Total</th>
          <th>Free</th>
          <th>Used</th>
          <th>Type</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.mount_point">
          <td>{{ r.mount_point }}</td>
          <td>{{ r.label }}</td>
          <td>{{ r.fs }}</td>
          <td>{{ bytes(r.total_bytes) }}</td>
          <td>{{ bytes(r.free_bytes) }}</td>
          <td>
            <div class="bar">
              <div
                class="fill"
                :style="{ width: pct(r) + '%' }"
                :class="pct(r) > 90 ? 'crit' : pct(r) > 75 ? 'warn' : 'ok'"
              />
            </div>
            <span class="pct">{{ pct(r).toFixed(0) }}%</span>
          </td>
          <td>{{ r.kind }}</td>
          <td />
        </tr>
      </tbody>
    </table>
    <p v-else-if="!loading" class="empty">No volumes.</p>
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
.bar {
  display: inline-block;
  width: 120px;
  height: 8px;
  background: var(--bg-3);
  border-radius: 4px;
  vertical-align: middle;
  overflow: hidden;
}
.fill {
  height: 100%;
  transition: width 0.3s;
}
.fill.ok {
  background: var(--ok);
}
.fill.warn {
  background: var(--warn);
}
.fill.crit {
  background: var(--err);
}
.pct {
  font-size: 12px;
  color: var(--fg-2);
  margin-left: 6px;
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
