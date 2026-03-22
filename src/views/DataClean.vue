<template>
  <div class="data-clean">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>数据清洗工具</span>
          <el-space>
            <el-button type="primary" @click="handleImportData">
              <el-icon><Upload /></el-icon>
              导入数据
            </el-button>
            <el-dropdown @command="handleQuickImport">
              <el-button type="success">
                <el-icon><Document /></el-icon>
                快速导入
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="txt">TXT 文本文件</el-dropdown-item>
                  <el-dropdown-item command="json">JSON 文件</el-dropdown-item>
                  <el-dropdown-item command="csv">CSV 表格文件</el-dropdown-item>
                  <el-dropdown-item command="xlsx">Excel 文件</el-dropdown-item>
                  <el-dropdown-item command="xml">XML 文件</el-dropdown-item>
                  <el-dropdown-item command="html">HTML 文件</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-space>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="数据转换" name="transform">
          <div class="transform-panel">
            <el-row :gutter="20">
              <el-col :span="11">
                <el-card header="原始数据">
                  <div class="data-header">
                    <span class="data-info" v-if="rawData.length > 0">
                      共 {{ rawData.length }} 条记录
                    </span>
                    <el-tag v-if="dataSource" size="small" type="info">{{ dataSource }}</el-tag>
                  </div>
                  <el-input
                    v-model="rawDataText"
                    type="textarea"
                    :rows="12"
                    placeholder="粘贴原始数据，每行一条记录，或使用 JSON 数组格式"
                    @change="parseInputData"
                  />
                  <div class="data-actions">
                    <el-button size="small" @click="rawDataText = ''; rawData = []" link>清空</el-button>
                    <el-button size="small" @click="loadSampleData" link>加载示例</el-button>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="2" class="arrow-col">
                <el-icon class="arrow-icon"><Right /></el-icon>
              </el-col>
              <el-col :span="11">
                <el-card header="清洗结果">
                  <div class="data-header">
                    <span class="data-info" v-if="cleanedData.length > 0">
                      {{ cleanedData.length }} 条记录已处理
                    </span>
                    <el-tag v-if="cleanedData.length > 0" size="small" type="success">就绪</el-tag>
                  </div>
                  <el-input
                    v-model="cleanedDataText"
                    type="textarea"
                    :rows="12"
                    readonly
                    placeholder="清洗后的数据将显示在这里"
                  />
                  <div class="data-actions">
                    <el-button size="small" @click="copyResult" :disabled="!cleanedData.length" link>复制结果</el-button>
                    <el-button size="small" @click="downloadResult" :disabled="!cleanedData.length" link>下载</el-button>
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <el-card class="operations-card" header="转换操作">
              <el-space wrap class="operation-buttons">
                <el-button-group>
                  <el-button @click="doTrimWhitespace" :disabled="!hasData">去除空白</el-button>
                  <el-button @click="doRemoveHtmlTags" :disabled="!hasData">移除HTML</el-button>
                  <el-button @click="doRemoveEmoji" :disabled="!hasData">去Emoji</el-button>
                </el-button-group>
                <el-button-group>
                  <el-button @click="doExtractNumbers" :disabled="!hasData">提取数字</el-button>
                  <el-button @click="doExtractChinese" :disabled="!hasData">提取中文</el-button>
                  <el-button @click="doExtractEnglish" :disabled="!hasData">提取英文</el-button>
                </el-button-group>
                <el-button-group>
                  <el-button @click="doNormalizeLineBreaks" :disabled="!hasData">规范化换行</el-button>
                  <el-button @click="doRemoveUrls" :disabled="!hasData">去除链接</el-button>
                  <el-button @click="doRemoveEmails" :disabled="!hasData">去除邮箱</el-button>
                </el-button-group>
                <el-button-group>
                  <el-button @click="doRemoveDuplicates" :disabled="!hasData">去重</el-button>
                  <el-button @click="doSortData" :disabled="!hasData">排序</el-button>
                  <el-button @click="doFilterEmpty" :disabled="!hasData">过滤空行</el-button>
                </el-button-group>
              </el-space>

              <el-divider />

              <el-form inline class="advanced-form">
                <el-form-item label="正则替换">
                  <el-input v-model="regexPattern" placeholder="正则表达式 (如: \\d+)" style="width: 220px" />
                </el-form-item>
                <el-form-item label="替换为">
                  <el-input v-model="regexReplacement" placeholder="替换文本 (可留空)" style="width: 150px" />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="doApplyRegexReplace" :disabled="!hasData">应用替换</el-button>
                  <el-button @click="testRegex" :disabled="!hasData">测试</el-button>
                </el-form-item>
                <el-form-item label="大小写">
                  <el-select v-model="caseType" style="width: 130px">
                    <el-option label="不变" value="none" />
                    <el-option label="全部大写" value="upper" />
                    <el-option label="全部小写" value="lower" />
                    <el-option label="首字母大写" value="title" />
                    <el-option label="驼峰命名" value="camel" />
                    <el-option label="下划线命名" value="snake" />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="doApplyCaseConvert" :disabled="!hasData">转换</el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </div>
        </el-tab-pane>

        <el-tab-pane label="格式转换" name="format">
          <div class="format-panel">
            <el-form inline class="format-selector">
              <el-form-item label="源格式">
                <el-select v-model="sourceFormat" style="width: 120px">
                  <el-option label="自动检测" value="auto" />
                  <el-option label="JSON" value="json" />
                  <el-option label="CSV" value="csv" />
                  <el-option label="TSV" value="tsv" />
                  <el-option label="XML" value="xml" />
                  <el-option label="HTML" value="html" />
                  <el-option label="纯文本" value="text" />
                </el-select>
              </el-form-item>
              <el-form-item label="目标格式">
                <el-select v-model="targetFormat" style="width: 140px">
                  <el-option label="JSON" value="json" />
                  <el-option label="CSV" value="csv" />
                  <el-option label="TSV" value="tsv" />
                  <el-option label="Markdown" value="md" />
                  <el-option label="HTML表格" value="html" />
                  <el-option label="XML" value="xml" />
                  <el-option label="纯文本" value="text" />
                  <el-option label="SQL INSERT" value="sql" />
                </el-select>
              </el-form-item>
              <el-form-item label="表格名称" v-if="targetFormat === 'sql'">
                <el-input v-model="sqlTableName" placeholder="表名" style="width: 120px" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="doConvertFormat" :disabled="!formatInput">转换</el-button>
                <el-button @click="swapFormat" link>⇄</el-button>
              </el-form-item>
            </el-form>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-card header="输入">
                  <el-input
                    v-model="formatInput"
                    type="textarea"
                    :rows="12"
                    placeholder="输入要转换的数据，或拖拽文件到此处"
                    @drop.prevent="handleFileDrop"
                  />
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card header="输出">
                  <el-input
                    v-model="formatOutput"
                    type="textarea"
                    :rows="12"
                    readonly
                  />
                  <div class="output-actions" v-if="formatOutput">
                    <el-button size="small" @click="copyOutput" link>复制</el-button>
                    <el-button size="small" @click="downloadOutput" link>下载为 {{ targetFormat.toUpperCase() }}</el-button>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <el-tab-pane label="文本分析" name="nlp">
          <div class="nlp-panel">
            <el-input
              v-model="nlpInput"
              type="textarea"
              :rows="6"
              placeholder="输入要分析的文本内容..."
            />
            <el-card class="analysis-options" header="分析选项">
              <el-checkbox-group v-model="selectedAnalyses">
                <el-checkbox label="statistics">统计信息</el-checkbox>
                <el-checkbox label="keywords">关键词</el-checkbox>
                <el-checkbox label="entities">实体识别</el-checkbox>
                <el-checkbox label="sentiment">情感分析</el-checkbox>
                <el-checkbox label="language">语言检测</el-checkbox>
                <el-checkbox label="summary">摘要</el-checkbox>
              </el-checkbox-group>
            </el-card>
            <el-button type="primary" @click="doAnalyzeText" :loading="analyzing" :disabled="!nlpInput.trim()">
              <el-icon><Search /></el-icon>
              开始分析
            </el-button>

            <el-divider />

            <div v-if="nlpResult" class="analysis-results">
              <el-row :gutter="20">
                <el-col :span="8" v-if="nlpResult.statistics && selectedAnalyses.includes('statistics')">
                  <el-card header="统计信息">
                    <el-descriptions :column="1" border size="small">
                      <el-descriptions-item label="字符数">{{ nlpResult.statistics.chars }}</el-descriptions-item>
                      <el-descriptions-item label="字数">{{ nlpResult.statistics.words }}</el-descriptions-item>
                      <el-descriptions-item label="句子数">{{ nlpResult.statistics.sentences }}</el-descriptions-item>
                      <el-descriptions-item label="段落数">{{ nlpResult.statistics.paragraphs }}</el-descriptions-item>
                    </el-descriptions>
                  </el-card>
                </el-col>
                <el-col :span="8" v-if="nlpResult.keywords && selectedAnalyses.includes('keywords')">
                  <el-card header="关键词 TOP 10">
                    <el-tag v-for="(kw, idx) in nlpResult.keywords.slice(0, 10)" :key="idx" style="margin: 4px" :type="idx < 3 ? 'primary' : 'info'">
                      {{ kw.word }} ({{ kw.count }})
                    </el-tag>
                  </el-card>
                </el-col>
                <el-col :span="8" v-if="nlpResult.sentiment && selectedAnalyses.includes('sentiment')">
                  <el-card header="情感分析">
                    <div class="sentiment-display">
                      <el-tag :type="nlpResult.sentiment.label === 'positive' ? 'success' : nlpResult.sentiment.label === 'negative' ? 'danger' : 'info'" size="large">
                        {{ nlpResult.sentiment.label === 'positive' ? '😊 积极' : nlpResult.sentiment.label === 'negative' ? '😞 消极' : '😐 中性' }}
                      </el-tag>
                      <el-progress :percentage="Math.abs(nlpResult.sentiment.score * 100)" :color="nlpResult.sentiment.label === 'positive' ? '#67C23A' : nlpResult.sentiment.label === 'negative' ? '#F56C6C' : '#909399'" style="margin-top: 10px" />
                    </div>
                  </el-card>
                </el-col>
              </el-row>

              <el-row :gutter="20" style="margin-top: 20px" v-if="selectedAnalyses.includes('entities')">
                <el-col :span="24" v-if="nlpResult.entities && nlpResult.entities.length">
                  <el-card header="识别的实体">
                    <el-tag v-for="entity in nlpResult.entities" :key="entity.text + entity.start" :type="getEntityType(entity.type)" style="margin: 4px">
                      {{ entity.text }} → {{ entity.type }}
                    </el-tag>
                    <el-empty v-if="!nlpResult.entities.length" description="未识别到实体" :image-size="60" />
                  </el-card>
                </el-col>
              </el-row>

              <el-row :gutter="20" style="margin-top: 20px" v-if="selectedAnalyses.includes('language')">
                <el-col :span="8">
                  <el-card header="语言检测">
                    <el-tag type="success" size="large">{{ nlpResult.language }}</el-tag>
                  </el-card>
                </el-col>
              </el-row>

              <el-row :gutter="20" style="margin-top: 20px" v-if="selectedAnalyses.includes('summary') && nlpResult.summary">
                <el-col :span="24">
                  <el-card header="文本摘要">
                    <p class="summary-text">{{ nlpResult.summary }}</p>
                  </el-card>
                </el-col>
              </el-row>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="正则工具" name="regex">
          <div class="regex-panel">
            <el-form class="regex-form">
              <el-form-item label="正则表达式">
                <el-input v-model="testRegexPattern" placeholder="输入正则表达式，如: \\d+ 或 [a-z]+" style="width: 500px" />
              </el-form-item>
              <el-form-item label="匹配组">
                <el-input-number v-model="matchGroup" :min="0" :max="10" />
              </el-form-item>
              <el-form-item label="标志">
                <el-checkbox-group v-model="regexFlags">
                  <el-checkbox label="g">全局</el-checkbox>
                  <el-checkbox label="i">忽略大小写</el-checkbox>
                  <el-checkbox label="m">多行</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="doTestRegex" :disabled="!testRegexPattern || !testRegexText">测试</el-button>
                <el-button @click="clearRegexResult">清空</el-button>
              </el-form-item>
            </el-form>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-card header="测试文本">
                  <el-input
                    v-model="testRegexText"
                    type="textarea"
                    :rows="8"
                    placeholder="输入测试文本"
                  />
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card header="匹配结果">
                  <div v-if="regexMatches.length" class="match-results">
                    <div class="match-summary">
                      匹配到 <strong>{{ regexMatches.length }}</strong> 个结果
                    </div>
                    <el-tag v-for="(match, idx) in regexMatches.slice(0, 50)" :key="idx" style="margin: 4px">
                      匹配 {{ idx + 1 }}: {{ match }}
                    </el-tag>
                    <div v-if="regexMatches.length > 50" class="more-matches">
                      还有 {{ regexMatches.length - 50 }} 个结果...
                    </div>
                  </div>
                  <el-empty v-else description="暂无匹配结果" :image-size="60" />
                </el-card>
              </el-col>
            </el-row>

            <el-card class="regex-help" header="常用正则表达式">
              <el-space wrap>
                <el-tag v-for="(pattern, name) in commonRegexPatterns" :key="name" class="regex-pattern-tag" @click="applyRegexPattern(pattern)">
                  {{ name }}: {{ pattern }}
                </el-tag>
              </el-space>
            </el-card>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Document, Right, Search } from '@element-plus/icons-vue'
