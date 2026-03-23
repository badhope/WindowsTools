<template>
  <div class="task-config">
    <el-card class="url-input-card">
      <template #header>
        <div class="card-header">
          <span>{{ $t('task.step1') }}</span>
          <el-button type="primary" link @click="handleAutoDetect" :loading="detecting">
            <el-icon><MagicStick /></el-icon>
            {{ $t('task.autoDetect') }}
          </el-button>
        </div>
      </template>
      <el-input
        v-model="urlInput"
        :placeholder="$t('task.urlPlaceholder')"
        size="large"
        clearable
        @keyup.enter="handleFetchPreview"
      >
        <template #prepend>
          <el-select v-model="method" style="width: 100px">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
          </el-select>
        </template>
        <template #append>
          <el-button :icon="Search" @click="handleFetchPreview" :disabled="!urlInput" />
        </template>
      </el-input>
      <div class="url-tips">
        <el-tag size="small" type="info">{{ $t('task.singleUrlTip') }}</el-tag>
        <el-tag size="small" type="info">{{ $t('task.batchImportTip') }}</el-tag>
      </div>
    </el-card>

    <el-row :gutter="20" class="config-row">
      <el-col :span="14">
        <el-card class="rules-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t('task.step2') }}</span>
            </div>
          </template>
          <el-tabs v-model="activeTab">
            <el-tab-pane :label="$t('task.fieldConfig')" name="fields">
              <div class="fields-panel">
                <div class="field-list">
                  <el-empty v-if="fields.length === 0" :description="$t('task.noFields')" />
                  <div v-for="(field, index) in fields" :key="field.id" class="field-item">
                    <el-input v-model="field.name" :placeholder="$t('task.fieldName')" style="width: 120px" />
                    <el-select v-model="field.selectorType" style="width: 100px" @change="field.selector = ''">
                      <el-option label="CSS" value="css" />
                      <el-option label="XPath" value="xpath" />
                      <el-option label="Regex" value="regex" />
                    </el-select>
                    <el-input
                      v-model="field.selector"
                      :placeholder="$t('task.selectorPlaceholder')"
                      style="flex: 1"
                    />
                    <el-select v-model="field.attribute" style="width: 100px">
                      <el-option :label="$t('task.attrText')" value="text" />
                      <el-option :label="$t('task.attrHref')" value="href" />
                      <el-option :label="$t('task.attrSrc')" value="src" />
                      <el-option :label="$t('task.attrHtml')" value="html" />
                    </el-select>
                    <el-button type="danger" :icon="Delete" @click="removeField(index)" />
                  </div>
                </div>
                <div class="field-actions">
                  <el-button type="primary" @click="addField">
                    <el-icon><Plus /></el-icon>
                    {{ $t('common.add') }}
                  </el-button>
                  <el-button type="success" @click="handleTestExtract">
                    <el-icon><VideoPlay /></el-icon>
                    {{ $t('task.testExtract') }}
                  </el-button>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane :label="$t('task.pagination')" name="pagination">
              <div class="pagination-panel">
                <el-form label-width="100px">
                  <el-form-item :label="$t('task.paginationEnabled')">
                    <el-switch v-model="pagination.enabled" />
                  </el-form-item>
                  <el-form-item :label="$t('task.paginationSelector')" v-if="pagination.enabled">
                    <el-input v-model="pagination.selector" placeholder="a.next_page" />
                  </el-form-item>
                  <el-form-item :label="$t('task.selectorType')" v-if="pagination.enabled">
                    <el-radio-group v-model="pagination.selectorType">
                      <el-radio label="css">CSS</el-radio>
                      <el-radio label="xpath">XPath</el-radio>
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item :label="$t('task.maxPages')" v-if="pagination.enabled">
                    <el-input-number v-model="pagination.maxPages" :min="1" :max="1000" />
                  </el-form-item>
                </el-form>
              </div>
            </el-tab-pane>
            <el-tab-pane :label="$t('task.advanced')" name="advanced">
              <div class="advanced-panel">
                <el-form label-width="120px" size="default">
                  <el-form-item :label="$t('task.timeout')">
                    <el-input-number v-model="crawlConfig.timeout" :min="5000" :max="120000" :step="5000" />
                    <span class="form-tip">ms</span>
                  </el-form-item>
                  <el-form-item :label="$t('task.maxRetries')">
                    <el-input-number v-model="crawlConfig.maxRetries" :min="0" :max="10" />
                  </el-form-item>
                  <el-form-item :label="$t('task.delay')">
                    <el-input-number v-model="crawlConfig.delay[0]" :min="0" :max="60" />
                    <span class="form-tip">-</span>
                    <el-input-number v-model="crawlConfig.delay[1]" :min="0" :max="60" />
                    <span class="form-tip">s</span>
                  </el-form-item>
                  <el-form-item :label="$t('task.proxy')">
                    <el-input v-model="crawlConfig.proxy" placeholder="http://127.0.0.1:7890" clearable />
                  </el-form-item>
                </el-form>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card class="preview-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t('task.step3') }}</span>
              <el-button type="text" @click="handleRefreshPreview">
                <el-icon><Refresh /></el-icon>
                {{ $t('common.refresh') }}
              </el-button>
            </div>
          </template>
          <div class="preview-content">
            <el-empty v-if="!hasPreview" :description="$t('task.noPreview')" />
            <div v-else class="preview-table-container">
              <el-table :data="previewData" stripe max-height="400" size="small">
                <el-table-column
                  v-for="col in previewColumns"
                  :key="col"
                  :prop="col"
                  :label="col"
                  min-width="120"
                  show-overflow-tooltip
                />
              </el-table>
              <div class="preview-stats">
                {{ $t('task.recordCount', { count: previewData.length }) }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="action-card">
      <template #header>
        <div class="card-header">
          <span>{{ $t('task.step4') }}</span>
        </div>
      </template>
      <div class="action-bar">
        <div class="action-left">
          <el-input v-model="taskName" :placeholder="$t('task.taskNamePlaceholder')" style="width: 200px">
            <template #prepend>{{ $t('task.taskName') }}</template>
          </el-input>
          <el-button type="success" size="large" @click="handleStartCrawl" :disabled="!canStartCrawl">
            <el-icon><VideoPlay /></el-icon>
            {{ $t('task.start') }}
          </el-button>
          <el-button size="large" @click="handlePauseCrawl" :disabled="crawlStatus !== 'running'">
            <el-icon><VideoPause /></el-icon>
            {{ $t('task.pause') }}
          </el-button>
          <el-button size="large" @click="handleStopCrawl" :disabled="crawlStatus === 'idle'">
            <el-icon><SwitchButton /></el-icon>
            {{ $t('task.stop') }}
          </el-button>
        </div>
        <div class="action-right">
          <el-button type="primary" @click="handleSaveTask" :disabled="!taskName">
            <el-icon><DocumentChecked /></el-icon>
            {{ $t('common.save') }}
          </el-button>
          <el-button @click="handleExport" :disabled="!hasResults">
            <el-icon><Download /></el-icon>
            {{ $t('common.export') }}
          </el-button>
          <el-button @click="handleScreenshot" :disabled="!hasPreview">
            <el-icon><Picture /></el-icon>
            {{ $t('nav.screenshot') }}
          </el-button>
        </div>
      </div>
      <el-progress
        v-if="crawlStatus === 'running'"
        :percentage="crawlProgress"
        striped
        striped-flow
      />
      <div class="crawl-log" v-if="crawlLogs.length > 0">
        <div v-for="(log, index) in crawlLogs.slice(-5)" :key="index" class="log-item">
          <el-tag size="small" :type="log.type === 'error' ? 'danger' : log.type === 'success' ? 'success' : 'info'">
            {{ log.type }}
          </el-tag>
          <span>{{ log.message }}</span>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="exportDialogVisible" :title="$t('task.exportData')" width="400px">
      <el-form label-width="80px">
        <el-form-item :label="$t('task.exportFormat')">
          <el-select v-model="exportFormat" style="width: 100%">
            <el-option label="CSV" value="csv" />
            <el-option label="JSON" value="json" />
            <el-option label="HTML" value="html" />
            <el-option label="Excel (XLSX)" value="xlsx" />
            <el-option label="PDF" value="pdf" />
            <el-option label="Markdown" value="md" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('task.fileName')">
          <el-input v-model="exportFileName" :placeholder="$t('task.fileNamePlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exportDialogVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="confirmExport">{{ $t('common.export') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Delete, Plus, VideoPlay, VideoPause, SwitchButton, DocumentChecked, Download, Refresh, MagicStick, Picture } from '@element-plus/icons-vue'
import { useTaskStore } from '@/stores/taskStore'
import api from '@/services/api'
import { detectPageStructure, extractFields, findNextPage } from '@/utils/crawler'
import { exportToCSV, exportToJSON, exportToHTMLTable, exportToExcel, exportToPDF, exportToMarkdown } from '@/utils/export'
import { downloadScreenshot } from '@/utils/screenshot'
import type { Field } from '@/types'

const taskStore = useTaskStore()

const urlInput = ref('')
const method = ref<'GET' | 'POST'>('GET')
const taskName = ref('')
const activeTab = ref('fields')
const detecting = ref(false)
const hasPreview = ref(false)
const previewData = ref<Record<string, any>[]>([])
const previewColumns = ref<string[]>([])
const pageHtml = ref('')

const exportDialogVisible = ref(false)
const exportFormat = ref<'csv' | 'json' | 'html' | 'xlsx' | 'pdf' | 'md'>('csv')
const exportFileName = ref('')

const crawlProgress = ref(0)
const crawlLogs = ref<{ type: string; message: string }[]>([])

const fields = computed(() => taskStore.currentTask?.fields || [])
const pagination = computed(() => taskStore.currentTask?.pagination || { enabled: false, selector: '', selectorType: 'css' as const, maxPages: 10, nextButtonText: '' })
const crawlConfig = computed(() => taskStore.currentTask?.crawlConfig || { method: 'GET' as const, headers: {}, proxy: null, delay: [2, 5] as [number, number], maxRetries: 3, timeout: 30000, renderJs: false })
const crawlStatus = computed(() => taskStore.crawlStatus)
const hasResults = computed(() => previewData.value.length > 0)
const canStartCrawl = computed(() => urlInput.value && fields.value.length > 0)

function addField() {
  const field: Field = {
    id: Date.now().toString(),
    name: `字段${fields.value.length + 1}`,
    selector: '',
    selectorType: 'css',
    attribute: 'text',
    required: false
  }
  taskStore.addField(field)
}

function removeField(index: number) {
  const field = fields.value[index]
  if (field) {
    taskStore.removeField(field.id)
  }
}

async function handleAutoDetect() {
  if (!urlInput.value) {
    ElMessage.warning('请先输入目标网址')
    return
  }
  detecting.value = true
  try {
    ElMessage.info('正在获取页面并分析结构...')
    await fetchPageHtml()
    const detected = detectPageStructure(pageHtml.value)
    if (detected.length > 0) {
      detected.forEach((f) => {
        f.id = Date.now().toString() + Math.random().toString(36).substr(2)
        taskStore.addField(f)
      })
      ElMessage.success(`自动检测到 ${detected.length} 个可用字段`)
    } else {
      ElMessage.info('未检测到可用字段，请手动配置')
    }
  } catch (e) {
    ElMessage.error('自动检测失败: ' + String(e))
  } finally {
    detecting.value = false
  }
}

async function fetchPageHtml(): Promise<string> {
  const serverUrl = api.getServerUrl()
  if (serverUrl && serverUrl !== 'http://localhost:3000') {
    api.setServerUrl('http://localhost:3000')
  }

  const health = await api.checkHealth()
  if (!health) {
    throw new Error('后端服务未启动，请先启动后端服务')
  }

  try {
    const result = await api.crawl({
      url: urlInput.value,
      method: method.value as 'GET' | 'POST',
      headers: crawlConfig.value.headers as Record<string, string>,
      useBrowser: true,
      timeout: crawlConfig.value.timeout,
      proxy: crawlConfig.value.proxy || undefined,
      selectors: fields.value.map(f => ({
        name: f.name,
        selector: f.selector,
        type: f.selectorType as 'css' | 'xpath' | 'regex',
        attribute: f.attribute as 'text' | 'href' | 'src' | 'html'
      }))
    })

    if (result.success) {
      pageHtml.value = JSON.stringify(result.data, null, 2)
      previewData.value = result.data ? [result.data] : []
      previewColumns.value = result.data ? Object.keys(result.data) : []
      hasPreview.value = true
      return pageHtml.value
    } else {
      throw new Error('爬取失败')
    }
  } catch (e: any) {
    throw new Error('获取页面失败: ' + e.message)
  }
}

async function handleFetchPreview() {
  if (!urlInput.value) {
    ElMessage.warning('请输入目标网址')
    return
  }
  try {
    ElMessage.info('正在获取页面...')
    await fetchPageHtml()
    hasPreview.value = true
    ElMessage.success('页面获取成功，请在右侧预览')
  } catch (e) {
    ElMessage.error('获取页面失败: ' + String(e))
  }
}

async function handleTestExtract() {
  if (!urlInput.value || fields.value.length === 0) {
    ElMessage.warning('请先输入网址并添加至少一个字段')
    return
  }
  try {
    if (!pageHtml.value) {
      await fetchPageHtml()
    }
    const data = extractFields(pageHtml.value, fields.value)
    previewData.value = data
    previewColumns.value = data.length > 0 ? Object.keys(data[0]) : []
    hasPreview.value = true
    ElMessage.success(`测试提取完成，获取 ${data.length} 条数据`)
  } catch (e) {
    ElMessage.error('测试提取失败: ' + String(e))
  }
}

function handleRefreshPreview() {
  if (hasPreview.value) {
    handleTestExtract()
  }
}

async function handleStartCrawl() {
  if (!taskName.value) {
    ElMessage.warning('请输入任务名称')
    return
  }
  if (fields.value.length === 0) {
    ElMessage.warning('请至少添加一个字段')
    return
  }

  taskStore.resetCrawlStats()
  taskStore.crawlStatus = 'running'
  crawlLogs.value = []
  crawlProgress.value = 0

  try {
    await fetchPageHtml()
    let allData: Record<string, any>[] = []
    let currentUrl = urlInput.value
    let maxPages = pagination.value.enabled ? pagination.value.maxPages : 1

    for (let page = 0; page < maxPages; page++) {
      if ((taskStore.crawlStatus as string) === 'idle') {
        crawlLogs.value.push({ type: 'info', message: '抓取已停止' })
        break
      }

      crawlLogs.value.push({ type: 'info', message: `正在抓取第 ${page + 1} 页: ${currentUrl}` })

      const data = extractFields(pageHtml.value, fields.value)
      allData = allData.concat(data)
      taskStore.updateCrawlStats({ crawled: allData.length, success: data.length })

      crawlProgress.value = Math.round(((page + 1) / maxPages) * 100)

      if (pagination.value.enabled && page < maxPages - 1) {
        const nextUrl = findNextPage(pageHtml.value, pagination.value.selector)
        if (nextUrl) {
          currentUrl = nextUrl
          const delay = crawlConfig.value.delay
          const waitTime = delay[0] + Math.random() * (delay[1] - delay[0])
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000))

          const response = await fetch(currentUrl)
          pageHtml.value = await response.text()
        } else {
          crawlLogs.value.push({ type: 'info', message: '已到达最后一页' })
          break
        }
      } else {
        break
      }
    }

    previewData.value = allData
    previewColumns.value = allData.length > 0 ? Object.keys(allData[0]) : []
    hasPreview.value = true
    taskStore.setCrawlResults({
      taskId: taskName.value,
      data: allData,
      total: allData.length,
      errors: [],
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString()
    })
    taskStore.crawlStatus = 'completed'
    crawlLogs.value.push({ type: 'success', message: `抓取完成，共 ${allData.length} 条数据` })
    ElMessage.success('抓取任务完成')
  } catch (e) {
    taskStore.crawlStatus = 'error'
    crawlLogs.value.push({ type: 'error', message: String(e) })
    ElMessage.error('抓取失败: ' + String(e))
  }
}

