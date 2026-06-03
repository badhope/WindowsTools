<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { Channel } from '@tauri-apps/api/core';
import { api } from '@/api';
import { bytes, percent } from '@/utils/format';
import type { PerfSample } from '@/types/api';

const sample = ref<PerfSample | null>(null);
const history = ref<PerfSample[]>([]);
const err = ref<string | null>(null);
let channel: Channel<PerfSample> | null = null;

onMounted(async () => {
  try {
    channel = new Channel<PerfSample>();
    channel.onmessage = (m) => {
      sample.value = m;
      history.value.push(m);
      if (history.value.length > 60) history.value.shift();
    };
    await api.perfStream(channel);
  } catch (_e: unknown) {
    err.value =
      'Performance stream unavailable in browser preview. Run inside the Tauri shell for live PDH samples.';
  }
});
onUnmounted(() => {
  channel = null;
});

const cpuPct = (n: number) => percent(n);
const memPct = (s: PerfSample) =>
  s.mem_total_bytes ? (s.mem_used_bytes / s.mem_total_bytes) * 100 : 0;

function spark(arr: number[]): string {
  if (arr.length < 2) return '';
  const max = Math.max(...arr, 1);
  const w = 300,
    h = 40,
    step = w / (arr.length - 1);
  return arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${i * step},${h - (v / max) * h}`).join(' ');
}
const cpuPath = () => spark(history.value.map((s) => s.cpu_percent));
</script>

<template>
  <section class="page">
    <h1>📈 Performance</h1>
    <div v-if="err" class="error">⚠ {{ err }}</div>
    <div v-if="sample" class="cards">
      <div class="card">
        <h3>CPU</h3>
        <p class="big">
          {{ cpuPct(sample.cpu_percent) }}
        </p>
        <svg width="300" height="40">
          <path :d="cpuPath()" stroke="var(--accent-1)" fill="none" stroke-width="2" />
        </svg>
      </div>
      <div class="card">
        <h3>Memory</h3>
        <p class="big">{{ bytes(sample.mem_used_bytes) }} / {{ bytes(sample.mem_total_bytes) }}</p>
        <div class="bar">
          <div class="fill" :style="{ width: memPct(sample) + '%' }" />
        </div>
        <p class="sub">{{ memPct(sample).toFixed(1) }}% used</p>
      </div>
      <div class="card">
        <h3>Disk I/O</h3>
        <p class="big">↓ {{ bytes(sample.disk_read_bytes_per_sec) }}/s</p>
        <p class="big">↑ {{ bytes(sample.disk_write_bytes_per_sec) }}/s</p>
      </div>
    </div>
    <p v-else class="empty">Sampling…</p>
  </section>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}
.card {
  background: var(--bg-2);
  padding: 16px;
  border-radius: 6px;
  border: 1px solid var(--border);
}
.card h3 {
  color: var(--fg-2);
  font-size: 12px;
  text-transform: uppercase;
}
.big {
  font-size: 22px;
  margin: 6px 0;
  font-weight: 600;
}
.sub {
  color: var(--fg-3);
  font-size: 12px;
  margin: 0;
}
.bar {
  height: 8px;
  background: var(--bg-3);
  border-radius: 4px;
  overflow: hidden;
}
.fill {
  height: 100%;
  background: var(--accent-1);
  transition: width 0.3s;
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
