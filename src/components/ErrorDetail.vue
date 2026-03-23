<template>
  <el-drawer
    v-model="visible"
    title="错误详情"
    direction="rtl"
    size="400px"
  >
    <div class="error-detail" v-if="errorInfo">
      <el-result
        :icon="getIcon()"
        :title="errorInfo.code"
      >
        <template #sub-title>
          <div class="error-message">{{ errorInfo.message }}</div>
        </template>
        <template #extra>
          <el-card v-if="errorInfo.suggestion" shadow="never">
            <template #header>
              <el-icon><Warning /></el-icon>
              <span style="margin-left: 8px">建议</span>
            </template>
            <div class="suggestion">{{ errorInfo.suggestion }}</div>
          </el-card>

          <el-space direction="vertical" style="margin-top: 20px; width: 100%">
            <div v-if="errorDetails">
              <div class="detail-label">详细信息</div>
              <pre class="detail-content">{{ JSON.stringify(errorDetails, null, 2) }}</pre>
            </div>

            <div v-if="stack">
              <div class="detail-label">堆栈跟踪</div>
              <pre class="detail-content stack-trace">{{ stack }}</pre>
            </div>
          </el-space>
        </template>
      </el-result>

      <div class="error-actions">
        <el-button type="primary" @click="handleCopy">复制错误信息</el-button>
        <el-button @click="handleReport">报告问题</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import type { ErrorInfo } from '@/utils/errorHandler'

const visible = ref(false)
const errorInfo = ref<ErrorInfo | null>(null)
const errorDetails = ref<Record<string, any> | null>(null)
const stack = ref<string>('')

function show(error: ErrorInfo, details?: Record<string, any>, stackTrace?: string): void {
  errorInfo.value = error
  errorDetails.value = details || null
  stack.value = stackTrace || ''
  visible.value = true
}

function getIcon(): 'success' | 'warning' | 'error' | 'info' {
  if (!errorInfo.value) return 'info'
  switch (errorInfo.value.severity) {
    case 'critical':
    case 'high':
      return 'error'
    case 'medium':
      return 'warning'
    default:
      return 'info'
  }
}

function handleCopy(): void {
  const text = `
错误代码: ${errorInfo.value?.code}
错误信息: ${errorInfo.value?.message}
建议: ${errorInfo.value?.suggestion || '无'}
`.trim()

  navigator.clipboard.writeText(text)
  ElMessage.success('已复制到剪贴板')
}

function handleReport(): void {
  ElMessage.info('问题报告功能开发中...')
}

defineExpose({ show })
</script>

<style scoped>
.error-detail {
  padding: 0 20px;
}

.error-message {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-top: 8px;
}

.suggestion {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.detail-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
  margin-top: 12px;
}

.detail-content {
  background: var(--el-fill-color-lighter);
  padding: 12px;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.stack-trace {
  color: var(--el-color-danger);
}

.error-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
