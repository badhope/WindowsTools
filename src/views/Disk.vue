<template>
  <div class="disk">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>{{ $t('disk.title') }}</span>
              <el-button @click="loadDisks">
                <el-icon><Refresh /></el-icon>
                {{ $t('common.refresh') }}
              </el-button>
            </div>
          </template>
          
          <el-row :gutter="20">
            <el-col :span="8" v-for="disk in disks" :key="disk.name">
              <el-card class="disk-card" shadow="hover">
                <div class="disk-header">
                  <el-icon size="32"><FolderOpened /></el-icon>
                  <span class="disk-name">{{ disk.name }}</span>
                </div>
                <el-progress 
                  :percentage="disk.totalSpace > 0 ? Math.round((disk.usedSpace / disk.totalSpace) * 100) : 0"
                  :color="getProgressColor(disk.totalSpace > 0 ? disk.usedSpace / disk.totalSpace : 0)"
                />
                <div class="disk-info">
                  <div class="info-row">
                    <span>{{ $t('disk.totalSpace') }}:</span>
                    <span>{{ formatBytes(disk.totalSpace) }}</span>
                  </div>
                  <div class="info-row">
                    <span>{{ $t('disk.usedSpace') }}:</span>
                    <span>{{ formatBytes(disk.usedSpace) }}</span>
                  </div>
                  <div class="info-row">
                    <span>{{ $t('disk.freeSpace') }}:</span>
                    <span>{{ formatBytes(disk.freeSpace) }}</span>
                  </div>
                  <div class="info-row">
                    <span>{{ $t('disk.fileSystem') }}:</span>
                    <span>{{ disk.fileSystem }}</span>
                  </div>
                </div>
                <div class="disk-actions">
                  <el-button size="small" @click="cleanupDisk(disk.name)">
                    {{ $t('disk.cleanup') }}
                  </el-button>
                  <AdminButton 
                    :action-name="`${$t('disk.check')} ${disk.name}`"
                    size="small"
                    @click="checkDisk(disk.name)"
                  >
                    {{ $t('disk.check') }}
                  </AdminButton>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, FolderOpened } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { DiskInfo } from '@/types'
import { getDiskInfo, cleanupDisk as apiCleanupDisk, checkDisk as apiCheckDisk } from '@/api/tauri'
import AdminButton from '@/components/AdminButton.vue'

const { t } = useI18n()
const loading = ref(false)
const disks = ref<DiskInfo[]>([])

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getProgressColor(ratio: number): string {
  if (ratio > 0.9) return '#f56c6c'
  if (ratio > 0.7) return '#e6a23c'
  return '#67c23a'
}

async function loadDisks() {
  loading.value = true
  try {
    const result = await getDiskInfo()
    if (result.success && result.data) {
      disks.value = result.data
    } else {
      ElMessage.error(t('disk.loadFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('disk.loadFailed') + `: ${error}`)
  } finally {
    loading.value = false
  }
}

async function cleanupDisk(drive: string) {
  try {
    const result = await apiCleanupDisk(drive)
    if (result.success) {
      ElMessage.success(t('disk.cleanupSuccess', { drive }))
      await loadDisks()
    } else {
      ElMessage.error(t('disk.cleanupFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('disk.cleanupFailed') + `: ${error}`)
  }
}

async function checkDisk(drive: string) {
  try {
    const result = await apiCheckDisk(drive)
    if (result.success) {
      ElMessage.success(t('disk.checkSuccess', { drive }))
    } else {
      ElMessage.error(t('disk.checkFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('disk.checkFailed') + `: ${error}`)
  }
}

onMounted(() => {
  loadDisks()
})
</script>

<style scoped>
.disk {
  padding: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.disk-card {
  margin-bottom: 20px;
}

.disk-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.disk-name {
  font-size: 18px;
  font-weight: 600;
}

.disk-info {
  margin-top: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
  color: #606266;
}

.disk-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}
</style>
