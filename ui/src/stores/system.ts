import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api';
import type { SystemInfo, IntegrityInfo } from '@/types/api';

export const useSystemStore = defineStore('system', () => {
  const info = ref<SystemInfo | null>(null);
  const integrity = ref<IntegrityInfo | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function refresh() {
    loading.value = true;
    error.value = null;
    try {
      const [i, ig] = await Promise.all([api.systemInfo(), api.integrity()]);
      info.value = i;
      integrity.value = ig;
    } catch (e: unknown) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  return { info, integrity, loading, error, refresh };
});
