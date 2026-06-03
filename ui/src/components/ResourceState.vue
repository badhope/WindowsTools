<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Loading from './Loading.vue';

const props = withDefaults(
  defineProps<{
    /** Whether the resource is currently being fetched. */
    loading?: boolean;
    /** Error message; when truthy the error state is shown. */
    error?: string | null;
    /** Override the title shown in the empty state. */
    emptyTitle?: string;
    /** Override the description shown in the empty state. */
    emptyDescription?: string;
    /** Optional CTA button label. */
    actionLabel?: string;
  }>(),
  {
    loading: false,
    error: null,
    emptyTitle: '',
    emptyDescription: '',
    actionLabel: '',
  },
);

const emit = defineEmits<{
  (e: 'action'): void;
  (e: 'retry'): void;
}>();

const { t } = useI18n();

const resolvedEmptyTitle = computed(() => props.emptyTitle || t('common.empty.title'));
const resolvedEmptyDescription = computed(
  () => props.emptyDescription || t('common.empty.description'),
);
</script>

<template>
  <Loading v-if="loading" :label="t('common.loading')" />
  <div v-else-if="error" class="state state-error" role="alert">
    <div class="state-icon" aria-hidden="true">!</div>
    <h2>{{ t('common.error.title') }}</h2>
    <p class="muted">{{ error }}</p>
    <button class="primary" type="button" @click="emit('retry')">
      {{ t('common.retry') }}
    </button>
  </div>
  <div v-else class="state state-empty" role="status">
    <div class="state-icon" aria-hidden="true">~</div>
    <h2>{{ resolvedEmptyTitle }}</h2>
    <p class="muted">{{ resolvedEmptyDescription }}</p>
    <button v-if="actionLabel" type="button" @click="emit('action')">
      {{ actionLabel }}
    </button>
    <slot name="empty" />
  </div>
</template>

<style scoped>
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-4);
  text-align: center;
  color: var(--fg-2);
  min-height: 220px;
}
.state h2 {
  margin: 0;
  color: var(--fg);
}
.state-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
  background: var(--bg-2);
  color: var(--fg-2);
  border: 1px solid var(--border-subtle);
}
.state-error .state-icon {
  background: var(--err-soft);
  color: var(--err);
  border-color: transparent;
}
.state-error h2 {
  color: var(--err);
}
</style>