import {
  trimWhitespace, removeHtmlTags, normalizeLineBreaks, removeEmoji,
  extractNumbers, extractChinese, extractEnglish, convertCase,
  extractByRegex, removeUrls, removeEmails
} from '@/utils/dataClean'
import {
  extractEntities, extractKeywords,
  summarizeText, sentimentAnalysis, detectLanguage
} from '@/utils/nlp'
import * as XLSX from 'xlsx'

const activeTab = ref('transform')
const rawDataText = ref('')
const rawData = ref<string[]>([])
const cleanedData = ref<string[]>([])
const cleanedDataText = ref('')
const dataSource = ref('')
const hasData = computed(() => rawData.value.length > 0)

const regexPattern = ref('')
const regexReplacement = ref('')
const caseType = ref<'none' | 'upper' | 'lower' | 'title' | 'camel' | 'snake'>('none')

const sourceFormat = ref('auto')
const targetFormat = ref('csv')
const formatInput = ref('')
const formatOutput = ref('')
const sqlTableName = ref('mytable')

const nlpInput = ref('')
const analyzing = ref(false)
const nlpResult = ref<any>(null)
const selectedAnalyses = ref(['statistics', 'keywords', 'entities', 'sentiment'])

const testRegexPattern = ref('')
const testRegexText = ref('')
const matchGroup = ref(0)
const regexFlags = ref(['g'])
const regexMatches = ref<string[]>([])

