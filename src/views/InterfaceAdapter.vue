<template>
  <div class="interface-adapter">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>复杂界面适配测试</span>
          <el-space>
            <el-button type="primary" @click="handleAnalyze" :loading="analyzing">
              <el-icon><Search /></el-icon>
              分析页面
            </el-button>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-space>
        </div>
      </template>

      <el-input
        v-model="urlInput"
        placeholder="请输入要测试的网址，如: https://www.bilibili.com"
        size="large"
        clearable
        @keyup.enter="handleAnalyze"
      >
        <template #prepend>
          <el-select v-model="urlProtocol" style="width: 100px">
            <el-option label="https://" value="https" />
            <el-option label="http://" value="http" />
          </el-select>
        </template>
      </el-input>

      <el-checkbox v-model="autoAnalyze" style="margin-top: 12px">
        启用自动分析
      </el-checkbox>
    </el-card>

    <el-row :gutter="20" style="margin-top: 20px" v-if="result">
      <el-col :span="24">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="界面识别" name="type">
            <el-card>
              <template #header>界面类型检测结果</template>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="界面类型">
                  <el-tag size="large" :type="result.interfaceType.type === 'unknown' ? 'info' : 'success'">
                    {{ result.interfaceType.icon }} {{ result.interfaceType.name }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="置信度">
                  <el-progress :percentage="Math.round(result.interfaceType.confidence * 100)" />
                </el-descriptions-item>
              </el-descriptions>

              <el-alert
                v-if="result.warnings.length > 0"
                type="warning"
                :closable="false"
                style="margin-top: 20px"
              >
                <template #title>注意事项</template>
                <ul style="margin-top: 8px; padding-left: 20px">
                  <li v-for="(warning, index) in result.warnings" :key="index">
                    {{ warning }}
                  </li>
                </ul>
              </el-alert>
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="推荐选择器" name="selectors">
            <el-card>
              <template #header>自动推荐的数据字段选择器</template>
              <el-table :data="result.recommendedSelectors" stripe size="small">
                <el-table-column prop="field" label="字段" width="120" />
                <el-table-column prop="cssSelector" label="CSS选择器" min-width="200">
                  <template #default="{ row }">
                    <code class="selector-code">{{ row.cssSelector }}</code>
                  </template>
                </el-table-column>
                <el-table-column prop="confidence" label="置信度" width="100">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.confidence >= 0.8 ? 'success' : row.confidence >= 0.6 ? 'warning' : 'info'">
                      {{ (row.confidence * 100).toFixed(0) }}%
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>

            <el-card style="margin-top: 16px">
              <template #header>分页选择器</template>
              <el-tag
                v-for="selector in result.paginationSelectors"
                :key="selector"
                style="margin-right: 8px; margin-bottom: 8px"
              >
                {{ selector }}
              </el-tag>
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="链接分析" name="links">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>提取到的链接 ({{ filteredLinks.length }})</span>
                  <el-space>
                    <el-select v-model="linkTypeFilter" placeholder="链接类型" clearable style="width: 120px">
                      <el-option label="全部" value="" />
                      <el-option label="视频" value="video" />
                      <el-option label="文章" value="article" />
                      <el-option label="商品" value="product" />
                      <el-option label="用户" value="user" />
                      <el-option label="图片" value="image" />
                      <el-option label="其他" value="other" />
                    </el-select>
                    <el-button size="small" @click="handleExportLinks">导出链接</el-button>
                  </el-space>
                </div>
              </template>

              <el-table :data="filteredLinks" stripe size="small" max-height="400">
                <el-table-column prop="type" label="类型" width="80">
                  <template #default="{ row }">
                    <el-tag size="small" :type="getLinkTypeTagType(row.type)">
                      {{ getLinkTypeLabel(row.type) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="text" label="链接文本" min-width="200" show-overflow-tooltip />
                <el-table-column prop="url" label="URL" min-width="300" show-overflow-tooltip>
                  <template #default="{ row }">
                    <code class="url-code">{{ truncateUrl(row.url, 60) }}</code>
                  </template>
                </el-table-column>
                <el-table-column label="有效" width="60">
                  <template #default="{ row }">
                    <el-icon :color="row.isValid ? '#67C23A' : '#F56C6C'">
                      <CircleCheck v-if="row.isValid" />
                      <CircleClose v-else />
                    </el-icon>
                  </template>
                </el-table-column>
              </el-table>

              <el-statistics title="链接统计" :data="linkStats" style="margin-top: 20px" />
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="字段映射" name="mapping">
            <el-card>
              <template #header>推荐字段映射配置</template>
              <el-table :data="result.fieldMappings" stripe size="small">
                <el-table-column prop="fieldName" label="字段名" width="120" />
                <el-table-column prop="cssSelector" label="CSS选择器" min-width="200">
                  <template #default="{ row }">
                    <code>{{ row.cssSelector }}</code>
                  </template>
                </el-table-column>
                <el-table-column prop="attribute" label="属性" width="100">
                  <template #default="{ row }">
                    <el-tag size="small">{{ row.attribute }}</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="预设模板" name="templates">
            <el-card>
              <template #header>常用网站预设模板</template>
              <el-row :gutter="20">
                <el-col :span="8" v-for="template in websiteTemplates" :key="template.name">
                  <el-card shadow="hover" class="template-card" @click="loadTemplate(template)">
                    <div class="template-icon">{{ template.icon }}</div>
                    <div class="template-name">{{ template.name }}</div>
                    <div class="template-desc">{{ template.description }}</div>
                    <div class="template-fields">
                      <el-tag
                        v-for="field in template.fields.slice(0, 3)"
                        :key="field"
                        size="small"
                        style="margin-right: 4px; margin-bottom: 4px"
                      >
                        {{ field }}
                      </el-tag>
                      <el-tag v-if="template.fields.length > 3" size="small">
                        +{{ template.fields.length - 3 }}
                      </el-tag>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>

    <el-empty v-else description="请输入网址进行界面分析" style="margin-top: 40px" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import {
  adaptInterface,
  extractLinks,
  groupLinksByType,
  deduplicateLinks,
  type AdaptResult,
  type LinkInfo
} from '@/utils/interfaceAdapter'

const urlInput = ref('')
const urlProtocol = ref('https')
const analyzing = ref(false)
const autoAnalyze = ref(false)
const activeTab = ref('type')
const linkTypeFilter = ref('')
const result = ref<AdaptResult | null>(null)
const links = ref<LinkInfo[]>([])

const filteredLinks = computed(() => {
  if (!links.value) return []
  if (!linkTypeFilter.value) return links.value

  return links.value.filter(link => link.type === linkTypeFilter.value)
})

const linkStats = computed(() => {
  if (!links.value || links.value.length === 0) {
    return [
      { label: '总链接数', value: 0 },
      { label: '有效链接', value: 0 },
      { label: '视频链接', value: 0 },
      { label: '文章链接', value: 0 }
    ]
  }

  const grouped = groupLinksByType(links.value)
  const validLinks = links.value.filter(l => l.isValid)

  return [
    { label: '总链接数', value: links.value.length },
    { label: '有效链接', value: validLinks.length },
    { label: '视频链接', value: grouped.video.length },
    { label: '文章链接', value: grouped.article.length },
    { label: '商品链接', value: grouped.product.length },
    { label: '用户链接', value: grouped.user.length }
  ]
})

const websiteTemplates = [
  {
    name: 'Bilibili',
    icon: '📺',
    description: 'B站视频网站',
    url: 'bilibili.com',
    fields: ['视频标题', '播放量', '弹幕数', 'UP主', '发布时间', '视频链接', '封面图']
  },
  {
    name: '淘宝/天猫',
    icon: '🛒',
    description: '电商商品页面',
    url: 'taobao.com/tmall.com',
    fields: ['商品标题', '价格', '销量', '店铺', '商品图片', '商品链接']
  },
  {
    name: '知乎',
    icon: '💬',
    description: '问答社区',
    url: 'zhihu.com',
    fields: ['问题标题', '回答内容', '回答者', '赞同数', '评论数']
  },
  {
    name: '微博',
    icon: '📱',
    description: '社交媒体',
    url: 'weibo.com',
    fields: ['微博内容', '发布者', '发布时间', '点赞数', '转发数', '评论数']
  },
  {
    name: '掘金',
    icon: '📝',
    description: '技术博客平台',
    url: 'juejin.cn',
    fields: ['文章标题', '作者', '发布时间', '阅读量', '点赞数', '标签']
  },
  {
    name: '京东',
    icon: '📦',
    description: '京东电商',
    url: 'jd.com',
    fields: ['商品名称', '价格', '促销价', '销量', '店铺', '商品评价']
  }
]

function getLinkTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    video: '视频',
    article: '文章',
    product: '商品',
    user: '用户',
    comment: '评论',
    image: '图片',
    other: '其他'
  }
  return labels[type] || type
}

function getLinkTypeTagType(type: string): any {
  const types: Record<string, string> = {
    video: 'danger',
    article: 'primary',
    product: 'warning',
    user: 'success',
    comment: 'info',
    image: '',
    other: 'info'
  }
  return types[type] || 'info'
}

function truncateUrl(url: string, maxLength: number): string {
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength) + '...'
}

