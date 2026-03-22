<template>
  <div class="settings">
    <el-card>
      <template #header>
        <span>系统设置</span>
      </template>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="通用设置" name="general">
          <el-form label-width="120px">
            <el-form-item label="默认请求延迟">
              <el-input-number v-model="settings.defaultDelay[0]" :min="0" :max="60" />
              <span class="form-tip">-</span>
              <el-input-number v-model="settings.defaultDelay[1]" :min="0" :max="60" />
              <span class="form-tip">秒</span>
            </el-form-item>
            <el-form-item label="默认超时时间">
              <el-input-number v-model="settings.defaultTimeout" :min="5000" :max="120000" :step="5000" />
              <span class="form-tip">毫秒</span>
            </el-form-item>
            <el-form-item label="默认重试次数">
              <el-input-number v-model="settings.defaultRetries" :min="0" :max="10" />
            </el-form-item>
            <el-form-item label="遵守robots.txt">
              <el-switch v-model="settings.respectRobotsTxt" />
            </el-form-item>
            <el-form-item label="并发线程数">
              <el-input-number v-model="settings.concurrency" :min="1" :max="50" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="代理设置" name="proxy">
          <div class="proxy-section">
            <div class="proxy-header">
              <span>代理池管理</span>
              <el-button type="primary" size="small" @click="handleAddProxy">
                <el-icon><Plus /></el-icon>
                添加代理
              </el-button>
            </div>
            <el-table :data="proxies" stripe size="small">
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
        </el-tab-pane>
        <el-tab-pane label="导出设置" name="export">
          <el-form label-width="120px">
            <el-form-item label="默认导出格式">
              <el-select v-model="settings.defaultExportFormat" style="width: 200px">
                <el-option label="CSV" value="csv" />
                <el-option label="JSON" value="json" />
                <el-option label="Excel" value="excel" />
                <el-option label="HTML" value="html" />
              </el-select>
            </el-form-item>
            <el-form-item label="默认编码">
              <el-select v-model="settings.defaultEncoding" style="width: 200px">
                <el-option label="UTF-8" value="utf-8" />
                <el-option label="GBK" value="gbk" />
              </el-select>
            </el-form-item>
            <el-form-item label="导出目录">
              <el-input v-model="settings.exportDirectory" style="width: 300px" />
              <el-button size="small" @click="handleSelectDirectory">选择</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="关于" name="about">
          <div class="about-section">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="软件名称">VisualSpider</el-descriptions-item>
              <el-descriptions-item label="版本号">1.0.0</el-descriptions-item>
              <el-descriptions-item label="作者">VisualSpider Team</el-descriptions-item>
              <el-descriptions-item label="描述">可视化网页爬虫工具</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-tab-pane>
      </el-tabs>
      <div class="settings-footer">
        <el-button type="primary" @click="handleSaveSettings">保存设置</el-button>
        <el-button @click="handleResetSettings">重置默认</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const activeTab = ref('general')

const settings = reactive({
  defaultDelay: [2, 5] as [number, number],
  defaultTimeout: 30000,
  defaultRetries: 3,
  respectRobotsTxt: true,
  concurrency: 10,
  defaultExportFormat: 'csv' as 'csv' | 'json' | 'excel' | 'html',
  defaultEncoding: 'utf-8' as 'utf-8' | 'gbk',
  exportDirectory: ''
})

const proxies = ref<{ id: string; url: string; status: string; successRate: number }[]>([])

function handleAddProxy() {
  proxies.value.push({
    id: Date.now().toString(),
    url: '',
    status: 'active',
    successRate: 1.0
  })
}

function handleDeleteProxy(proxy: { id: string }) {
  const index = proxies.value.findIndex(p => p.id === proxy.id)
  if (index !== -1) {
    proxies.value.splice(index, 1)
  }
}

function handleSelectDirectory() {
  ElMessage.info('目录选择功能开发中')
}

function handleSaveSettings() {
  localStorage.setItem('visual-spider-settings', JSON.stringify(settings))
  localStorage.setItem('visual-spider-proxies', JSON.stringify(proxies.value))
  ElMessage.success('设置已保存')
}

function handleResetSettings() {
  settings.defaultDelay = [2, 5]
  settings.defaultTimeout = 30000
  settings.defaultRetries = 3
  settings.respectRobotsTxt = true
  settings.concurrency = 10
  settings.defaultExportFormat = 'csv'
  settings.defaultEncoding = 'utf-8'
  ElMessage.info('已重置为默认设置')
}

onMounted(() => {
  const saved = localStorage.getItem('visual-spider-settings')
  if (saved) {
    try {
      Object.assign(settings, JSON.parse(saved))
    } catch {}
  }
  const savedProxies = localStorage.getItem('visual-spider-proxies')
  if (savedProxies) {
    try {
      proxies.value = JSON.parse(savedProxies)
    } catch {}
  }
})
</script>

<style scoped>
.settings {
  max-width: 800px;
  margin: 0 auto;
}

.form-tip {
  margin: 0 8px;
  color: #909399;
}

.proxy-section {
  padding: 16px 0;
}

.proxy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.settings-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
}

.about-section {
  padding: 20px 0;
}
</style>
