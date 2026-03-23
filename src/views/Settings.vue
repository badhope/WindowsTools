<template>
  <div class="settings">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>系统设置</span>
          <el-button type="primary" @click="handleSaveSettings">
            <el-icon><Check /></el-icon>
            保存设置
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="通用设置" name="general">
          <el-form label-width="140px" :label-position="'left'">
            <el-divider content-position="left">请求设置</el-divider>
            <el-form-item label="默认请求延迟">
              <el-space>
                <el-input-number v-model="localSettings.general.defaultDelay[0]" :min="0" :max="60" size="small" />
                <span class="form-tip">-</span>
                <el-input-number v-model="localSettings.general.defaultDelay[1]" :min="0" :max="60" size="small" />
                <span class="form-tip">秒</span>
              </el-space>
            </el-form-item>
            <el-form-item label="默认超时时间">
              <el-input-number v-model="localSettings.general.defaultTimeout" :min="5000" :max="120000" :step="5000" size="small" />
              <span class="form-tip">毫秒</span>
            </el-form-item>
            <el-form-item label="默认重试次数">
              <el-input-number v-model="localSettings.general.defaultRetries" :min="0" :max="10" size="small" />
            </el-form-item>
            <el-form-item label="并发线程数">
              <el-input-number v-model="localSettings.general.concurrency" :min="1" :max="50" size="small" />
              <span class="form-tip">个线程</span>
            </el-form-item>

            <el-divider content-position="left">界面设置</el-divider>
            <el-form-item label="主题">
              <el-radio-group v-model="localSettings.general.theme" size="small">
                <el-radio-button label="light">浅色</el-radio-button>
                <el-radio-button label="dark">深色</el-radio-button>
                <el-radio-button label="auto">自动</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="语言">
              <el-select v-model="localSettings.general.language" size="small" style="width: 120px">
                <el-option label="简体中文" value="zh-CN" />
                <el-option label="English" value="en-US" />
              </el-select>
            </el-form-item>
            <el-form-item label="自动保存间隔">
              <el-input-number v-model="localSettings.general.autoSaveInterval" :min="10000" :max="300000" :step="10000" size="small" />
              <span class="form-tip">毫秒</span>
            </el-form-item>

            <el-divider content-position="left">爬虫协议</el-divider>
            <el-form-item label="遵守robots.txt">
              <el-switch v-model="localSettings.general.respectRobotsTxt" />
              <span class="form-tip" style="margin-left: 12px">启用后将自动遵守网站的robots.txt规则</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="代理设置" name="proxy">
          <el-form label-width="140px" :label-position="'left'">
            <el-divider content-position="left">代理池配置</el-divider>
            <el-form-item label="启用代理">
              <el-switch v-model="localSettings.proxy.enabled" />
            </el-form-item>
            <el-form-item label="自动轮换">
              <el-switch v-model="localSettings.proxy.autoRotate" :disabled="!localSettings.proxy.enabled" />
            </el-form-item>
            <el-form-item label="轮换间隔">
              <el-input-number
                v-model="localSettings.proxy.rotateInterval"
                :min="60000"
                :max="3600000"
                :step="60000"
                size="small"
                :disabled="!localSettings.proxy.enabled || !localSettings.proxy.autoRotate"
              />
              <span class="form-tip">毫秒</span>
            </el-form-item>

            <el-divider content-position="left">代理列表</el-divider>
            <div class="proxy-section">
              <div class="proxy-header">
                <span>已添加 {{ proxyList.length }} 个代理</span>
                <el-button type="primary" size="small" @click="handleAddProxy" :disabled="!localSettings.proxy.enabled">
                  <el-icon><Plus /></el-icon>
                  添加代理
                </el-button>
              </div>
              <el-table :data="proxyList" stripe size="small" :empty-text="'暂无代理，请添加'">
                <el-table-column prop="url" label="代理地址" min-width="200" />
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                      {{ row.status === 'active' ? '可用' : '不可用' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="successRate" label="成功率" width="100">
                  <template #default="{ row }">
                    {{ (row.successRate * 100).toFixed(1) }}%
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100">
                  <template #default="{ row }">
                    <el-button type="danger" link size="small" @click="handleDeleteProxy(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <el-divider content-position="left">测试URL</el-divider>
            <el-form-item label="测试地址">
              <el-select
                v-model="localSettings.proxy.testUrls"
                multiple
                placeholder="选择或输入测试URL"
                style="width: 100%"
                :disabled="!localSettings.proxy.enabled"
              >
                <el-option label="百度" value="https://www.baidu.com" />
                <el-option label="Google" value="https://www.google.com" />
                <el-option label="京东" value="https://www.jd.com" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="导出设置" name="export">
          <el-form label-width="140px" :label-position="'left'">
            <el-divider content-position="left">默认导出配置</el-divider>
            <el-form-item label="默认格式">
              <el-select v-model="localSettings.export.defaultFormat" size="small" style="width: 150px">
                <el-option label="CSV" value="csv" />
                <el-option label="JSON" value="json" />
                <el-option label="Excel (XLSX)" value="excel" />
                <el-option label="HTML" value="html" />
                <el-option label="PDF" value="pdf" />
                <el-option label="Markdown" value="markdown" />
                <el-option label="TSV" value="tsv" />
                <el-option label="XML" value="xml" />
              </el-select>
            </el-form-item>
            <el-form-item label="默认编码">
              <el-select v-model="localSettings.export.defaultEncoding" size="small" style="width: 120px">
                <el-option label="UTF-8" value="utf-8" />
                <el-option label="GBK" value="gbk" />
              </el-select>
            </el-form-item>
            <el-form-item label="导出目录">
              <el-input v-model="localSettings.export.exportDirectory" size="small" style="width: 300px" />
            </el-form-item>

            <el-divider content-position="left">导出限制</el-divider>
            <el-form-item label="最大行数">
              <el-input-number v-model="localSettings.export.maxExportRows" :min="1000" :max="1000000" :step="1000" size="small" />
            </el-form-item>
            <el-form-item label="压缩导出">
              <el-switch v-model="localSettings.export.compressExports" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="通知设置" name="notification">
          <el-form label-width="140px" :label-position="'left'">
            <el-divider content-position="left">通知配置</el-divider>
            <el-form-item label="启用通知">
              <el-switch v-model="localSettings.notification.enabled" />
            </el-form-item>
            <el-form-item label="任务开始通知">
              <el-switch v-model="localSettings.notification.onStart" :disabled="!localSettings.notification.enabled" />
            </el-form-item>
            <el-form-item label="任务完成通知">
              <el-switch v-model="localSettings.notification.onComplete" :disabled="!localSettings.notification.enabled" />
            </el-form-item>
            <el-form-item label="错误通知">
              <el-switch v-model="localSettings.notification.onError" :disabled="!localSettings.notification.enabled" />
            </el-form-item>
            <el-form-item label="提示音">
              <el-switch v-model="localSettings.notification.soundEnabled" :disabled="!localSettings.notification.enabled" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="高级设置" name="advanced">
          <el-form label-width="140px" :label-position="'left'">
            <el-divider content-position="left">调试选项</el-divider>
            <el-form-item label="启用调试模式">
              <el-switch v-model="localSettings.advanced.enableDebug" />
            </el-form-item>
            <el-form-item label="最大日志数">
              <el-input-number v-model="localSettings.advanced.maxLogEntries" :min="100" :max="5000" :step="100" size="small" />
            </el-form-item>

            <el-divider content-position="left">缓存设置</el-divider>
            <el-form-item label="启用缓存">
              <el-switch v-model="localSettings.advanced.enableCache" />
            </el-form-item>
            <el-form-item label="缓存时长">
              <el-input-number
                v-model="localSettings.advanced.cacheDuration"
                :min="60000"
                :max="86400000"
                :step="60000"
                size="small"
                :disabled="!localSettings.advanced.enableCache"
              />
              <span class="form-tip">毫秒</span>
            </el-form-item>

            <el-divider content-position="left">性能监控</el-divider>
            <el-form-item label="启用性能监控">
              <el-switch v-model="localSettings.advanced.enableMetrics" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="关于" name="about">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="软件名称">
              <strong>VisualSpider</strong>
            </el-descriptions-item>
            <el-descriptions-item label="版本号">v1.0.0</el-descriptions-item>
            <el-descriptions-item label="构建日期">2024-03</el-descriptions-item>
            <el-descriptions-item label="作者">VisualSpider Team</el-descriptions-item>
            <el-descriptions-item label="描述">
              一款功能强大的可视化通用爬虫软件，支持复杂界面适配、链接智能识别、数据清洗等功能
            </el-descriptions-item>
            <el-descriptions-item label="技术栈">
              Vue 3 + TypeScript + Element Plus + Vite
            </el-descriptions-item>
          </el-descriptions>

          <el-space direction="vertical" style="margin-top: 24px; width: 100%">
            <el-card shadow="never">
              <template #header>核心功能</template>
              <el-space wrap>
                <el-tag type="primary">可视化配置</el-tag>
                <el-tag type="primary">界面适配</el-tag>
                <el-tag type="primary">智能链接识别</el-tag>
                <el-tag type="primary">数据清洗</el-tag>
                <el-tag type="primary">多格式导出</el-tag>
                <el-tag type="primary">代理服务</el-tag>
                <el-tag type="primary">任务调度</el-tag>
                <el-tag type="primary">NLP分析</el-tag>
              </el-space>
            </el-card>

            <el-card shadow="never">
              <template #header>快捷操作</template>
              <el-space>
                <el-button size="small" @click="handleExportSettings">
                  <el-icon><Download /></el-icon>
                  导出配置
                </el-button>
                <el-button size="small" @click="handleImportSettings">
                  <el-icon><Upload /></el-icon>
                  导入配置
                </el-button>
                <el-button size="small" type="danger" @click="handleResetSettings">
                  <el-icon><Refresh /></el-icon>
                  重置默认
                </el-button>
                <el-button size="small" @click="handleClearData">
                  <el-icon><Delete /></el-icon>
                  清除所有数据
                </el-button>
              </el-space>
            </el-card>
          </el-space>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="addProxyDialogVisible" title="添加代理" width="400px">
      <el-form label-width="80px">
        <el-form-item label="代理地址">
          <el-input v-model="newProxyUrl" placeholder="如: http://127.0.0.1:7890" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addProxyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddProxy">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Plus, Download, Upload, Refresh, Delete } from '@element-plus/icons-vue'
import { useAppStore, type AppSettings } from '@/stores/appStore'
import { storeToRefs } from 'pinia'

const appStore = useAppStore()
const { settings } = storeToRefs(appStore)

const activeTab = ref('general')
const addProxyDialogVisible = ref(false)
const newProxyUrl = ref('')

const proxyList = ref<Array<{ url: string; status: string; successRate: number }>>([])

const localSettings = reactive<AppSettings>({
  general: { ...settings.value.general },
  export: { ...settings.value.export },
  proxy: { ...settings.value.proxy },
  notification: { ...settings.value.notification },
  advanced: { ...settings.value.advanced }
})

onMounted(() => {
  Object.assign(localSettings, settings.value)
  loadProxyList()
})

function loadProxyList(): void {
  try {
    const saved = localStorage.getItem('visual-spider-proxies')
    if (saved) {
      proxyList.value = JSON.parse(saved)
    }
  } catch {
    proxyList.value = []
  }
}

function saveProxyList(): void {
  localStorage.setItem('visual-spider-proxies', JSON.stringify(proxyList.value))
}

function handleSaveSettings(): void {
  appStore.updateSettings(localSettings)
  ElMessage.success('设置已保存')
}

function handleResetSettings(): void {
  ElMessageBox.confirm('确定要重置所有设置吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    appStore.resetSettings()
    Object.assign(localSettings, appStore.settings)
    ElMessage.success('设置已重置')
  }).catch(() => {})
}

function handleAddProxy(): void {
  newProxyUrl.value = ''
  addProxyDialogVisible.value = true
}

function confirmAddProxy(): void {
  if (!newProxyUrl.value.trim()) {
    ElMessage.warning('请输入代理地址')
    return
  }

  proxyList.value.push({
    url: newProxyUrl.value,
    status: 'active',
    successRate: 1.0
  })
  saveProxyList()
  addProxyDialogVisible.value = false
  ElMessage.success('代理已添加')
}

function handleDeleteProxy(proxy: { url: string }): void {
  proxyList.value = proxyList.value.filter(p => p.url !== proxy.url)
  saveProxyList()
  ElMessage.success('代理已删除')
}

function handleExportSettings(): void {
  const data = JSON.stringify(settings.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `visual-spider-settings-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('配置已导出')
}

function handleImportSettings(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e: any) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event: any) => {
      try {
        const imported = JSON.parse(event.target.result)
        appStore.updateSettings(imported)
        Object.assign(localSettings, imported)
        ElMessage.success('配置已导入')
      } catch {
        ElMessage.error('配置导入失败，文件格式错误')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

function handleClearData(): void {
  ElMessageBox.confirm('确定要清除所有本地数据吗？包括任务、设置和日志都将被删除。此操作不可恢复！', '危险操作', {
    confirmButtonText: '确定清除',
    cancelButtonText: '取消',
    type: 'error'
  }).then(() => {
    localStorage.clear()
    appStore.resetSettings()
    appStore.clearLogs()
    appStore.clearNotifications()
    Object.assign(localSettings, appStore.settings)
    proxyList.value = []
    ElMessage.success('所有数据已清除')
  }).catch(() => {})
}
</script>

<style scoped>
.settings {
  max-width: 1000px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-tip {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.proxy-section {
  margin-top: 16px;
}

.proxy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
</style>