const commonRegexPatterns: Record<string, string> = {
  '手机号': '1[3-9]\\d{9}',
  '邮箱': '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
  'URL': 'https?://[^\\s]+',
  'IP地址': '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}',
  '日期': '\\d{4}[-/年]\\d{1,2}[-/月]\\d{1,2}日?',
  '时间': '\\d{1,2}:\\d{2}(?::\\d{2})?',
  '金额': '¥?\\d+(?:,\\d{3})*(?:\\.\\d{2})?',
  '身份证': '\\d{15}|\\d{18}',
  '中文': '[\\u4e00-\\u9fa5]+',
  '英文': '[a-zA-Z]+',
  '数字': '\\d+',
  'HTML标签': '<[^>]+>'
}

function parseInputData() {
  const text = rawDataText.value.trim()
  if (!text) {
    rawData.value = []
    return
  }

  try {
    if (text.startsWith('[') || text.startsWith('{')) {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        rawData.value = parsed.map(item => typeof item === 'string' ? item : JSON.stringify(item))
      } else {
        rawData.value = [JSON.stringify(parsed)]
      }
    } else {
      rawData.value = text.split('\n').filter(l => l.trim())
    }
    dataSource.value = '文本输入'
  } catch {
    rawData.value = text.split('\n').filter(l => l.trim())
    dataSource.value = '文本输入'
  }
}

