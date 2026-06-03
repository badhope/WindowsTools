<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Number of skeleton lines to render. */
    lines?: number;
    /** Width of each line: 'full' (100%), 'lg' (75%), 'md' (50%), 'sm' (25%). */
    width?: 'full' | 'lg' | 'md' | 'sm';
    /** Optional fixed height in px. */
    height?: number;
  }>(),
  { lines: 3, width: 'full', height: 0 },
);

const items = computed(() => Array.from({ length: props.lines }, (_, i) => i));
</script>

<template>
  <div class="skeleton-list" aria-hidden="true">
    <span
      v-for="i in items"
      :key="i"
      class="skeleton"
      :class="`w-${width}`"
      :style="height ? { height: `${height}px` } : undefined"
    />
  </div>
</template>

<style scoped>
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2) 0;
}
.skeleton {
  display: block;
  height: 12px;
}
.w-full {
  width: 100%;
}
.w-lg {
  width: 75%;
}
.w-md {
  width: 50%;
}
.w-sm {
  width: 25%;
}
</style>
