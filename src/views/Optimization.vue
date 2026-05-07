<template>
  <div class="optimization">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>{{ $t('optimization.startupItems') }}</span>
              <el-button @click="loadStartupItems">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table :data="startupItems" v-loading="loadingStartup" size="small">
            <el-table-column prop="name" :label="$t('registry.name')" show-overflow-tooltip />
            <el-table-column prop="command" :label="$t('powershell.commandInput')" show-overflow-tooltip />
            <el-table-column prop="location" :label="$t('registry.value')" show-overflow-tooltip />
            <el-table-column :label="$t('common.edit')" width="120">
              <template #default="{ row }">
                <AdminButton 
                  :action-name="`${row.enabled ? $t('optimization.disable') : $t('optimization.enable')} ${row.name}`"
                  text 
                  size="small"
                  @click="toggleStartupItem(row)"
                >
                  {{ row.enabled ? $t('optimization.disable') : $t('optimization.enable') }}
                </AdminButton>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>{{ $t('optimization.performance') }}</span>
            </div>
          </template>
          <div class="optimization-actions">
            <el-button type="primary" @click="cleanTemp">
              <el-icon><Delete /></el-icon>
              {{ $t('optimization.cleanTemp') }}
            </el-button>
            <el-button type="success" @click="cleanCache">
              <el-icon><Brush /></el-icon>
              {{ $t('optimization.cleanCache') }}
            </el-button>
            <el-button type="warning" @click="optimizePerformance">
              <el-icon><TrendCharts /></el-icon>
              {{ $t('optimization.optimizePerformance') }}
            </el-button>
          </div>
          
          <el-divider />
          
          <div class="performance-tips">
            <h4>{{ $t('optimization.optimizationTips') }}</h4>
            <el-alert
              v-for="(tip, index) in performanceTips"
              :key="index"
              :title="tip"
              type="info"
              :closable="false"
              style="margin-bottom: 8px;"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>{{ $t('optimization.scheduledTasks') }}</span>
              <el-button @click="loadScheduledTasks">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table :data="scheduledTasks" v-loading="loadingTasks" size="small">
            <el-table-column prop="name" :label="$t('optimization.taskName')" show-overflow-tooltip />
            <el-table-column prop="status" :label="$t('services.status')" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'Ready' ? 'success' : 'info'">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="lastRun" :label="$t('optimization.lastRun')" width="180" />
            <el-table-column prop="nextRun" :label="$t('optimization.nextRun')" width="180" />
            <el-table-column :label="$t('common.edit')" width="180">
              <template #default="{ row }">
                <AdminButton 
                  :action-name="`${$t('optimization.run')} ${row.name}`"
                  text 
                  size="small"
                  @click="runTask(row.name)"
                >
                  {{ $t('optimization.run') }}
                </AdminButton>
                <AdminButton 
                  :action-name="`${$t('optimization.disable')} ${row.name}`"
                  text 
                  size="small"
                  @click="disableTask(row.name)"
                >
                  {{ $t('optimization.disable') }}
                </AdminButton>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { ElMessage } from 'element-plus'
import { Refresh, Delete, Brush, TrendCharts } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import AdminButton from '@/components/AdminButton.vue'

const { t } = useI18n()
const loadingStartup = ref(false)
const loadingTasks = ref(false)
const startupItems = ref<Array<{ name: string; command: string; location: string; enabled: boolean }>>([])
const scheduledTasks = ref<Array<{ name: string; status: string; lastRun: string; nextRun: string }>>([])
const performanceTips = ref([
  t('optimization.tip1'),
  t('optimization.tip2'),
  t('optimization.tip3')
])

async function loadStartupItems() {
  loadingStartup.value = true
  try {
    const result = await invoke('get_startup_items') as Array<{ name: string; command: string; location: string; enabled: boolean }>
    startupItems.value = result
  } catch (error) {
    ElMessage.error(t('optimization.loadStartupFailed') + `: ${error}`)
  } finally {
    loadingStartup.value = false
  }
}

async function toggleStartupItem(item: any) {
  try {
    await invoke('toggle_startup_item', { name: item.name, enabled: item.enabled })
    ElMessage.success(item.enabled ? t('optimization.enabled') : t('optimization.disabled'))
  } catch (error) {
    ElMessage.error(t('optimization.operationFailed') + `: ${error}`)
    item.enabled = !item.enabled
  }
}

async function loadScheduledTasks() {
  loadingTasks.value = true
  try {
    const result = await invoke('get_scheduled_tasks') as Array<{ name: string; status: string; lastRun: string; nextRun: string }>
    scheduledTasks.value = result
  } catch (error) {
    ElMessage.error(t('optimization.loadTasksFailed') + `: ${error}`)
  } finally {
    loadingTasks.value = false
  }
}

async function runTask(name: string) {
  try {
    await invoke('run_scheduled_task', { name })
    ElMessage.success(t('optimization.taskStarted', { name }))
  } catch (error) {
    ElMessage.error(t('optimization.runTaskFailed') + `: ${error}`)
  }
}

async function disableTask(name: string) {
  try {
    await invoke('disable_scheduled_task', { name })
    ElMessage.success(t('optimization.taskDisabled', { name }))
    await loadScheduledTasks()
  } catch (error) {
    ElMessage.error(t('optimization.disableTaskFailed') + `: ${error}`)
  }
}

async function cleanTemp() {
  try {
    const result = await invoke<{ deleted: number; freed: number }>('clean_temp_files')
    ElMessage.success(t('optimization.cleanSuccess', { count: result.deleted, size: formatBytes(result.freed) }))
  } catch (error) {
    ElMessage.error(t('optimization.cleanFailed') + `: ${error}`)
  }
}

async function cleanCache() {
  try {
    const result = await invoke<{ deleted: number; freed: number }>('clean_cache_files')
    ElMessage.success(t('optimization.cleanSuccess', { count: result.deleted, size: formatBytes(result.freed) }))
  } catch (error) {
    ElMessage.error(t('optimization.cleanFailed') + `: ${error}`)
  }
}

async function optimizePerformance() {
  try {
    await invoke('optimize_performance')
    ElMessage.success(t('optimization.optimizeSuccess'))
  } catch (error) {
    ElMessage.error(t('optimization.optimizeFailed') + `: ${error}`)
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onMounted(() => {
  loadStartupItems()
  loadScheduledTasks()
})
</script>

<style scoped>
.optimization {
  padding: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.optimization-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.performance-tips h4 {
  margin-bottom: 12px;
  color: #303133;
}
</style>
