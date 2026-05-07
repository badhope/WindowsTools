<template>
  <div class="network">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>{{ $t('network.title') }}</span>
            </div>
          </template>
          
          <div class="quick-actions">
            <AdminButton 
              :action-name="$t('network.flushDns')"
              type="primary" 
              @click="flushDns"
            >
              <template #icon>
                <el-icon><Refresh /></el-icon>
              </template>
              {{ $t('network.flushDns') }}
            </AdminButton>
            <AdminButton 
              :action-name="$t('network.releaseIp')"
              @click="releaseIp"
            >
              <template #icon>
                <el-icon><SwitchButton /></el-icon>
              </template>
              {{ $t('network.releaseIp') }}
            </AdminButton>
            <AdminButton 
              :action-name="$t('network.renewIp')"
              @click="renewIp"
            >
              <template #icon>
                <el-icon><Connection /></el-icon>
              </template>
              {{ $t('network.renewIp') }}
            </AdminButton>
            <AdminButton 
              :action-name="$t('network.resetNetwork')"
              type="warning" 
              @click="resetNetwork"
            >
              <template #icon>
                <el-icon><Setting /></el-icon>
              </template>
              {{ $t('network.resetNetwork') }}
            </AdminButton>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>{{ $t('network.connections') }}</span>
              <el-button text @click="loadConnections">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table :data="connections" v-loading="loadingConnections" max-height="400" size="small">
            <el-table-column prop="protocol" :label="$t('network.protocol')" width="80" />
            <el-table-column prop="localAddress" :label="$t('network.localAddress')" width="150" />
            <el-table-column prop="localPort" :label="$t('network.localPort')" width="80" />
            <el-table-column prop="remoteAddress" :label="$t('network.remoteAddress')" width="150" />
            <el-table-column prop="state" :label="$t('network.state')" show-overflow-tooltip />
          </el-table>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>{{ $t('network.ports') }}</span>
              <el-button text @click="loadPorts">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table :data="ports" v-loading="loadingPorts" max-height="400" size="small">
            <el-table-column prop="port" :label="$t('network.port')" width="80" />
            <el-table-column prop="processName" :label="$t('network.processName')" width="150" />
            <el-table-column prop="pid" label="PID" width="80" />
            <el-table-column prop="protocol" :label="$t('network.protocol')" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>{{ $t('network.dns') }}</span>
            </div>
          </template>
          <div class="dns-info">
            <el-descriptions :column="2" border>
              <el-descriptions-item :label="$t('network.dnsServer')">
                <div v-for="(dns, index) in dnsServers" :key="index">{{ dns }}</div>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, SwitchButton, Connection, Setting } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { NetworkConnection } from '@/types'
import { getNetworkConnections, getPortUsage, getDnsServers, flushDns as apiFlushDns, releaseIp as apiReleaseIp, renewIp as apiRenewIp, resetNetwork as apiResetNetwork } from '@/api/tauri'
import AdminButton from '@/components/AdminButton.vue'

const { t } = useI18n()
const loadingConnections = ref(false)
const loadingPorts = ref(false)
const connections = ref<NetworkConnection[]>([])
const ports = ref<Array<{ port: number; processName: string; pid: number; protocol: string }>>([])
const dnsServers = ref<string[]>([])

async function loadConnections() {
  loadingConnections.value = true
  try {
    const result = await getNetworkConnections()
    if (result.success && result.data) {
      connections.value = result.data
    } else {
      ElMessage.error(t('network.loadConnectionsFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('network.loadConnectionsFailed') + `: ${error}`)
  } finally {
    loadingConnections.value = false
  }
}

async function loadPorts() {
  loadingPorts.value = true
  try {
    const result = await getPortUsage(0)
    if (result.success && result.data) {
      ports.value = result.data.map(c => ({
        port: c.localPort || 0,
        processName: c.processName || '',
        pid: c.pid || 0,
        protocol: c.protocol || ''
      }))
    } else {
      ElMessage.error(t('network.loadPortsFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('network.loadPortsFailed') + `: ${error}`)
  } finally {
    loadingPorts.value = false
  }
}

async function loadDnsServers() {
  try {
    const result = await getDnsServers()
    if (result.success && result.data) {
      dnsServers.value = result.data
    } else {
      console.error(t('network.loadDnsFailed') + `: ${result.error}`)
    }
  } catch (error) {
    console.error(t('network.loadDnsFailed') + ':', error)
  }
}

async function flushDns() {
  try {
    const result = await apiFlushDns()
    if (result.success) {
      ElMessage.success(t('network.flushDnsSuccess'))
    } else {
      ElMessage.error(t('network.flushDnsFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('network.flushDnsFailed') + `: ${error}`)
  }
}

async function releaseIp() {
  try {
    const result = await apiReleaseIp()
    if (result.success) {
      ElMessage.success(t('network.releaseIpSuccess'))
    } else {
      ElMessage.error(t('network.releaseIpFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('network.releaseIpFailed') + `: ${error}`)
  }
}

async function renewIp() {
  try {
    const result = await apiRenewIp()
    if (result.success) {
      ElMessage.success(t('network.renewIpSuccess'))
    } else {
      ElMessage.error(t('network.renewIpFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('network.renewIpFailed') + `: ${error}`)
  }
}

async function resetNetwork() {
  try {
    const result = await apiResetNetwork()
    if (result.success) {
      ElMessage.success(t('network.resetNetworkSuccess'))
    } else {
      ElMessage.error(t('network.resetNetworkFailed') + `: ${result.error}`)
    }
  } catch (error) {
    ElMessage.error(t('network.resetNetworkFailed') + `: ${error}`)
  }
}

onMounted(() => {
  loadConnections()
  loadPorts()
  loadDnsServers()
})
</script>

<style scoped>
.network {
  padding: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quick-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.dns-info {
  max-height: 200px;
  overflow-y: auto;
}
</style>