function handleQuickImport(type: string) {
  const input = document.createElement('input')
  input.type = 'file'

  const acceptMap: Record<string, string> = {
    txt: '.txt',
    json: '.json',
    csv: '.csv,.tsv',
    xlsx: '.xlsx,.xls',
    xml: '.xml',
    html: '.html,.htm'
  }

  input.accept = acceptMap[type] || '.txt'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      try {
        const ext = file.name.split('.').pop()?.toLowerCase()

        if (ext === 'xlsx' || ext === 'xls') {
          const arrayBuffer = await file.arrayBuffer()
          const workbook = XLSX.read(arrayBuffer, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[]

          if (jsonData.length > 0) {
            rawData.value = jsonData.slice(1).map(row => {
              if (typeof row === 'object') {
                return JSON.stringify(row)
              }
              return String(row)
            })
            rawDataText.value = rawData.value.join('\n')
          }
          dataSource.value = `Excel: ${file.name}`
        } else {
          const text = await file.text()
          rawDataText.value = text
          parseInputData()
          dataSource.value = `文件: ${file.name}`
        }

        ElMessage.success(`成功导入 ${rawData.value.length} 条数据`)
      } catch (e) {
        ElMessage.error('文件导入失败: ' + String(e))
      }
    }
  }
  input.click()
}

