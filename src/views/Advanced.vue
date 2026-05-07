<template>
  <div class="advanced">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>{{ $t('advanced.envVariables') }}</span>
              <div class="header-actions">
                <el-button type="primary" size="small" @click="showEnvDialog = true">
                  <el-icon><Plus /></el-icon>
                  {{ $t('common.add') }}
                </el-button>
                <el-button size="small" @click="loadEnvVariables">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
          <el-table :data="envVariables" v-loading="loadingEnv" size="small" max-height="400">
            <el-table-column prop="name" :label="$t('advanced.varName')" width="200" show-overflow-tooltip />
            <el-table-column prop="value" :label="$t('registry.value')" show-overflow-tooltip />
            <el-table-column :label="$t('common.edit')" width="140">
              <template #default="{ row }">
                <AdminButton 
                  :action-name="`${$t('common.edit')} ${row.name}`"
                  text 
                  size="small"
                  @click="editEnv(row)"
                >
                  {{ $t('common.edit') }}
                </AdminButton>
                <AdminButton 
                  :action-name="`${$t('common.delete')} ${row.name}`"
                  text 
                  size="small"
                  type="danger"
                  @click="deleteEnv(row)"
                >
                  {{ $t('common.delete') }}
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
              <span>{{ $t('advanced.hostsEditor') }}</span>
              <div class="header-actions">
                <el-button type="primary" size="small" @click="showHostsDialog = true">
                  <el-icon><Plus /></el-icon>
                  {{ $t('common.add') }}
                </el-button>
                <el-button size="small" @click="loadHosts">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
          <el-table :data="hostsEntries" v-loading="loadingHosts" size="small" max-height="400">
            <el-table-column prop="ip" :label="$t('advanced.ipAddress')" width="150" />
            <el-table-column prop="hostname" :label="$t('advanced.hostname')" show-overflow-tooltip />
            <el-table-column :label="$t('common.edit')" width="140">
              <template #default="{ row }">
                <AdminButton 
                  :action-name="`${$t('common.edit')} ${row.hostname}`"
                  text 
                  size="small"
                  @click="editHost(row)"
                >
                  {{ $t('common.edit') }}
                </AdminButton>
                <AdminButton 
                  :action-name="`${$t('common.delete')} ${row.hostname}`"
                  text 
                  size="small"
                  type="danger"
                  @click="deleteHost(row)"
                >
                  {{ $t('common.delete') }}
                </AdminButton>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>{{ $t('advanced.systemTools') }}</span>
            </div>
          </template>
          <div class="system-tools">
            <AdminButton 
              :action-name="$t('advanced.sfcScan')"
              type="primary" 
              @click="runSfc"
            >
              <template #icon>
                <el-icon><DocumentChecked /></el-icon>
              </template>
              {{ $t('advanced.sfcScan') }}
            </AdminButton>
            <AdminButton 
              :action-name="$t('advanced.dism')"
              type="success" 
              @click="runDism"
            >
              <template #icon>
                <el-icon><Tools /></el-icon>
              </template>
              {{ $t('advanced.dism') }}
            </AdminButton>
            <el-button type="warning" @click="checkWindowsUpdate">
              <el-icon><Upload /></el-icon>
              {{ $t('advanced.checkUpdates') }}
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-dialog v-model="showEnvDialog" :title="$t('advanced.editEnvVar')" width="500px">
      <el-form :model="envForm" label-width="100px">
        <el-form-item :label="$t('advanced.varName')">
          <el-input v-model="envForm.name" />
        </el-form-item>
        <el-form-item :label="$t('advanced.varValue')">
          <el-input v-model="envForm.value" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item :label="$t('advanced.scope')">
          <el-radio-group v-model="envForm.scope">
            <el-radio label="user">{{ $t('advanced.user') }}</el-radio>
            <el-radio label="system">{{ $t('advanced.system') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEnvDialog = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveEnv">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>
    
    <el-dialog v-model="showHostsDialog" :title="$t('advanced.editHostsEntry')" width="500px">
      <el-form :model="hostsForm" label-width="100px">
        <el-form-item :label="$t('advanced.ipAddress')">
          <el-input v-model="hostsForm.ip" :placeholder="$t('advanced.ipExample')" />
        </el-form-item>
        <el-form-item :label="$t('advanced.hostname')">
          <el-input v-model="hostsForm.hostname" :placeholder="$t('advanced.hostnameExample')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showHostsDialog = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveHost">{{ $t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, DocumentChecked, Tools, Upload } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import AdminButton from '@/components/AdminButton.vue'

const { t } = useI18n()
const loadingEnv = ref(false)
const loadingHosts = ref(false)
const showEnvDialog = ref(false)
const showHostsDialog = ref(false)

const envVariables = ref<Array<{ name: string; value: string; scope: string }>>([])
const hostsEntries = ref<Array<{ ip: string; hostname: string }>>([])

const envForm = ref({ name: '', value: '', scope: 'user' })
const hostsForm = ref({ ip: '', hostname: '' })

async function loadEnvVariables() {
  loadingEnv.value = true
  try {
    const result = await invoke('get_env_variables') as Array<{ name: string; value: string; scope: string }>
    envVariables.value = result
  } catch (error) {
    ElMessage.error(t('advanced.loadEnvFailed') + `: ${error}`)
  } finally {
    loadingEnv.value = false
  }
}

async function loadHosts() {
  loadingHosts.value = true
  try {
    const result = await invoke('get_hosts_entries') as Array<{ ip: string; hostname: string }>
    hostsEntries.value = result
  } catch (error) {
    ElMessage.error(t('advanced.loadHostsFailed') + `: ${error}`)
  } finally {
    loadingHosts.value = false
  }
}

function editEnv(row: any) {
  envForm.value = { name: row.name, value: row.value, scope: row.scope || 'user' }
  showEnvDialog.value = true
}

async function deleteEnv(row: any) {
  await ElMessageBox.confirm(t('advanced.confirmDeleteEnv', { name: row.name }), t('common.confirm'), { type: 'warning' })
  try {
    await invoke('delete_env_variable', { name: row.name, scope: row.scope || 'user' })
    ElMessage.success(t('common.deleteSuccess'))
    await loadEnvVariables()
  } catch (error) {
    ElMessage.error(t('common.deleteFailed') + `: ${error}`)
  }
}

async function saveEnv() {
  try {
    await invoke('set_env_variable', envForm.value)
    ElMessage.success(t('common.saveSuccess'))
    showEnvDialog.value = false
    await loadEnvVariables()
  } catch (error) {
    ElMessage.error(t('common.saveFailed') + `: ${error}`)
  }
}

function editHost(row: any) {
  hostsForm.value = { ip: row.ip, hostname: row.hostname }
  showHostsDialog.value = true
}

async function deleteHost(row: any) {
  await ElMessageBox.confirm(t('advanced.confirmDeleteHost', { ip: row.ip, hostname: row.hostname }), t('common.confirm'), { type: 'warning' })
  try {
    await invoke('delete_hosts_entry', { ip: row.ip, hostname: row.hostname })
    ElMessage.success(t('common.deleteSuccess'))
    await loadHosts()
  } catch (error) {
    ElMessage.error(t('common.deleteFailed') + `: ${error}`)
  }
}

async function saveHost() {
  try {
    await invoke('add_hosts_entry', hostsForm.value)
    ElMessage.success(t('common.saveSuccess'))
    showHostsDialog.value = false
    await loadHosts()
  } catch (error) {
    ElMessage.error(t('common.saveFailed') + `: ${error}`)
  }
}

async function runSfc() {
  try {
    ElMessage.info(t('advanced.runningSfc'))
    await invoke('run_sfc_scan')
    ElMessage.success(t('advanced.sfcComplete'))
  } catch (error) {
    ElMessage.error(t('advanced.runFailed') + `: ${error}`)
  }
}

async function runDism() {
  try {
    ElMessage.info(t('advanced.runningDism'))
    await invoke('run_dism')
    ElMessage.success(t('advanced.dismComplete'))
  } catch (error) {
    ElMessage.error(t('advanced.runFailed') + `: ${error}`)
  }
}

async function checkWindowsUpdate() {
  try {
    await invoke('check_windows_update')
    ElMessage.success(t('advanced.windowsUpdateOpened'))
  } catch (error) {
    ElMessage.error(t('advanced.operationFailed') + `: ${error}`)
  }
}

onMounted(() => {
  loadEnvVariables()
  loadHosts()
})
</script>

<style scoped>
.advanced {
  padding: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.system-tools {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
