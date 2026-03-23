<template>
  <el-drawer
    v-model="visible"
    title="日志查看器"
    direction="rtl"
    size="500px"
  >
    <div class="log-viewer">
      <div class="log-header">
        <el-space>
          <el-select v-model="levelFilter" placeholder="日志级别" size="small" style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="调试" value="debug" />
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warn" />
            <el-option label="错误" value="error" />
          </el-select>
          <el-select v-model="categoryFilter" placeholder="分类" size="small" style="width: 120px">
            <el-option label="全部" value="" />
            <el-option
              v-for="cat in categories"
              :key="cat"
              :label="cat"
              :value="cat"
            />
          </el-select>
        </el-space>
        <el-space>
          <el-button size="small" @click="handleExport">导出</el-button>
          <el-button size="small" type="danger" @click="handleClear">清空</el-button>
        </el-space>
      </div>

      <div class="log-stats">
        <el-tag type="info" size="small">总数: {{ stats.debug + stats.info + stats.warn + stats.error + stats.critical }}</el-tag>
        <el-tag type="primary" size="small">调试: {{ stats.debug }}</el-tag>
        <el-tag type="success" size="small">信息: {{ stats.info }}</el-tag>
        <el-tag type="warning" size="small">警告: {{ stats.warn }}</el-tag>
        <el-tag type="danger" size="small">错误: {{ stats.error }}</el-tag>
      </div>

      <div class="log-list" ref="logListRef">
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="log-entry"
          :class="log.level"
        >
          <div class="log-entry-header">
            <span class="log-level" :class="log.level">
              {{ getLevelLabel(log.level) }}
            </span>
            <span class="log-category">{{ log.category }}</span>
            <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          </div>
          <div class="log-message">{{ log.message }}</div>
          <div class="log-details" v-if="log.details">
            <pre>{{ JSON.stringify(log.details, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/appStore'
import type { LogLevel } from '@/utils/errorHandler'

const appStore = useAppStore()

const visible = ref(false)
const levelFilter = ref<LogLevel | ''>('')
const categoryFilter = ref('')
const logListRef = ref<HTMLElement | null>(null)

const logs = computed(() => appStore.getLogs({ limit: 200 }))
const stats = computed(() => appStore.getLogStats())

const categories = computed(() => {
  const cats = new Set<string>()
  logs.value.forEach(log => cats.add(log.category))
  return Array.from(cats)
})

const filteredLogs = computed(() => {
  let result = [...logs.value].reverse()

  if (levelFilter.value) {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical']
    const levelIndex = levels.indexOf(levelFilter.value as LogLevel)
    result = result.filter(log => levels.indexOf(log.level) >= levelIndex)
  }

  if (categoryFilter.value) {
    result = result.filter(log => log.category === categoryFilter.value)
  }

  return result
})

function getLevelLabel(level: LogLevel): string {
  const labels: Record<LogLevel, string> = {
    debug: 'DEBUG',
    info: 'INFO',
    warn: 'WARN',
    error: 'ERROR',
    critical: 'CRITICAL'
  }
  return labels[level]
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

function handleExport(): void {
  const data = appStore.exportLogs()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `visual-spider-logs-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('日志已导出')
}

function handleClear(): void {
  appStore.clearLogs()
  ElMessage.success('日志已清空')
}

function open(): void {
  visible.value = true
}

watch(filteredLogs, () => {
  if (logListRef.value) {
    logListRef.value.scrollTop = 0
  }
})

defineExpose({ open })
</script>

<style scoped>
.log-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.log-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.log-list {
  flex: 1;
  overflow-y: auto;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  padding: 8px;
}

.log-entry {
  background: white;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 8px;
  font-family: monospace;
  font-size: 12px;
  border-left: 3px solid transparent;
}

.log-entry.debug {
  border-left-color: var(--el-color-info);
}

.log-entry.info {
  border-left-color: var(--el-color-primary);
}

.log-entry.warn {
  border-left-color: var(--el-color-warning);
}

.log-entry.error {
  border-left-color: var(--el-color-danger);
}

.log-entry.critical {
  border-left-color: #f56c6c;
  background: #fef0f0;
}

.log-entry-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.log-level {
  padding: 1px 4px;
  border-radius: 2px;
  font-weight: 600;
  font-size: 10px;
}

.log-level.debug {
  background: var(--el-color-info-light-9);
  color: var(--el-color-info);
}

.log-level.info {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.log-level.warn {
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
}

.log-level.error {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.log-level.critical {
  background: #f56c6c;
  color: white;
}

.log-category {
  color: var(--el-color-primary);
  font-weight: 500;
}

.log-time {
  color: var(--el-text-color-disabled);
  margin-left: auto;
}

.log-message {
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.log-details {
  margin-top: 8px;
  padding: 8px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  overflow-x: auto;
}

.log-details pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