function handleImportData() {
  handleQuickImport('txt')
}

function handleFileDrop(e: DragEvent) {
  const file = e.dataTransfer?.files[0]
  if (file) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'xlsx' || ext === 'xls') {
      handleQuickImport('xlsx')
    } else {
      handleQuickImport(ext || 'txt')
    }
  }
}

function loadSampleData() {
  rawDataText.value = `这是第一行文本，包含一些数字 12345
第二行文本，包含中文和English混合
第三行，带有HTML标签<div>test</div>
第四行，有一个邮箱 test@example.com
第五行，包含URL https://www.example.com
第六行，纯数字 9876543210
第七行，特殊字符 @#$%^&*()
第八行，混合内容 2024年1月15日 星期一
第九行，更多内容 联系电话: 13812345678
第十行，最后一行数据`
  parseInputData()
  dataSource.value = '示例数据'
  ElMessage.info('已加载示例数据')
}

function copyResult() {
  if (cleanedData.value.length) {
    navigator.clipboard.writeText(cleanedDataText.value)
    ElMessage.success('已复制到剪贴板')
  }
}

function downloadResult() {
  const content = cleanedDataText.value
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cleaned_data_${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('下载成功')
}

function applyOperation(fn: (text: string) => string) {
  rawData.value = rawData.value.map(fn)
  cleanedData.value = [...rawData.value]
  cleanedDataText.value = cleanedData.value.join('\n')
}

function doTrimWhitespace() { applyOperation(trimWhitespace) }
function doRemoveHtmlTags() { applyOperation(removeHtmlTags) }
function doRemoveEmoji() { applyOperation(removeEmoji) }
function doExtractNumbers() { applyOperation(extractNumbers) }
function doExtractChinese() { applyOperation(extractChinese) }
function doExtractEnglish() { applyOperation(extractEnglish) }
function doNormalizeLineBreaks() { applyOperation(normalizeLineBreaks) }
function doRemoveUrls() { applyOperation(removeUrls) }
function doRemoveEmails() { applyOperation(removeEmails) }

function doRemoveDuplicates() {
  rawData.value = [...new Set(rawData.value)]
  cleanedData.value = [...rawData.value]
  cleanedDataText.value = cleanedData.value.join('\n')
  ElMessage.success(`去重完成，剩余 ${rawData.value.length} 条`)
}

function doSortData() {
  rawData.value.sort()
  cleanedData.value = [...rawData.value]
  cleanedDataText.value = cleanedData.value.join('\n')
  ElMessage.success('排序完成')
}

function doFilterEmpty() {
  rawData.value = rawData.value.filter(l => l.trim())
  cleanedData.value = [...rawData.value]
  cleanedDataText.value = cleanedData.value.join('\n')
  ElMessage.success(`过滤完成，剩余 ${rawData.value.length} 条`)
}

function doApplyRegexReplace() {
  if (!regexPattern.value) {
    ElMessage.warning('请输入正则表达式')
    return
  }
  try {
    const regex = new RegExp(regexPattern.value, 'g')
    applyOperation((text: string) => text.replace(regex, regexReplacement.value))
    ElMessage.success('替换完成')
  } catch (e) {
    ElMessage.error('正则表达式无效: ' + String(e))
  }
}

function testRegex() {
  if (!regexPattern.value || !testRegexText.value) {
    ElMessage.warning('请输入正则表达式和测试文本')
    return
  }
  doTestRegex()
}

function doApplyCaseConvert() {
  if (caseType.value === 'none') return
  applyOperation((text: string) => convertCase(text, caseType.value))
}

function swapFormat() {
  const temp = sourceFormat.value
  sourceFormat.value = targetFormat.value
  targetFormat.value = temp
  formatInput.value = formatOutput.value
  formatOutput.value = ''
}

function doConvertFormat() {
  try {
    let data: any[]

    if (sourceFormat.value === 'auto') {
      const firstLine = formatInput.value.split('\n')[0].trim()
      if (firstLine.startsWith('[') || firstLine.startsWith('{')) {
        sourceFormat.value = 'json'
      } else if (firstLine.includes('\t')) {
        sourceFormat.value = 'tsv'
      } else if (firstLine.includes(',')) {
        sourceFormat.value = 'csv'
      } else if (firstLine.startsWith('<')) {
        sourceFormat.value = 'html'
      } else {
        sourceFormat.value = 'text'
      }
    }

    if (sourceFormat.value === 'json') {
      data = JSON.parse(formatInput.value)
      if (!Array.isArray(data)) data = [data]
    } else if (sourceFormat.value === 'csv' || sourceFormat.value === 'tsv') {
      const delimiter = sourceFormat.value === 'csv' ? ',' : '\t'
      const lines = formatInput.value.split('\n').filter(l => l.trim())
      if (lines.length === 0) {
        formatOutput.value = ''
        return
      }
      const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''))
      data = lines.slice(1).map(line => {
        const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''))
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => { obj[h] = values[i] || '' })
        return obj
      })
    } else if (sourceFormat.value === 'xml') {
      const parser = new DOMParser()
      const xml = parser.parseFromString(formatInput.value, 'text/xml')
      const items = xml.querySelectorAll('item')
      data = Array.from(items).map(item => {
        const obj: Record<string, string> = {}
        item.childNodes.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            obj[(child as Element).tagName] = child.textContent || ''
          }
        })
        return obj
      })
    } else if (sourceFormat.value === 'html') {
      const parser = new DOMParser()
      const doc = parser.parseFromString(formatInput.value, 'text/html')
      const rows = doc.querySelectorAll('table tr')
      if (rows.length > 0) {
        const headers = Array.from(rows[0].querySelectorAll('th')).map(h => h.textContent?.trim() || '')
        data = Array.from(rows).slice(1).map(row => {
          const obj: Record<string, string> = {}
          row.querySelectorAll('td').forEach((td, i) => {
            obj[headers[i] || `col${i}`] = td.textContent?.trim() || ''
          })
          return obj
        })
      } else {
        data = []
      }
    } else {
      data = formatInput.value.split('\n').filter(l => l.trim())
    }

    if (targetFormat.value === 'json') {
      formatOutput.value = JSON.stringify(data, null, 2)
    } else if (targetFormat.value === 'csv') {
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        const headers = Object.keys(data[0])
        const lines = [headers.join(',')]
        data.forEach(row => {
          lines.push(headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
        })
        formatOutput.value = lines.join('\n')
      } else {
        formatOutput.value = data.join('\n')
      }
    } else if (targetFormat.value === 'tsv') {
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        const headers = Object.keys(data[0])
        const lines = [headers.join('\t')]
        data.forEach(row => {
          lines.push(headers.map(h => String(row[h] || '')).join('\t'))
        })
        formatOutput.value = lines.join('\n')
      } else {
        formatOutput.value = data.join('\n')
      }
    } else if (targetFormat.value === 'md') {
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        const headers = Object.keys(data[0])
        let md = `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n`
        data.forEach(row => {
          md += `| ${headers.map(h => String(row[h] || '')).join(' | ')} |\n`
        })
        formatOutput.value = md
      } else {
        formatOutput.value = data.map(d => `- ${d}`).join('\n')
      }
    } else if (targetFormat.value === 'html') {
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        const headers = Object.keys(data[0])
        let html = '<table>\n<thead>\n<tr>'
        headers.forEach(h => { html += `<th>${h}</th>` })
        html += '</tr>\n</thead>\n<tbody>\n'
        data.forEach(row => {
          html += '<tr>'
          headers.forEach(h => { html += `<td>${String(row[h] || '')}</td>` })
          html += '</tr>\n'
        })
        html += '</tbody>\n</table>'
        formatOutput.value = html
      } else {
        formatOutput.value = '<ul>\n' + data.map(d => `<li>${d}</li>`).join('\n') + '\n</ul>'
      }
    } else if (targetFormat.value === 'xml') {
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<items>\n'
        data.forEach(() => {
          xml += '  <item>\n'
          Object.entries(data[0]).forEach(([k, v]) => {
            xml += `    <${k}>${String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</${k}>\n`
          })
          xml += '  </item>\n'
        })
        xml += '</items>'
        formatOutput.value = xml
      } else {
        formatOutput.value = '<?xml version="1.0" encoding="UTF-8"?>\n<items>\n' +
          data.map(d => `  <item>${d}</item>`).join('\n') + '\n</items>'
      }
    } else if (targetFormat.value === 'sql') {
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        const headers = Object.keys(data[0])
        const tableName = sqlTableName.value || 'mytable'
        let sql = headers.map(h => `\`${h}\``).join(', ') + '\n'
        data.forEach(row => {
          const values = headers.map(h => {
            const v = row[h]
            if (v === null || v === undefined) return 'NULL'
            if (typeof v === 'number') return String(v)
            return `'${String(v).replace(/'/g, "''")}'`
          }).join(', ')
          sql += `INSERT INTO \`${tableName}\` (${headers.map(h => `\`${h}\``).join(', ')}) VALUES (${values});\n`
        })
        formatOutput.value = sql
      } else {
        formatOutput.value = data.map(d => `INSERT INTO \`${sqlTableName.value}\` (value) VALUES ('${String(d).replace(/'/g, "''")}');`).join('\n')
      }
    } else {
      formatOutput.value = Array.isArray(data) ? data.join('\n') : String(data)
    }

    ElMessage.success('格式转换成功')
  } catch (e) {
    ElMessage.error('转换失败: ' + String(e))
  }
}