function handlePauseCrawl() {
  taskStore.crawlStatus = 'paused'
  ElMessage.info('抓取已暂停')
}

function handleStopCrawl() {
  taskStore.crawlStatus = 'idle'
  ElMessage.info('抓取已停止')
}

function handleSaveTask() {
  if (!taskName.value) {
    ElMessage.warning('请输入任务名称')
    return
  }
  if (taskStore.currentTask) {
    taskStore.updateTask(taskStore.currentTask.id, {
      name: taskName.value,
      url: urlInput.value
    })
    ElMessage.success('任务已保存')
  } else {
    const task = taskStore.createNewTask()
    task.name = taskName.value
    task.url = urlInput.value
    task.fields = [...fields.value]
    task.pagination = { ...pagination.value } as any
    task.crawlConfig = { ...crawlConfig.value } as any
    taskStore.addTask(task)
    taskStore.setCurrentTask(task)
    ElMessage.success('任务已创建并保存')
  }
}

function handleExport() {
  exportFileName.value = taskName.value || 'export'
  exportDialogVisible.value = true
}

function confirmExport() {
  const data = previewData.value
  try {
    switch (exportFormat.value) {
      case 'csv':
        exportToCSV(data, { fileName: exportFileName.value })
        break
      case 'json':
        exportToJSON(data, { fileName: exportFileName.value })
        break
      case 'html':
        exportToHTMLTable(data, { fileName: exportFileName.value })
        break
      case 'xlsx':
        exportToExcel(data, { fileName: exportFileName.value })
        break
      case 'pdf':
        exportToPDF(data, { fileName: exportFileName.value })
        break
      case 'md':
        exportToMarkdown(data, { fileName: exportFileName.value })
        break
    }
    ElMessage.success('导出成功')
    exportDialogVisible.value = false
  } catch (e) {
    ElMessage.error('导出失败: ' + String(e))
  }
}

async function handleScreenshot() {
  try {
    ElMessage.info('正在截图...')
    await downloadScreenshot({}, `visual-spider-${Date.now()}`)
    ElMessage.success('截图已保存')
  } catch (e) {
    ElMessage.error('截图失败: ' + String(e))
  }
}
</script>

<style scoped>
.task-config {
  max-width: 1400px;
  margin: 0 auto;
}

.url-input-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.url-tips {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.config-row {
  margin-bottom: 20px;
}

.fields-panel,
.pagination-panel,
.advanced-panel {
  min-height: 300px;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.field-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.field-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.preview-content {
  min-height: 300px;
}

.preview-table-container {
  display: flex;
  flex-direction: column;
}

.preview-stats {
  margin-top: 12px;
  font-size: 13px;
  color: #909399;
  text-align: right;
}

.action-card {
  margin-bottom: 20px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.action-left,
.action-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.form-tip {
  margin-left: 8px;
  color: #909399;
  font-size: 13px;
}

.crawl-log {
  margin-top: 16px;
  max-height: 150px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
}
</style>
