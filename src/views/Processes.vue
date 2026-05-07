<template>
  <div class="processes">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ $t('processes.title') }}</span>
          <div class="header-actions">
            <el-input
              v-model="searchText"
              :placeholder="$t('common.search')"
              clearable
              style="width: 200px; margin-right: 12px;"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            
            <el-select v-model="filterType" :placeholder="$t('processes.filterType')" clearable style="width: 120px; margin-right: 12px;">
              <el-option :label="$t('processes.all')" value="" />
              <el-option :label="$t('processes.systemProcess')" value="system" />
              <el-option :label="$t('processes.userProcess')" value="user" />
              <el-option :label="$t('processes.highCpu')" value="high_cpu" />
              <el-option :label="$t('processes.highMemory')" value="high_memory" />
            </el-select>
            
            <el-button-group style="margin-right: 12px;">
              <el-button :type="autoRefresh ? 'primary' : 'default'" @click="toggleAutoRefresh">
                <el-icon><Timer /></el-icon>
                {{ autoRefresh ? $t('processes.autoRefresh') : $t('processes.manualRefresh') }}
              </el-button>
              <el-button @click="loadProcesses" :loading="loading">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </el-button-group>
            
            <AdminButton 
              :action-name="$t('processes.batchEndProcessTitle')"
              type="danger" 
              :disabled="selectedProcesses.length === 0"
              @click="batchEndProcesses"
            >
              <template #icon>
                <el-icon><Close /></el-icon>
              </template>
              {{ $t('processes.endSelected') }} ({{ selectedProcesses.length }})
            </AdminButton>
          </div>
        </div>
      </template>
      
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">{{ $t('processes.totalProcesses') }}</span>
          <span class="stat-value">{{ processes.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('processes.cpuUsage') }}</span>
          <span class="stat-value">{{ totalCpu.toFixed(1) }}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('processes.memoryUsage') }}</span>
          <span class="stat-value">{{ formatBytes(totalMemory) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('processes.refreshInterval') }}</span>
          <el-select v-model="refreshInterval" size="small" style="width: 80px;" :disabled="!autoRefresh">
            <el-option :value="2" :label="$t('processes.seconds', { n: 2 })" />
            <el-option :value="5" :label="$t('processes.seconds', { n: 5 })" />
            <el-option :value="10" :label="$t('processes.seconds', { n: 10 })" />
            <el-option :value="30" :label="$t('processes.seconds', { n: 30 })" />
          </el-select>
        </div>
      </div>
      
      <el-table 
        :data="filteredProcesses" 
        v-loading="loading" 
        border 
        stripe 
        max-height="500"
        @selection-change="handleSelectionChange"
        :default-sort="{ prop: 'cpu', order: 'descending' }"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column prop="pid" label="PID" width="80" sortable />
        <el-table-column prop="name" :label="$t('processes.processName')" width="180" show-overflow-tooltip sortable>
          <template #default="{ row }">
            <div class="process-name">
              <el-icon v-if="row.isSystem" style="color: #E6A23C;"><WarnTriangleFilled /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="cpu" :label="$t('processes.cpu')" width="100" sortable>
          <template #default="{ row }">
            <el-progress 
              :percentage="Math.min(row.cpu || 0, 100)" 
              :color="getCpuColor(row.cpu)"
              :stroke-width="10"
              :show-text="false"
            />
            <span class="progress-text">{{ (row.cpu || 0).toFixed(1) }}%</span>
          </template>
        </el-table-column>
        <el-table-column prop="memory" :label="$t('processes.memory')" width="140" sortable>
          <template #default="{ row }">
            <div class="memory-cell">
              <span>{{ formatBytes(row.memory) }}</span>
              <el-progress 
                :percentage="getMemoryPercentage(row.memory)" 
                :color="getMemoryColor(row.memory)"
                :stroke-width="4"
                :show-text="false"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="user" :label="$t('processes.user')" width="100" show-overflow-tooltip />
        <el-table-column prop="priority" :label="$t('processes.priority')" width="90" sortable>
          <template #default="{ row }">
            <el-tag size="small" :type="getPriorityType(row.priority)">
              {{ row.priority }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="threads" :label="$t('processes.threads')" width="70" sortable />
        <el-table-column prop="path" :label="$t('processes.path')" show-overflow-tooltip />
        <el-table-column :label="$t('common.operation')" width="200" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" @click="showProcessDetail(row)">
              <el-icon><View /></el-icon>
              {{ $t('processes.detail') }}
            </el-button>
            <AdminButton 
              :action-name="`${$t('processes.changePriorityTitle')} ${row.name}`"
              text 
              size="small"
              @click="changePriority(row)"
            >
              <template #icon>
                <el-icon><Rank /></el-icon>
              </template>
              {{ $t('processes.changePriority') }}
            </AdminButton>
            <AdminButton 
              :action-name="`${$t('processes.end')} ${row.name}`"
              text 
              size="small"
              type="danger"
              @click="endProcess(row)"
            >
              <template #icon>
                <el-icon><Close /></el-icon>
              </template>
              {{ $t('processes.end') }}
            </AdminButton>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="table-footer">
        <span>{{ $t('processes.showingProcesses', { shown: filteredProcesses.length, total: processes.length }) }}</span>
      </div>
    </el-card>
    
    <el-dialog v-model="detailDialogVisible" :title="$t('processes.processDetail') + ' - ' + selectedProcess?.name" width="600px">
      <div v-if="selectedProcess" class="process-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item :label="$t('processes.processName')">{{ selectedProcess.name }}</el-descriptions-item>
          <el-descriptions-item label="PID">{{ selectedProcess.pid }}</el-descriptions-item>
          <el-descriptions-item :label="$t('processes.cpuUsage')">{{ (selectedProcess.cpu || 0).toFixed(2) }}%</el-descriptions-item>
          <el-descriptions-item :label="$t('processes.memoryUsage')">{{ formatBytes(selectedProcess.memory) }}</el-descriptions-item>
          <el-descriptions-item :label="$t('processes.user')">{{ selectedProcess.user }}</el-descriptions-item>
          <el-descriptions-item :label="$t('processes.priority')">
            <el-tag size="small" :type="getPriorityType(selectedProcess.priority)">
              {{ selectedProcess.priority }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('processes.threads')">{{ selectedProcess.threads || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('processes.handles')">{{ selectedProcess.handles || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('processes.startTime')">{{ selectedProcess.startTime || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('processes.runTime')">{{ selectedProcess.runTime || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('processes.path')" :span="2">{{ selectedProcess.path || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="$t('processes.commandLine')" :span="2">{{ selectedProcess.commandLine || '-' }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="detail-actions">
          <el-button @click="openFileLocation(selectedProcess.path)">
            <el-icon><FolderOpened /></el-icon>
            {{ $t('processes.openFileLocation') }}
          </el-button>
          <el-button @click="copyProcessInfo(selectedProcess)">
            <el-icon><CopyDocument /></el-icon>
            {{ $t('processes.copyInfo') }}
          </el-button>
          <el-button type="danger" @click="endProcess(selectedProcess); detailDialogVisible = false">
            <el-icon><Close /></el-icon>
            {{ $t('processes.endProcess') }}
          </el-button>
        </div>
      </div>
    </el-dialog>
    
    <el-dialog v-model="priorityDialogVisible" :title="$t('processes.changePriorityTitle')" width="400px">
      <div v-if="selectedProcess">
        <p style="margin-bottom: 16px;">
          {{ $t('processes.process') }}: <strong>{{ selectedProcess.name }}</strong> (PID: {{ selectedProcess.pid }})
        </p>
        <el-select v-model="newPriority" style="width: 100%;">
          <el-option :label="$t('processes.realtime')" value="Realtime" />
          <el-option :label="$t('processes.high')" value="High" />
          <el-option :label="$t('processes.aboveNormal')" value="AboveNormal" />
          <el-option :label="$t('processes.normal')" value="Normal" />
          <el-option :label="$t('processes.belowNormal')" value="BelowNormal" />
          <el-option :label="$t('processes.low')" value="Low" />
        </el-select>
        <p class="warning-text">
          <el-icon><WarnTriangleFilled /></el-icon>
          {{ $t('processes.priorityWarning') }}
        </p>
      </div>
      <template #footer>
        <el-button @click="priorityDialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="savePriority">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Timer, Close, View, Rank, FolderOpened, CopyDocument, WarnTriangleFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { ProcessInfo } from '@/types'
import { getProcesses as apiGetProcesses, endProcess as apiEndProcess, setProcessPriority as apiSetProcessPriority, openFileLocation as apiOpenFileLocation } from '@/api/tauri'
import AdminButton from '@/components/AdminButton.vue'

interface ExtendedProcessInfo extends ProcessInfo {
  isSystem?: boolean
  threads?: number
  handles?: number
  startTime?: string
  runTime?: string
  commandLine?: string
}

const { t } = useI18n()
const loading = ref(false)
const searchText = ref('')
const filterType = ref('')
const processes = ref<ExtendedProcessInfo[]>([])
const selectedProcesses = ref<ExtendedProcessInfo[]>([])
const autoRefresh = ref(true)
const refreshInterval = ref(5)
const detailDialogVisible = ref(false)
const priorityDialogVisible = ref(false)
const selectedProcess = ref<ExtendedProcessInfo | null>(null)
const newPriority = ref('Normal')

let refreshTimer: number | null = null

const totalCpu = computed(() => {
  return processes.value.reduce((sum, p) => sum + (p.cpu || 0), 0)
})

const totalMemory = computed(() => {
  return processes.value.reduce((sum, p) => sum + (p.memory || 0), 0)
})

const filteredProcesses = computed(() => {
  let result = processes.value
  
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(search) ||
      String(p.pid).includes(search) ||
      (p.path && p.path.toLowerCase().includes(search))
    )
  }
  
  if (filterType.value) {
    switch (filterType.value) {
      case 'system':
        result = result.filter(p => p.isSystem || p.user === 'SYSTEM')
        break
      case 'user':
        result = result.filter(p => !p.isSystem && p.user !== 'SYSTEM')
        break
      case 'high_cpu':
        result = result.filter(p => (p.cpu || 0) > 50)
        break
      case 'high_memory':
        result = result.filter(p => p.memory > 500 * 1024 * 1024)
        break
    }
  }
  
  return result
})

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getCpuColor(cpu: number): string {
  if (cpu > 80) return '#F56C6C'
  if (cpu > 50) return '#E6A23C'
  return '#67C23A'
}

function getMemoryColor(memory: number): string {
  const mb = memory / (1024 * 1024)
  if (mb > 1000) return '#F56C6C'
  if (mb > 500) return '#E6A23C'
  return '#67C23A'
}

function getMemoryPercentage(memory: number): number {
  const maxMemory = 16 * 1024 * 1024 * 1024
  return Math.min((memory / maxMemory) * 100, 100)
}

function getPriorityType(priority: string): string {
  const types: Record<string, string> = {
    'Realtime': 'danger',
    'High': 'warning',
    'AboveNormal': '',
    'Normal': 'success',
    'BelowNormal': 'info',
    'Low': 'info'
  }
  return types[priority] || ''
}

async function loadProcesses() {
  loading.value = true
  try {
    const result = await apiGetProcesses()
    if (result.success && result.data) {
      processes.value = result.data.map(p => ({
        ...p,
        isSystem: p.user === 'SYSTEM' || p.user === 'LOCAL SERVICE' || p.user === 'NETWORK SERVICE'
      }))
    } else {
      ElMessage.error(t('processes.loadFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('processes.loadFailed') + `: ${error}`)
  } finally {
    loading.value = false
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    startAutoRefresh()
    ElMessage.success(t('processes.autoRefreshEnabled'))
  } else {
    stopAutoRefresh()
    ElMessage.info(t('processes.autoRefreshDisabled'))
  }
}

function startAutoRefresh() {
  stopAutoRefresh()
  refreshTimer = window.setInterval(loadProcesses, refreshInterval.value * 1000)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

watch(refreshInterval, () => {
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

function handleSelectionChange(selection: ExtendedProcessInfo[]) {
  selectedProcesses.value = selection
}

function showProcessDetail(process: ExtendedProcessInfo) {
  selectedProcess.value = process
  detailDialogVisible.value = true
}

function changePriority(process: ExtendedProcessInfo) {
  selectedProcess.value = process
  newPriority.value = process.priority || 'Normal'
  priorityDialogVisible.value = true
}

async function savePriority() {
  if (!selectedProcess.value) return
  
  try {
    const result = await apiSetProcessPriority(selectedProcess.value.pid, newPriority.value)
    if (result.success) {
      ElMessage.success(t('processes.priorityChanged'))
      priorityDialogVisible.value = false
      await loadProcesses()
    } else {
      ElMessage.error(t('processes.priorityChangeFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('processes.priorityChangeFailed') + `: ${error}`)
  }
}

async function endProcess(process: ExtendedProcessInfo) {
  try {
    await ElMessageBox.confirm(
      t('processes.confirmEndProcess', { name: process.name, pid: process.pid }),
      t('processes.confirmEndProcessTitle'),
      {
        confirmButtonText: t('processes.end'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    const result = await apiEndProcess(process.pid)
    if (result.success) {
      ElMessage.success(t('processes.endProcessSuccess', { name: process.name }))
      await loadProcesses()
    } else {
      ElMessage.error(t('processes.endProcessFailed') + `: ${result.error}`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('processes.endProcessFailed') + `: ${error}`)
    }
  }
}

async function batchEndProcesses() {
  if (selectedProcesses.value.length === 0) return
  
  try {
    await ElMessageBox.confirm(
      t('processes.confirmBatchEnd', { count: selectedProcesses.value.length }),
      t('processes.batchEndProcessTitle'),
      {
        confirmButtonText: t('processes.end'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    let success = 0
    let failed = 0
    
    for (const process of selectedProcesses.value) {
      const result = await apiEndProcess(process.pid)
      if (result.success) {
        success++
      } else {
        failed++
      }
    }
    
    if (success > 0) {
      ElMessage.success(t('processes.batchEndSuccess', { success }) + (failed > 0 ? `, ${t('processes.failed')}: ${failed}` : ''))
    } else {
      ElMessage.error(t('processes.batchEndFailed'))
    }
    
    selectedProcesses.value = []
    await loadProcesses()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('processes.endProcessFailed') + `: ${error}`)
    }
  }
}

async function openFileLocation(path: string) {
  if (!path) {
    ElMessage.warning(t('processes.cannotGetFilePath'))
    return
  }
  
  try {
    const result = await apiOpenFileLocation(path)
    if (!result.success) {
      ElMessage.error(t('processes.openFileLocationFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('processes.openFileLocationFailed') + `: ${error}`)
  }
}

async function copyProcessInfo(process: ExtendedProcessInfo) {
  const info = `
${t('processes.processName')}: ${process.name}
PID: ${process.pid}
${t('processes.cpu')}: ${(process.cpu || 0).toFixed(2)}%
${t('processes.memory')}: ${formatBytes(process.memory)}
${t('processes.user')}: ${process.user}
${t('processes.priority')}: ${process.priority}
${t('processes.path')}: ${process.path || '-'}
  `.trim()
  
  try {
    await navigator.clipboard.writeText(info)
    ElMessage.success(t('common.copySuccess'))
  } catch {
    ElMessage.error(t('common.copyFailed'))
  }
}

onMounted(() => {
  loadProcesses()
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.processes {
  padding: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  align-items: center;
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  color: #909399;
  font-size: 13px;
}

.stat-value {
  font-weight: 600;
  font-size: 14px;
}

.process-name {
  display: flex;
  align-items: center;
  gap: 4px;
}

.progress-text {
  font-size: 12px;
  color: #606266;
  margin-left: 4px;
}

.memory-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.table-footer {
  padding: 12px 0;
  text-align: right;
  color: #909399;
  font-size: 13px;
}

.process-detail {
  padding: 16px 0;
}

.detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.warning-text {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  color: #E6A23C;
  font-size: 13px;
}

:deep(.el-progress-bar__outer) {
  height: 10px !important;
}
</style>
