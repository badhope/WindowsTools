<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useUiStore } from '@/stores/ui';
import { useSystemStore } from '@/stores/system';
import Loading from '@/components/Loading.vue';

const { t } = useI18n();
const ui = useUiStore();
const sys = useSystemStore();
</script>

<template>
  <section class="page">
    <h1>⚙ {{ t('settings.title') }}</h1>

    <h2>{{ t('settings.appearance') }}</h2>
    <div class="form">
      <label class="field">
        <span class="field-label">{{ t('settings.theme') }}</span>
        <select v-model="ui.theme">
          <option value="dark">{{ t('settings.themeDark') }}</option>
          <option value="light">{{ t('settings.themeLight') }}</option>
        </select>
      </label>
      <label class="field">
        <span class="field-label">{{ t('settings.language') }}</span>
        <select v-model="ui.lang">
          <option value="en">English</option>
          <option value="zh-CN">简体中文</option>
        </select>
      </label>
    </div>

    <h2>{{ t('settings.system') }}</h2>
    <div class="row">
      <button class="primary" :disabled="sys.loading" @click="sys.refresh()">
        {{ t('settings.refreshInfo') }}
      </button>
      <Loading v-if="sys.loading" :center="false" :size="'sm'" />
    </div>
    <div v-if="sys.error" class="banner banner-err" role="alert">
      <span aria-hidden="true">⚠</span>
      <span class="grow">{{ sys.error }}</span>
    </div>
    <pre v-if="sys.info" class="info">{{ JSON.stringify(sys.info, null, 2) }}</pre>

    <h2>{{ t('settings.about') }}</h2>
    <p class="muted">{{ t('settings.aboutBody') }}</p>
  </section>
</template>

<style scoped>
.form {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 180px;
}
.field-label {
  font-size: var(--fs-sm);
  color: var(--fg-2);
}
.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.info {
  background: var(--bg-2);
  padding: var(--space-3);
  border-radius: var(--radius-2);
  overflow: auto;
  max-height: 320px;
  font-size: var(--fs-sm);
  border: 1px solid var(--border-subtle);
}
.banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-2);
  margin: var(--space-3) 0;
  background: var(--err-soft);
  color: var(--err);
  border: 1px solid var(--err);
}
</style>