function copyOutput() {
  navigator.clipboard.writeText(formatOutput.value)
  ElMessage.success('已复制到剪贴板')
}

function downloadOutput() {
  const ext = targetFormat.value === 'html' ? 'html' : targetFormat.value === 'xml' ? 'xml' : 'txt'
  const mimeType = targetFormat.value === 'json' ? 'application/json' :
                   targetFormat.value === 'html' ? 'text/html' :
                   targetFormat.value === 'xml' ? 'application/xml' :
                   'text/plain'

  const blob = new Blob([formatOutput.value], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `converted_data.${ext}`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('下载成功')
}

async function doAnalyzeText() {
  if (!nlpInput.value.trim()) {
    ElMessage.warning('请输入要分析的文本')
    return
  }

  analyzing.value = true
  nlpResult.value = null

  try {
    const result: any = {}

    if (selectedAnalyses.value.includes('statistics')) {
      const chars = nlpInput.value.length
      const words = nlpInput.value.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g)?.length || 0
      const sentences = nlpInput.value.split(/[.!?。！？]+/).filter(s => s.trim()).length
      const paragraphs = nlpInput.value.split(/\n\s*\n/).filter(p => p.trim()).length
      result.statistics = { chars, words, sentences, paragraphs }
    }

    if (selectedAnalyses.value.includes('keywords')) {
      const keywords = extractKeywords(nlpInput.value, 20)
      const wordCount: Record<string, number> = {}
      keywords.forEach((word: string) => {
        const match = nlpInput.value.match(new RegExp(word, 'g'))
        wordCount[word] = match ? match.length : 0
      })
      result.keywords = Object.entries(wordCount)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]: [string, number]) => ({ word, count }))
    }

    if (selectedAnalyses.value.includes('entities')) {
      result.entities = extractEntities(nlpInput.value)
    }

    if (selectedAnalyses.value.includes('sentiment')) {
      result.sentiment = sentimentAnalysis(nlpInput.value)
    }

    if (selectedAnalyses.value.includes('language')) {
      const lang = detectLanguage(nlpInput.value)
      result.language = lang === 'zh' ? '中文' : lang === 'en' ? '英文' : '中英混合'
    }

    if (selectedAnalyses.value.includes('summary')) {
      const summary = summarizeText(nlpInput.value, 3)
      result.summary = summary.sentences?.join('。') || nlpInput.value.slice(0, 200) + '...'
    }

    nlpResult.value = result
    ElMessage.success('分析完成')
  } catch (e) {
    ElMessage.error('分析失败: ' + String(e))
  } finally {
    analyzing.value = false
  }
}

