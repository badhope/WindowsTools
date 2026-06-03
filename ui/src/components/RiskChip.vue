<script setup lang="ts">
import { computed } from 'vue';

type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';

const props = withDefaults(
  defineProps<{
    level: string;
    /** Optional override label; falls back to a humanised level. */
    label?: string;
  }>(),
  { label: '' },
);

const normalized = computed<RiskLevel>(() => {
  const v = props.level.toLowerCase();
  if (v === 'low') return 'low';
  if (v === 'medium' || v === 'mediumplus') return 'medium';
  if (v === 'high') return 'high';
  return 'unknown';
});

const display = computed(() => props.label || normalized.value);
</script>

<template>
  <span class="chip" :class="`chip-risk-${normalized}`" :title="display">
    {{ display }}
  </span>
</template>
