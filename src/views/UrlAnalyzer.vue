<template>
  <div class="url-analyzer">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>URL 分析器</span>
          <el-space>
            <el-button type="primary" @click="handleAnalyze" :loading="analyzing">
              <el-icon><Search /></el-icon>
              分析
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
        placeholder="请输入要分析的 URL"
        size="large"
        clearable
        @keyup.enter="handleAnalyze"
      >
        <template #prepend>
          <el-select v-model="urlProtocol" style="width: 100px">
            <el-option label="http://" value="http" />
            <el-option label="https://" value="https" />
          </el-select>
        </template>
      </el-input>

      <el-checkbox v-model="autoAnalyze" style="margin-top: 12px">
        实时分析（输入时自动分析）
      </el-checkbox>
    </el-card>

    <el-row :gutter="20" style="margin-top: 20px" v-if="analysisResult">
      <el-col :span="24">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基础信息" name="basic">
            <el-card>
              <template #header>URL 组件分解</template>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="完整URL">
                  <el-tooltip :content="analysisResult.original" placement="top">
                    <span class="url-text">{{ truncateUrl(analysisResult.original, 50) }}</span>
                  </el-tooltip>
                </el-descriptions-item>
                <el-descriptions-item label="协议">
                  <el-tag :type="analysisResult.components.protocol === 'https' ? 'success' : 'warning'">
                    {{ analysisResult.components.protocol }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="主机名">
                  <span class="url-text">{{ analysisResult.components.host }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="端口">
                  {{ analysisResult.components.port || '默认' }}
                </el-descriptions-item>
                <el-descriptions-item label="路径">
                  <span class="url-text">{{ analysisResult.components.path }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="锚点">
                  {{ analysisResult.components.hash || '无' }}
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="参数分析" name="params">
            <el-card>
              <template #header>查询参数</template>
              <el-table :data="queryParams" stripe size="small">
                <el-table-column prop="key" label="参数名" width="200" />
                <el-table-column prop="value" label="参数值" min-width="200">
                  <template #default="{ row }">
                    <span class="url-text">{{ row.value }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="type" label="类型" width="120">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.isDynamic ? 'warning' : 'info'">
                      {{ row.isDynamic ? '动态' : '静态' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="risk" label="风险" width="100">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.isSignature ? 'danger' : 'success'">
                      {{ row.isSignature ? '签名参数' : '正常' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>

            <el-card style="margin-top: 16px" v-if="signatureInfo.hasSignature || signatureInfo.hasTimestamp">
              <template #header>签名检测</template>
              <el-alert :type="signatureInfo.hasSignature ? 'error' : 'warning'" :closable="false">
                <template #title>
                  {{ signatureInfo.hasSignature ? '检测到签名参数' : '检测到时间戳参数' }}
                </template>
                <div style="margin-top: 8px">
                  <p v-if="signatureInfo.hasTimestamp">时间戳参数: {{ signatureInfo.timestampParams.join(', ') }}</p>
                  <p v-if="signatureInfo.hasSignature">签名参数: {{ signatureInfo.signatureParams.join(', ') }}</p>
                  <p v-if="signatureInfo.hasToken">Token参数: {{ signatureInfo.tokenParams.join(', ') }}</p>
                </div>
              </el-alert>
              <div style="margin-top: 16px">
                <h4>绕过建议：</h4>
                <ul class="suggestion-list">
                  <li>使用真实用户的时间戳生成签名</li>
                  <li>尝试清除签名参数直接访问</li>
                  <li>使用Selenium/Puppeteer模拟浏览器</li>
                  <li>分析JS生成签名的逻辑并复用</li>
                </ul>
              </div>
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="反爬检测" name="anticrawl">
            <el-card>
              <template #header>反爬机制检测</template>
              <el-row :gutter="20">
                <el-col :span="8">
                  <div class="detection-item">
                    <el-icon :size="32" :color="detections.ajax ? '#67C23A' : '#909399'">
                      <Document v-if="detections.ajax" />
                      <DocumentDelete v-else />
                    </el-icon>
                    <div class="detection-text">
                      <div class="detection-title">AJAX 请求</div>
                      <div class="detection-status">
                        {{ detections.ajax ? '是' : '否' }}
                      </div>
                    </div>
                  </div>
                </el-col>
                <el-col :span="8">
                  <div class="detection-item">
                    <el-icon :size="32" :color="detections.redirect ? '#E6A23C' : '#909399'">
                      <Promotion v-if="detections.redirect" />
                      <Close v-else />
                    </el-icon>
                    <div class="detection-text">
                      <div class="detection-title">重定向</div>
                      <div class="detection-status">
                        {{ detections.redirect ? '是' : '否' }}
                      </div>
                    </div>
                  </div>
                </el-col>
                <el-col :span="8">
                  <div class="detection-item">
                    <el-icon :size="32" :color="detections.captcha ? '#F56C6C' : '#909399'">
                      <Lock v-if="detections.captcha" />
                      <Unlock v-else />
                    </el-icon>
                    <div class="detection-text">
                      <div class="detection-title">验证码</div>
                      <div class="detection-status">
                        {{ detections.captcha ? '可能需要' : '暂无' }}
                      </div>
                    </div>
                  </div>
                </el-col>
              </el-row>
            </el-card>

            <el-card style="margin-top: 16px">
              <template #header>绕过建议</template>
              <el-alert type="info" :closable="false">
                <template #title>根据检测结果，推荐以下绕过策略：</template>
              </el-alert>
              <ul class="suggestion-list" style="margin-top: 16px">
                <li v-for="(suggestion, index) in suggestions" :key="index">
                  {{ suggestion }}
                </li>
              </ul>
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="技术分析" name="tech">
            <el-card>
              <template #header>网站技术栈</template>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="内容类型">
                  {{ analysisResult.contentType || '未知' }}
                </el-descriptions-item>
                <el-descriptions-item label="编码">
                  {{ analysisResult.encoding }}
                </el-descriptions-item>
                <el-descriptions-item label="重定向链">
                  {{ analysisResult.redirectChain.length }} 次
                </el-descriptions-item>
                <el-descriptions-item label="静态/动态">
                  <el-tag size="small" :type="isStaticPage ? 'success' : 'warning'">
                    {{ isStaticPage ? '静态页面' : '动态页面' }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </el-card>

            <el-card style="margin-top: 16px">
              <template #header>推荐爬取方案</template>
              <el-radio-group v-model="recommendedApproach">
                <el-radio label="fetch">直接Fetch请求</el-radio>
                <el-radio label="browser">浏览器渲染</el-radio>
                <el-radio label="selenium">Selenium自动化</el-radio>
                <el-radio label="puppeteer">Puppeteer无头浏览器</el-radio>
              </el-radio-group>
              <div style="margin-top: 16px">
                <h4>方案说明：</h4>
                <p class="approach-desc">{{ approachDescription }}</p>
              </div>
            </el-card>
          </el-tab-pane>

          <el-tab-pane label="历史记录" name="history">
            <el-card>
              <template #header>分析历史</template>
              <el-table :data="history" stripe size="small">
                <el-table-column prop="url" label="URL" min-width="300">
                  <template #default="{ row }">
                    <el-tooltip :content="row.url" placement="top">
                      <span class="url-text">{{ truncateUrl(row.url, 60) }}</span>
                    </el-tooltip>
                  </template>
                </el-table-column>
                <el-table-column prop="time" label="分析时间" width="180" />
                <el-table-column label="操作" width="100">
                  <template #default="{ row }">
                    <el-button type="primary" link size="small" @click="loadFromHistory(row)">
                      加载
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>

    <el-empty v-else description="请输入URL进行分析" style="margin-top: 40px" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Document, DocumentDelete, Promotion, Lock, Unlock, Close } from '@element-plus/icons-vue'
import {
  parseUrl,
  detectUrlSignature,
  detectAjax,
  detectCaptcha
} from '@/utils/urlParser'

const urlInput = ref('')
const urlProtocol = ref('https')
const analyzing = ref(false)
const autoAnalyze = ref(false)
const activeTab = ref('basic')
const analysisResult = ref<any>(null)
const history = ref<Array<{ url: string; time: string; result: any }>>([])

const detections = computed(() => {
  if (!analysisResult.value) {
    return { ajax: false, redirect: false, captcha: false }
  }
  return {
    ajax: analysisResult.value.isAjax,
    redirect: analysisResult.value.isRedirect,
    captcha: analysisResult.value.hasCaptcha || false
  }
})

const signatureInfo = computed(() => {
  if (!analysisResult.value) {
    return { hasSignature: false, hasTimestamp: false, hasToken: false, timestampParams: [], signatureParams: [], tokenParams: [] }
  }
  return analysisResult.value.signature || { hasSignature: false, hasTimestamp: false, hasToken: false, timestampParams: [], signatureParams: [], tokenParams: [] }
})

const queryParams = computed(() => {
  if (!analysisResult.value?.components?.query) return []
  return Object.entries(analysisResult.value.components.query).map(([key, value]) => ({
    key,
    value,
    isDynamic: /^(t|time|ts| timestamp|_| rnd|random|nonce)$/i.test(key),
    isSignature: /^(sign|sig|signature|token|hash|key)$/i.test(key)
  }))
})

const isStaticPage = computed(() => {
  if (!analysisResult.value) return true
  const path = analysisResult.value.components.path.toLowerCase()
  return !['.json', '.xml', '.ajax', '.api'].some(ext => path.endsWith(ext))
})

const recommendedApproach = ref('fetch')
const approachDescription = computed(() => {
  switch (recommendedApproach.value) {
    case 'fetch':
      return '使用原生Fetch API直接请求页面，速度快，资源占用低。适用于静态页面或API接口。'
    case 'browser':
      return '使用浏览器的JavaScript引擎渲染页面，可以处理动态内容。需要后端配合。'
    case 'selenium':
      return '使用Selenium WebDriver控制真实浏览器，功能全面但速度较慢，资源占用高。'
    case 'puppeteer':
      return '使用Puppeteer控制Chrome无头浏览器，速度较快，支持截图和PDF生成。'
    default:
      return ''
  }
})

const suggestions = computed(() => {
  const result: string[] = []
  if (detections.value.ajax) {
    result.push('检测到AJAX请求，建议使用浏览器渲染或分析API接口直接调用')
  }
  if (detections.value.redirect) {
    result.push('检测到重定向，需要跟踪重定向链获取最终内容')
  }
  if (detections.value.captcha) {
    result.push('可能需要验证码处理，建议使用打码平台或机器学习识别')
  }
  if (signatureInfo.value.hasSignature) {
    result.push('检测到签名参数，需要逆向JS或使用浏览器渲染获取')
  }
  if (signatureInfo.value.hasTimestamp) {
    result.push('检测到时间戳参数，确保请求使用最新时间戳')
  }
  if (!detections.value.ajax && isStaticPage.value) {
    result.push('静态页面，可以直接使用Fetch请求获取内容')
  }
  if (result.length === 0) {
    result.push('未检测到特殊反爬机制，可以使用常规方式爬取')
  }
  return result
})

function truncateUrl(url: string, maxLength: number): string {
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength) + '...'
}

async function handleAnalyze() {
  const fullUrl = urlProtocol.value + '://' + urlInput.value
  if (!urlInput.value) {
    ElMessage.warning('请输入URL')
    return
  }

  analyzing.value = true

  try {
    const parsed = parseUrl(fullUrl)
    const signature = detectUrlSignature(fullUrl)
    const isAjax = detectAjax(fullUrl)
    const hasCaptcha = detectCaptcha(fullUrl)

    analysisResult.value = {
      ...parsed,
      signature,
      isAjax,
      hasCaptcha
    }

    history.value.unshift({
      url: fullUrl,
      time: new Date().toLocaleString(),
      result: analysisResult.value
    })

    if (history.value.length > 20) {
      history.value = history.value.slice(0, 20)
    }

    ElMessage.success('分析完成')
  } catch (e) {
    ElMessage.error('URL解析失败: ' + String(e))
  } finally {
    analyzing.value = false
  }
}

function handleReset() {
  urlInput.value = ''
  analysisResult.value = null
  activeTab.value = 'basic'
}

function loadFromHistory(item: { url: string; result: any }) {
  urlInput.value = item.url.replace(/^https?:\/\//, '')
  urlProtocol.value = item.url.startsWith('https') ? 'https' : 'http'
  analysisResult.value = item.result
}

watch(urlInput, () => {
  if (autoAnalyze.value && urlInput.value.length > 10) {
    handleAnalyze()
  }
})
</script>

<style scoped>
.url-analyzer {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.url-text {
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}

.detection-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.detection-text {
  flex: 1;
}

.detection-title {
  font-weight: 500;
  font-size: 14px;
}

.detection-status {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.suggestion-list {
  padding-left: 20px;
  margin: 8px 0;
}

.suggestion-list li {
  margin: 8px 0;
  color: #606266;
  line-height: 1.6;
}

.approach-desc {
  color: #606266;
  line-height: 1.8;
  margin-top: 8px;
}
</style>
