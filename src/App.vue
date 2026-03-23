<template>
  <div class="app-container">
    <header class="app-header">
      <div class="logo">
        <el-icon size="28"><Spider /></el-icon>
        <span class="logo-text">VisualSpider</span>
      </div>
      <nav class="nav-menu">
        <el-button :type="route.path === '/' ? 'primary' : 'default'" @click="router.push('/')">
          <el-icon><Document /></el-icon>
          {{ $t('nav.taskConfig') }}
        </el-button>
        <el-button :type="route.path === '/tasks' ? 'primary' : 'default'" @click="router.push('/tasks')">
          <el-icon><List /></el-icon>
          {{ $t('nav.taskList') }}
        </el-button>
        <el-button :type="route.path === '/templates' ? 'primary' : 'default'" @click="router.push('/templates')">
          <el-icon><Collection /></el-icon>
          {{ $t('nav.templates') }}
        </el-button>
        <el-button :type="route.path === '/settings' ? 'primary' : 'default'" @click="router.push('/settings')">
          <el-icon><Setting /></el-icon>
          {{ $t('nav.settings') }}
        </el-button>
        <el-button :type="route.path === '/clean' ? 'primary' : 'default'" @click="router.push('/clean')">
          <el-icon><Brush /></el-icon>
          {{ $t('nav.dataClean') }}
        </el-button>
        <el-button :type="route.path === '/selector' ? 'primary' : 'default'" @click="router.push('/selector')">
          <el-icon><Aim /></el-icon>
          {{ $t('nav.selector') }}
        </el-button>
        <el-button :type="route.path === '/screenshot' ? 'primary' : 'default'" @click="router.push('/screenshot')">
          <el-icon><Camera /></el-icon>
          {{ $t('nav.screenshot') }}
        </el-button>
        <el-button :type="route.path === '/analyzer' ? 'primary' : 'default'" @click="router.push('/analyzer')">
          <el-icon><Monitor /></el-icon>
          {{ $t('nav.urlAnalyzer') }}
        </el-button>
        <el-button :type="route.path === '/browser' ? 'primary' : 'default'" @click="router.push('/browser')">
          <el-icon><Connection /></el-icon>
          {{ $t('nav.browserInfo') }}
        </el-button>
        <el-button :type="route.path === '/adapter' ? 'primary' : 'default'" @click="router.push('/adapter')">
          <el-icon><Grid /></el-icon>
          {{ $t('nav.interfaceAdapter') }}
        </el-button>
        <el-button :type="route.path === '/server' ? 'primary' : 'default'" @click="router.push('/server')">
          <el-icon><Cpu /></el-icon>
          {{ $t('nav.server') }}
        </el-button>
      </nav>
      <div class="header-actions">
        <LanguageSwitcher />
        <NotificationPanel />
        <el-button circle @click="openLogViewer">
          <el-icon><Tickets /></el-icon>
        </el-button>
      </div>
    </header>
    <main class="app-main">
      <router-view />
    </main>
    <footer class="app-footer">
      <div class="status-bar">
        <span class="status-item">
          <el-icon v-if="status === 'idle'"><CircleCheck /></el-icon>
          <el-icon v-else class="status-running"><Loading /></el-icon>
          {{ statusText }}
        </span>
        <span class="status-item">{{ $t('status.crawled') }}: {{ crawlStats.crawled }}</span>
        <span class="status-item">{{ $t('status.success') }}: {{ crawlStats.success }}</span>
        <span class="status-item" v-if="crawlStats.errors > 0">{{ $t('status.errors') }}: {{ crawlStats.errors }}</span>
      </div>
    </footer>

    <LogViewer ref="logViewerRef" />
    <ErrorDetail ref="errorDetailRef" />
    <WelcomeGuide ref="welcomeGuideRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '@/stores/taskStore'
import { useAppStore } from '@/stores/appStore'
import { Brush, Aim, Camera, Monitor, Connection, Grid, Tickets, Cpu } from '@element-plus/icons-vue'
import NotificationPanel from '@/components/NotificationPanel.vue'
import LogViewer from '@/components/LogViewer.vue'
import ErrorDetail from '@/components/ErrorDetail.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import WelcomeGuide from '@/components/WelcomeGuide.vue'

const { t } = useI18n()
const route = useRoute()
const welcomeGuideRef = ref<InstanceType<typeof WelcomeGuide> | null>(null)
const router = useRouter()
const taskStore = useTaskStore()
const appStore = useAppStore()

const logViewerRef = ref<InstanceType<typeof LogViewer> | null>(null)
const errorDetailRef = ref<InstanceType<typeof ErrorDetail> | null>(null)

const status = computed(() => taskStore.crawlStatus)
const statusText = computed(() => {
  switch (status.value) {
    case 'idle': return t('status.idle')
    case 'running': return t('status.running')
    case 'paused': return t('status.paused')
    case 'completed': return t('status.completed')
    case 'error': return t('status.error')
    default: return t('status.idle')
  }
})
const crawlStats = computed(() => taskStore.crawlStats)

function openLogViewer(): void {
  logViewerRef.value?.open()
}

onMounted(() => {
  appStore.initialize()
  taskStore.loadTasks()
  welcomeGuideRef.value?.checkShouldShow()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}

.app-header {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  gap: 8px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  color: #409eff;
  font-weight: 600;
  font-size: 18px;
}

.logo-text {
  white-space: nowrap;
}

.nav-menu {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
}

.nav-menu .el-button {
  font-size: 13px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.app-footer {
  background: white;
  border-top: 1px solid #e4e7ed;
  padding: 8px 20px;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 12px;
  color: #606266;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-running {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
