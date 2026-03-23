<template>
  <div class="server-manager">
    <el-card class="status-card">
      <template #header>
        <div class="card-header">
          <span>�服务器状态</span>
          <el-button type="primary" @click="checkStatus" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新状态
          </el-button>
        </div>
      </template>

      <div v-if="!serverConnected" class="connect-section">
        <el-alert type="info" :closable="false" show-icon>
          <template #title>
            连接到后端服务器
          </template>
          <template #default>
            请确保后端服务已启动（运行 <code>npm run dev:server</code>）
          </template>
        </el-alert>

        <el-form class="connect-form" label-width="120px">
          <el-form-item label="服务器地址">
            <el-input v-model="serverUrl" placeholder="http://localhost:3000" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="connectToServer">连接</el-button>
            <el-button @click="startLocalServer" :loading="startingServer">
              启动本地服务器
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <div v-else class="status-section">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="服务器状态">
            <el-tag type="success">运行中</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="版本">
            {{ serverStatus?.version || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="Node.js">
            <el-tag :type="envStatus?.node?.installed ? 'success' : 'danger'">
              {{ envStatus?.node?.version || '未安装' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Chromium">
            <el-tag :type="envStatus?.chromium?.canLaunch ? 'success' : 'warning'">
              {{ envStatus?.chromium?.canLaunch ? '就绪' : '未就绪' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <h4>🔧 环境状态</h4>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="系统平台">
            {{ envStatus?.system?.platform }} ({{ envStatus?.system?.arch }})
          </el-descriptions-item>
          <el-descriptions-item label="内存">
            {{ envStatus?.system?.memory ? `${envStatus.system.memory}MB` : '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="npm">
            {{ envStatus?.npm?.version || '未安装' }}
          </el-descriptions-item>
          <el-descriptions-item label="Puppeteer">
            {{ envStatus?.puppeteer?.version || '未安装' }}
          </el-descriptions-item>
          <el-descriptions-item label="Chromium路径">
            {{ envStatus?.chromium?.path || '未找到' }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="envStatus?.issues?.length" class="issues-section">
          <el-divider />
          <h4>⚠️ 问题列表</h4>
          <el-alert
            v-for="(issue, idx) in envStatus.issues"
            :key="idx"
            type="warning"
            :closable="false"
            show-icon
            class="issue-item"
          >
            {{ issue }}
          </el-alert>

          <h4>💡 建议</h4>
          <el-alert
            v-for="(rec, idx) in envStatus.recommendations"
            :key="idx"
            type="info"
            :closable="false"
            show-icon
            class="issue-item"
          >
            {{ rec }}
          </el-alert>
        </div>

        <el-divider />

        <div class="action-buttons">
          <el-button type="primary" @click="setupEnvironment" :loading="settingUp">
            <el-icon><Setting /></el-icon>
            自动配置环境
          </el-button>
          <el-button type="danger" @click="disconnectServer">
            断开连接
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card v-if="serverConnected" class="quick-actions-card">
      <template #header>
        <span>⚡ 快速操作</span>
      </template>

      <el-space wrap>
        <el-button type="success" @click="launchBrowser">
          <el-icon><Monitor /></el-icon>
          启动浏览器
        </el-button>
        <el-button @click="closeBrowser">
          <el-icon><Close /></el-icon>
          关闭浏览器
        </el-button>
        <el-button type="warning" @click="testBrowser">
          <el-icon><VideoPlay /></el-icon>
          测试浏览器
        </el-button>
      </el-space>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiService, type ServerStatus, type EnvStatus } from '@/services/api'
import { useAppStore } from '@/stores/appStore'
import { storeToRefs } from 'pinia'

const appStore = useAppStore()
const { serverUrl: storeServerUrl } = storeToRefs(appStore)

const loading = ref(false)
const startingServer = ref(false)
const settingUp = ref(false)
const serverConnected = ref(false)
const serverUrl = ref(storeServerUrl || 'http://localhost:3000')
const serverStatus = ref<ServerStatus | null>(null)
const envStatus = ref<EnvStatus | null>(null)

const checkHealth = async () => {
  const status = await apiService.checkHealth()
  serverConnected.value = status !== null
  if (status) {
    serverStatus.value = status
  }
  return status !== null
}

const checkStatus = async () => {
  loading.value = true
  try {
    if (!(await checkHealth())) {
      ElMessage.warning('无法连接到服务器')
      return
    }

    const status = await apiService.getStatus()
    if (status) {
      envStatus.value = status
    }
  } catch (error: any) {
    ElMessage.error(`检查状态失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const connectToServer = async () => {
  apiService.setServerUrl(serverUrl.value)
  appStore.setServerUrl(serverUrl.value)

  if (await checkHealth()) {
    ElMessage.success('已连接到服务器')
    await checkStatus()
  } else {
    ElMessage.error('无法连接到服务器，请确保服务器已启动')
  }
}

const disconnectServer = () => {
  serverConnected.value = false
  serverStatus.value = null
  envStatus.value = null
  ElMessage.info('已断开服务器连接')
}

const startLocalServer = async () => {
  startingServer.value = true

  ElMessage.info('正在检查环境...')

  try {
    const status = await apiService.getStatus()
    if (status) {
      ElMessage.success('服务器已运行')
      serverConnected.value = true
      envStatus.value = status
      return
    }
  } catch {}

  ElMessageBox.confirm(
    '需要在新的终端窗口中启动服务器。\n\n请打开一个新的终端窗口并运行：\n\ncd server && npm run dev',
    '启动服务器',
    {
      confirmButtonText: '我已启动',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    if (await checkHealth()) {
      ElMessage.success('服务器连接成功')
      await checkStatus()
    } else {
      ElMessage.error('服务器未运行')
    }
  }).catch(() => {}).finally(() => {
    startingServer.value = false
  })
}

const setupEnvironment = async () => {
  settingUp.value = true
  try {
    const result = await apiService.setupEnvironment()
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.warning(result.message)
    }
    await checkStatus()
  } catch (error: any) {
    ElMessage.error(`配置失败: ${error.message}`)
  } finally {
    settingUp.value = false
  }
}

const launchBrowser = async () => {
  try {
    const result = await apiService.launchBrowser()
    if (result.success) {
      ElMessage.success(`浏览器已启动 (${result.version})`)
    }
  } catch (error: any) {
    ElMessage.error(`启动浏览器失败: ${error.message}`)
  }
}

const closeBrowser = async () => {
  try {
    const result = await apiService.closeBrowser()
    if (result.success) {
      ElMessage.success('浏览器已关闭')
    }
  } catch (error: any) {
    ElMessage.error(`关闭浏览器失败: ${error.message}`)
  }
}

const testBrowser = async () => {
  try {
    await launchBrowser()
    await new Promise(resolve => setTimeout(resolve, 2000))

    const result = await apiService.takeScreenshot('https://www.baidu.com')
    if (result.success) {
      ElMessage.success('浏览器测试成功！')
    }
  } catch (error: any) {
    ElMessage.error(`测试失败: ${error.message}`)
  }
}

onMounted(async () => {
  if (await checkHealth()) {
    await checkStatus()
  }
})
</script>

<style scoped>
.server-manager {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.connect-section {
  max-width: 600px;
  margin: 0 auto;
}

.connect-form {
  margin-top: 20px;
}

.status-section h4 {
  margin: 15px 0 10px;
}

.issues-section {
  margin-top: 10px;
}

.issue-item {
  margin-bottom: 8px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.quick-actions-card {
  margin-top: 20px;
}
</style>
