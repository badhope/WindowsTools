<template>
  <div class="services">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ $t('services.title') }}</span>
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
            <el-button @click="loadServices">
              <el-icon><Refresh /></el-icon>
              {{ $t('services.refresh') }}
            </el-button>
          </div>
        </div>
      </template>
      
      <el-table :data="filteredServices" v-loading="loading" border stripe>
        <el-table-column prop="name" :label="$t('services.serviceName')" width="200" show-overflow-tooltip />
        <el-table-column prop="displayName" :label="$t('services.displayName')" show-overflow-tooltip />
        <el-table-column prop="status" :label="$t('services.status')" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ $t(`services.${row.status.toLowerCase()}`) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startType" :label="$t('services.startType')" width="120">
          <template #default="{ row }">
            <el-tag type="info">{{ $t(`services.${row.startType.toLowerCase()}`) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="$t('common.edit')" width="260" fixed="right">
          <template #default="{ row }">
            <AdminButton 
              v-if="row.status !== 'Running'" 
              :action-name="`${$t('services.start')} ${row.displayName}`"
              type="success" 
              size="small"
              @click="controlService(row.name, 'start')"
            >
              {{ $t('services.start') }}
            </AdminButton>
            <AdminButton 
              v-if="row.status === 'Running' && row.canStop" 
              :action-name="`${$t('services.stop')} ${row.displayName}`"
              type="warning" 
              size="small"
              @click="controlService(row.name, 'stop')"
            >
              {{ $t('services.stop') }}
            </AdminButton>
            <AdminButton 
              v-if="row.status === 'Running'" 
              :action-name="`${$t('services.restart')} ${row.displayName}`"
              type="primary" 
              size="small"
              @click="controlService(row.name, 'restart')"
            >
              {{ $t('services.restart') }}
            </AdminButton>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { SystemService } from '@/types'
import { getServices, serviceStart, serviceStop, serviceRestart } from '@/api/tauri'
import AdminButton from '@/components/AdminButton.vue'

const { t } = useI18n()
const loading = ref(false)
const searchText = ref('')
const services = ref<SystemService[]>([])

const filteredServices = computed(() => {
  if (!searchText.value) return services.value
  const search = searchText.value.toLowerCase()
  return services.value.filter(s => 
    s.name.toLowerCase().includes(search) ||
    s.displayName.toLowerCase().includes(search)
  )
})

function getStatusType(status: string) {
  switch (status) {
    case 'Running': return 'success'
    case 'Stopped': return 'info'
    case 'Paused': return 'warning'
    default: return ''
  }
}

async function loadServices() {
  loading.value = true
  try {
    const result = await getServices()
    if (result.success && result.data) {
      services.value = result.data
    } else {
      ElMessage.error(t('services.loadFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('services.loadFailed') + `: ${error}`)
  } finally {
    loading.value = false
  }
}

async function controlService(name: string, action: 'start' | 'stop' | 'restart') {
  try {
    const actions = {
      start: serviceStart,
      stop: serviceStop,
      restart: serviceRestart
    }
    const messages = {
      start: t('services.startSuccess'),
      stop: t('services.stopSuccess'),
      restart: t('services.restartSuccess')
    }
    
    const result = await actions[action](name)
    if (result.success) {
      ElMessage.success(messages[action])
      await loadServices()
    } else {
      ElMessage.error(t('services.operationFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('services.operationFailed') + `: ${error}`)
  }
}

onMounted(() => {
  loadServices()
})
</script>

<style scoped>
.services {
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
</style>
