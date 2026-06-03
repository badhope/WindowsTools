<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/api';
import type { TcpConnRow, UdpRow } from '@/types/api';

const tcp = ref<TcpConnRow[]>([]);
const udp = ref<UdpRow[]>([]);
const tab = ref<'tcp' | 'udp'>('tcp');
const err = ref<string | null>(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  err.value = null;
  try {
    const [tcpRows, udpRows] = await Promise.all([api.netTcpTable(), api.netUdpTable()]);
    tcp.value = Array.isArray(tcpRows) ? tcpRows : [];
    udp.value = Array.isArray(udpRows) ? udpRows : [];
  } catch (e: unknown) {
    err.value = String(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>

<template>
  <section class="page">
    <h1>🌐 Network <button class="primary" @click="load">Refresh</button></h1>
    <div class="tabs">
      <button :class="{ active: tab === 'tcp' }" @click="tab = 'tcp'">
        TCP ({{ tcp.length }})
      </button>
      <button :class="{ active: tab === 'udp' }" @click="tab = 'udp'">
        UDP ({{ udp.length }})
      </button>
    </div>
    <div v-if="err" class="error">⚠ {{ err }}</div>
    <table v-if="tab === 'tcp' && tcp.length">
      <thead>
        <tr>
          <th>Local</th>
          <th>Remote</th>
          <th>State</th>
          <th>PID</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in tcp" :key="i">
          <td>{{ r.local }}</td>
          <td>{{ r.remote }}</td>
          <td>{{ r.state }}</td>
          <td>{{ r.pid }}</td>
        </tr>
      </tbody>
    </table>
    <table v-else-if="tab === 'udp' && udp.length">
      <thead>
        <tr>
          <th>Local</th>
          <th>PID</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in udp" :key="i">
          <td>{{ r.local }}</td>
          <td>{{ r.pid }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!loading" class="empty">No entries.</p>
  </section>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}
.tabs .active {
  background: var(--accent-1);
  color: var(--fg-on-accent);
  border: 0;
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
