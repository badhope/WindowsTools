<script setup lang="ts">
import { useI18n } from 'vue-i18n';

withDefaults(
  defineProps<{
    label?: string;
    /** Visual size of the spinner. */
    size?: 'sm' | 'md' | 'lg';
    /** Center within parent. */
    center?: boolean;
  }>(),
  { label: '', size: 'md', center: true },
);

const { t } = useI18n();
</script>

<template>
  <div class="loading" :class="{ 'is-center': center, [`is-${size}`]: true }" role="status">
    <span class="spinner" aria-hidden="true" />
    <span v-if="label" class="label muted">{{ label || t('common.loading') }}</span>
    <span class="sr-only">{{ t('common.loading') }}</span>
  </div>
</template>

<style scoped>
.loading {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--fg-2);
  font-size: var(--fs-sm);
}
.loading.is-center {
  display: flex;
  justify-content: center;
  padding: var(--space-6);
  width: 100%;
}
.spinner {
  display: inline-block;
  border: 2px solid var(--border);
  border-top-color: var(--accent-1);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
.is-sm .spinner {
  width: 12px;
  height: 12px;
  border-width: 2px;
}
.is-md .spinner {
  width: 18px;
  height: 18px;
  border-width: 2px;
}
.is-lg .spinner {
  width: 28px;
  height: 28px;
  border-width: 3px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
