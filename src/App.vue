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
          任务配置
        </el-button>
        <el-button :type="route.path === '/tasks' ? 'primary' : 'default'" @click="router.push('/tasks')">
          <el-icon><List /></el-icon>
          任务列表
        </el-button>
        <el-button :type="route.path === '/templates' ? 'primary' : 'default'" @click="router.push('/templates')">
          <el-icon><Collection /></el-icon>
          模板市场
        </el-button>
        <el-button :type="route.path === '/settings' ? 'primary' : 'default'" @click="router.push('/settings')">
          <el-icon><Setting /></el-icon>
          设置
        </el-button>
        <el-button :type="route.path === '/clean' ? 'primary' : 'default'" @click="router.push('/clean')">
          <el-icon><Brush /></el-icon>
          数据清洗
        </el-button>
        <el-button :type="route.path === '/selector' ? 'primary' : 'default'" @click="router.push('/selector')">
          <el-icon><Aim /></el-icon>
          选择器
        </el-button>
        <el-button :type="route.path === '/screenshot' ? 'primary' : 'default'" @click="router.push('/screenshot')">
          <el-icon><Camera /></el-icon>
          截图
        </el-button>
        <el-button :type="route.path === '/analyzer' ? 'primary' : 'default'" @click="router.push('/analyzer')">
          <el-icon><Monitor /></el-icon>
          URL分析
        </el-button>
        <el-button :type="route.path === '/browser' ? 'primary' : 'default'" @click="router.push('/browser')">
          <el-icon><Connection /></el-icon>
          兼容检测
        </el-button>
        <el-button :type="route.path === '/adapter' ? 'primary' : 'default'" @click="router.push('/adapter')">
          <el-icon><Grid /></el-icon>
          界面适配
        </el-button>
      </nav>
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
        <span class="status-item">已抓取: {{ crawlStats.crawled }} 条</span>
        <span class="status-item">成功: {{ crawlStats.success }} 条</span>
        <span class="status-item" v-if="crawlStats.errors > 0">错误: {{ crawlStats.errors }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/taskStore'
import { Brush, Aim, Camera, Monitor, Connection, Grid } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()

const status = computed(() => taskStore.crawlStatus)
const statusText = computed(() => {
  switch (status.value) {
    case 'idle': return '就绪'
    case 'running': return '抓取中...'
    case 'paused': return '已暂停'
    case 'completed': return '已完成'
    case 'error': return '出错'
    default: return '就绪'
  }
})
const crawlStats = computed(() => taskStore.crawlStats)
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
  padding: 0 20px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-right: 40px;
}

.logo-text {
  font-size: 20px;
  font-weight: 600;
}

.nav-menu {
  display: flex;
  gap: 8px;
}

.nav-menu .el-button {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.85);
}

.nav-menu .el-button:hover,
.nav-menu .el-button.active {
  background: rgba(255,255,255,0.2);
  color: white;
}

.app-main {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.app-footer {
  height: 36px;
  background: white;
  border-top: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.status-bar {
  display: flex;
  gap: 30px;
  font-size: 13px;
  color: #606266;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-running {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