async function handleAnalyze() {
  const fullUrl = urlProtocol.value + '://' + urlInput.value
  if (!urlInput.value) {
    ElMessage.warning('请输入网址')
    return
  }

  analyzing.value = true

  try {
    result.value = adaptInterface('', fullUrl)

    const response = await fetch(fullUrl, {
      method: 'GET',
      mode: 'cors'
    }).catch(() => null)

    let html = ''
    if (response && response.ok) {
      html = await response.text()
      result.value = adaptInterface(html, fullUrl)
    }

    if (html) {
      links.value = extractLinks(html, fullUrl)
      links.value = deduplicateLinks(links.value)
    }

    ElMessage.success('分析完成')
  } catch (e) {
    ElMessage.error('分析失败: ' + String(e))
  } finally {
    analyzing.value = false
  }
}

function handleReset() {
  urlInput.value = ''
  result.value = null
  links.value = []
  activeTab.value = 'type'
  linkTypeFilter.value = ''
}

function handleExportLinks() {
  if (!links.value || links.value.length === 0) {
    ElMessage.warning('没有可导出的链接')
    return
  }

  const csvContent = [
    '类型,链接文本,URL,有效',
    ...links.value.map(link =>
      `"${link.type}","${link.text.replace(/"/g, '""')}","${link.url}",${link.isValid}`
    )
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'extracted_links.csv'
  a.click()
  URL.revokeObjectURL(url)

  ElMessage.success('链接已导出')
}

function loadTemplate(template: any) {
  urlInput.value = template.url
  result.value = null
  ElMessage.info('已加载模板: ' + template.name)
}

watch(urlInput, () => {
  if (autoAnalyze.value && urlInput.value.length > 5) {
    handleAnalyze()
  }
})
</script>

<style scoped>
.interface-adapter {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selector-code {
  font-family: monospace;
  font-size: 12px;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.url-code {
  font-family: monospace;
  font-size: 11px;
  color: #409eff;
  word-break: break-all;
}

.template-card {
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 16px;
}

.template-card:hover {
  transform: translateY(-4px);
}

.template-icon {
  font-size: 36px;
  text-align: center;
  margin-bottom: 12px;
}

.template-name {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  color: #303133;
}

.template-desc {
  font-size: 12px;
  color: #909399;
  text-align: center;
  margin-top: 8px;
}

.template-fields {
  margin-top: 12px;
  text-align: center;
}
</style>
