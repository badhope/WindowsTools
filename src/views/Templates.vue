<template>
  <div class="templates">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>模板市场</span>
          <el-button type="primary" @click="handleImportTemplate">
            <el-icon><Upload /></el-icon>
            导入模板
          </el-button>
        </div>
      </template>
      <el-tabs v-model="activeCategory" @tab-change="handleCategoryChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="电商" name="ecommerce" />
        <el-tab-pane label="新闻" name="news" />
        <el-tab-pane label="社交" name="social" />
        <el-tab-pane label="招聘" name="job" />
        <el-tab-pane label="房产" name="realestate" />
      </el-tabs>
      <div class="template-grid">
        <el-card
          v-for="template in filteredTemplates"
          :key="template.id"
          class="template-card"
          shadow="hover"
        >
          <template #header>
            <div class="template-header">
              <span class="template-name">{{ template.name }}</span>
              <el-tag size="small" type="info">{{ template.category }}</el-tag>
            </div>
          </template>
          <div class="template-desc">{{ template.description }}</div>
          <div class="template-meta">
            <span>作者: {{ template.author }}</span>
            <span>使用: {{ template.usageCount }}次</span>
          </div>
          <div class="template-actions">
            <el-button type="primary" size="small" @click="handleUseTemplate(template)">
              使用模板
            </el-button>
            <el-button size="small" @click="handleExportTemplate(template)">
              导出
            </el-button>
          </div>
        </el-card>
      </div>
      <el-empty v-if="filteredTemplates.length === 0" description="该分类下暂无模板" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/taskStore'
import type { Template } from '@/types'

const router = useRouter()
const taskStore = useTaskStore()

const activeCategory = ref('all')

const builtInTemplates: Template[] = [
  {
    id: 'tmpl_1',
    name: '电商商品采集',
    description: '采集淘宝/京东等电商平台的商品标题、价格、图片、销量等信息',
    category: 'ecommerce',
    task: {
      name: '电商商品采集',
      url: '',
      crawlConfig: { method: 'GET', headers: {}, proxy: null, delay: [3, 6], maxRetries: 3, timeout: 30000, renderJs: true },
      fields: [
        { id: 'f1', name: '商品名称', selector: '.item-title', selectorType: 'css', attribute: 'text', required: true },
        { id: 'f2', name: '价格', selector: '.price', selectorType: 'css', attribute: 'text', required: true },
        { id: 'f3', name: '销量', selector: '.sales', selectorType: 'css', attribute: 'text', required: false }
      ],
      pagination: { enabled: true, selector: '.next-page', selectorType: 'css', maxPages: 50, nextButtonText: '下一页' },
      status: 'idle'
    },
    usageCount: 1523,
    author: 'System'
  },
  {
    id: 'tmpl_2',
    name: '新闻文章采集',
    description: '采集新闻网站的文章标题、正文、发布时间、来源等',
    category: 'news',
    task: {
      name: '新闻文章采集',
      url: '',
      crawlConfig: { method: 'GET', headers: {}, proxy: null, delay: [2, 4], maxRetries: 3, timeout: 20000, renderJs: false },
      fields: [
        { id: 'f1', name: '标题', selector: 'h1.title', selectorType: 'css', attribute: 'text', required: true },
        { id: 'f2', name: '正文', selector: 'div.content', selectorType: 'css', attribute: 'text', required: true },
        { id: 'f3', name: '发布时间', selector: 'span.time', selectorType: 'css', attribute: 'text', required: false }
      ],
      pagination: { enabled: false, selector: '', selectorType: 'css', maxPages: 1, nextButtonText: '' },
      status: 'idle'
    },
    usageCount: 892,
    author: 'System'
  },
  {
    id: 'tmpl_3',
    name: '招聘信息采集',
    description: '采集招聘网站的职位名称、公司名、薪资、要求等信息',
    category: 'job',
    task: {
      name: '招聘信息采集',
      url: '',
      crawlConfig: { method: 'GET', headers: {}, proxy: null, delay: [2, 5], maxRetries: 3, timeout: 25000, renderJs: false },
      fields: [
        { id: 'f1', name: '职位名称', selector: 'div.job-title', selectorType: 'css', attribute: 'text', required: true },
        { id: 'f2', name: '公司名称', selector: 'div.company', selectorType: 'css', attribute: 'text', required: true },
        { id: 'f3', name: '薪资范围', selector: 'span.salary', selectorType: 'css', attribute: 'text', required: false },
        { id: 'f4', name: '职位链接', selector: 'a.job-link', selectorType: 'css', attribute: 'href', required: false }
      ],
      pagination: { enabled: true, selector: 'a.next', selectorType: 'css', maxPages: 20, nextButtonText: '下一页' },
      status: 'idle'
    },
    usageCount: 1204,
    author: 'System'
  },
  {
    id: 'tmpl_4',
    name: '房产信息采集',
    description: '采集房产网站的房源信息、户型、单价、面积等',
    category: 'realestate',
    task: {
      name: '房产信息采集',
      url: '',
      crawlConfig: { method: 'GET', headers: {}, proxy: null, delay: [3, 6], maxRetries: 3, timeout: 30000, renderJs: false },
      fields: [
        { id: 'f1', name: '房源标题', selector: 'div.house-title', selectorType: 'css', attribute: 'text', required: true },
        { id: 'f2', name: '户型', selector: 'span.rooms', selectorType: 'css', attribute: 'text', required: true },
        { id: 'f3', name: '单价', selector: 'span.price', selectorType: 'css', attribute: 'text', required: false },
        { id: 'f4', name: '面积', selector: 'span.area', selectorType: 'css', attribute: 'text', required: false }
      ],
      pagination: { enabled: true, selector: 'a.next-page', selectorType: 'css', maxPages: 30, nextButtonText: '下一页' },
      status: 'idle'
    },
    usageCount: 567,
    author: 'System'
  }
]

const filteredTemplates = computed(() => {
  if (activeCategory.value === 'all') return builtInTemplates
  return builtInTemplates.filter(t => t.category === activeCategory.value)
})

function handleCategoryChange() {}

function handleUseTemplate(template: Template) {
  const task = taskStore.createNewTask()
  Object.assign(task, {
    name: template.name,
    crawlConfig: { ...template.task.crawlConfig },
    fields: template.task.fields.map(f => ({ ...f, id: Date.now().toString() + Math.random().toString(36).substr(2) })),
    pagination: { ...template.task.pagination }
  })
  taskStore.setCurrentTask(task)
  taskStore.addTask(task)
  ElMessage.success(`已使用模板"${template.name}"创建任务`)
  router.push('/')
}

function handleExportTemplate(template: Template) {
  const data = JSON.stringify(template, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${template.name}.vstmpl`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('模板导出成功')
}

function handleImportTemplate() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.vstmpl,.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const template = JSON.parse(text) as Template
      builtInTemplates.push(template)
      ElMessage.success('模板导入成功')
    } catch {
      ElMessage.error('模板格式不正确')
    }
  }
  input.click()
}
</script>

<style scoped>
.templates {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.template-card {
  transition: transform 0.2s;
}

.template-card:hover {
  transform: translateY(-4px);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-name {
  font-weight: 600;
}

.template-desc {
  font-size: 13px;
  color: #606266;
  margin-bottom: 12px;
  min-height: 40px;
}

.template-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
  margin-bottom: 12px;
}

.template-actions {
  display: flex;
  gap: 8px;
}
</style>