function doTestRegex() {
  if (!testRegexPattern.value || !testRegexText.value) {
    ElMessage.warning('请输入正则表达式和测试文本')
    return
  }

  try {
    const flagStr = regexFlags.value.join('')
    new RegExp(testRegexPattern.value, flagStr)
    const matches = extractByRegex(testRegexText.value, testRegexPattern.value, matchGroup.value)
    regexMatches.value = matches

    if (matches.length === 0) {
      ElMessage.info('没有匹配到任何结果')
    } else {
      ElMessage.success(`匹配到 ${matches.length} 个结果`)
    }
  } catch (e) {
    ElMessage.error('正则表达式无效: ' + String(e))
  }
}

function clearRegexResult() {
  testRegexPattern.value = ''
  testRegexText.value = ''
  regexMatches.value = []
}

function applyRegexPattern(pattern: string) {
  testRegexPattern.value = pattern
}

function getEntityType(type: string): string {
  const typeMap: Record<string, string> = {
    person: 'primary',
    place: 'success',
    organization: 'warning',
    date: 'info',
    money: 'danger',
    phone: 'warning',
    email: 'info',
    url: 'success'
  }
  return typeMap[type] || 'info'
}
</script>

<style scoped>
.data-clean {
  max-width: 1600px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.data-info {
  color: #909399;
  font-size: 12px;
}

.data-actions,
.output-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.transform-panel,
.format-panel,
.nlp-panel,
.regex-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.operations-card {
  margin-top: 16px;
}

.operation-buttons {
  flex-wrap: wrap;
}

.advanced-form {
  flex-wrap: wrap;
}

.arrow-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow-icon {
  font-size: 24px;
  color: #67C23A;
}

.format-selector {
  margin-bottom: 16px;
}

.analysis-options {
  margin: 16px 0;
}

.analysis-results {
  margin-top: 16px;
}

.sentiment-display {
  text-align: center;
  padding: 10px;
}

.regex-form {
  margin-bottom: 16px;
}

.match-results {
  max-height: 300px;
  overflow-y: auto;
}

.match-summary {
  margin-bottom: 10px;
  color: #67C23A;
}

.more-matches {
  margin-top: 10px;
  color: #909399;
  font-size: 12px;
}

.regex-pattern-tag {
  cursor: pointer;
  margin: 4px;
}

.regex-help {
  margin-top: 16px;
}

.summary-text {
  line-height: 1.8;
  color: #303133;
}
</style>
