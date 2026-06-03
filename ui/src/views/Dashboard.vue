<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSystemStore } from '@/stores/system';
import Loading from '@/components/Loading.vue';
import SkeletonList from '@/components/SkeletonList.vue';
import { seconds } from '@/utils/format';

const sys = useSystemStore();
const { t } = useI18n();
onMounted(() => sys.refresh());

const uptime = computed(() => (sys.info ? seconds(sys.info.uptime_seconds) : '…'));
</script>

<template>
  <section class="page dash">
    <h1>⊞ {{ t('dashboard.title') }}</h1>

    <div v-if="sys.error" class="banner banner-err" role="alert">
      <span aria-hidden="true">⚠</span>
      <span class="grow">{{ sys.error }}</span>
      <button type="button" @click="sys.refresh()">{{ t('common.retry') }}</button>
    </div>

    <div v-if="sys.info" class="cards">
      <article class="card">
        <h3>{{ t('dashboard.computer') }}</h3>
        <p class="big">{{ sys.info.computer_name }}</p>
      </article>
      <article class="card">
        <h3>{{ t('dashboard.user') }}</h3>
        <p class="big">{{ sys.info.user_name }}</p>
        <p class="sub mono">{{ sys.info.user_sid }}</p>
      </article>
      <article class="card">
        <h3>{{ t('dashboard.os') }}</h3>
        <p class="big">{{ sys.info.display }}</p>
        <p class="sub">
          {{ sys.info.major }}.{{ sys.info.minor }}.{{ sys.info.build }} · {{ sys.info.edition }}
        </p>
      </article>
      <article class="card">
        <h3>{{ t('dashboard.integrity') }}</h3>
        <p class="big" :class="sys.info.is_elevated ? 'ok' : 'warn'">
          {{ sys.integrity?.label ?? '…' }}
        </p>
        <p class="sub">
          {{ sys.info.is_elevated ? t('dashboard.elevated') : 'Not elevated' }}
        </p>
      </article>
      <article class="card">
        <h3>{{ t('dashboard.uptime') }}</h3>
        <p class="big">{{ uptime }}</p>
      </article>
      <article class="card">
        <h3>{{ t('dashboard.pid') }}</h3>
        <p class="big mono">{{ sys.info.pid }}</p>
      </article>
    </div>

    <div v-else-if="sys.loading" class="placeholder">
      <SkeletonList :lines="4" />
      <Loading :label="t('common.loading')" :center="false" />
    </div>
  </section>
</template>

<style scoped>
.dash {
  padding: var(--space-5);
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
}
.card {
  background: var(--bg-1);
  padding: var(--space-4);
  border-radius: var(--radius-3);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-1);
  transition:
    box-shadow var(--motion-fast) var(--ease-standard),
    transform var(--motion-fast) var(--ease-standard);
}
.card:hover {
  box-shadow: var(--shadow-2);
  transform: translateY(-1px);
}
.card h3 {
  color: var(--fg-2);
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 var(--space-2);
}
.big {
  font-size: var(--fs-lg);
  margin: 0 0 var(--space-1);
  font-weight: 600;
  color: var(--fg);
}
.sub {
  font-size: var(--fs-sm);
  color: var(--fg-3);
  margin: 0;
}
.ok {
  color: var(--ok);
}
.warn {
  color: var(--warn);
}
.banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-2);
  margin-bottom: var(--space-3);
  background: var(--err-soft);
  color: var(--err);
  border: 1px solid var(--err);
}
.placeholder {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-width: 320px;
}
</style>
