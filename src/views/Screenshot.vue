<template>
  <div class="screenshot-tool">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>截图工具</span>
          <el-space>
            <el-button type="primary" @click="captureViewport" :loading="capturing">
              <el-icon><Monitor /></el-icon>
              截图视口
            </el-button>
            <el-button type="success" @click="captureFullPage" :loading="capturing">
              <el-icon><FullScreen /></el-icon>
              截图全页
            </el-button>
            <el-button type="warning" @click="startRegionSelection">
              <el-icon><Crop /></el-icon>
              区域截图
            </el-button>
          </el-space>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="基础截图" name="basic">
          <div class="screenshot-preview" v-if="previewUrl">
            <el-image :src="previewUrl" fit="contain" style="max-width: 100%; max-height: 500px" />
          </div>
          <el-empty v-else description="暂无截图，点击上方按钮开始截图" :image-size="100" />

          <el-divider v-if="previewUrl" />

          <el-form v-if="previewUrl" inline class="screenshot-actions">
            <el-form-item label="文件格式">
              <el-select v-model="exportFormat" style="width: 100px">
                <el-option label="PNG" value="png" />
                <el-option label="JPEG" value="jpeg" />
                <el-option label="WebP" value="webp" />
              </el-select>
            </el-form-item>
            <el-form-item label="文件名">
              <el-input v-model="fileName" style="width: 200px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="downloadCurrent">
                <el-icon><Download /></el-icon>
                下载
              </el-button>
              <el-button @click="copyToClipboard">
                <el-icon><CopyDocument /></el-icon>
                复制
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="高级截图" name="advanced">
          <el-card header="截图设置" style="margin-bottom: 16px">
            <el-form label-width="120px">
              <el-form-item label="截图类型">
                <el-radio-group v-model="captureType">
                  <el-radio label="viewport">当前视口</el-radio>
                  <el-radio label="fullpage">整页截图</el-radio>
                  <el-radio label="region">区域截图</el-radio>
                  <el-radio label="element">元素截图</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="元素选择器" v-if="captureType === 'element'">
                <el-input v-model="elementSelector" placeholder="如: #content, .main, div[data-id]" style="width: 300px" />
                <el-button @click="previewElement" style="margin-left: 10px">预览</el-button>
              </el-form-item>

              <el-form-item label="背景颜色">
                <el-color-picker v-model="backgroundColor" />
              </el-form-item>

              <el-form-item label="截图质量">
                <el-slider v-model="quality" :min="0.1" :max="1" :step="0.1" style="width: 200px" />
                <span style="margin-left: 10px">{{ Math.round(quality * 100) }}%</span>
              </el-form-item>

              <el-form-item label="缩放比例">
                <el-input-number v-model="scale" :min="1" :max="4" :step="0.5" />
              </el-form-item>
            </el-form>
          </el-card>

          <el-button type="primary" size="large" @click="doAdvancedCapture" :loading="capturing">
            <el-icon><Camera /></el-icon>
            开始截图
          </el-button>

          <div v-if="advancedPreviewUrl" style="margin-top: 20px">
            <el-card header="预览效果">
              <el-image :src="advancedPreviewUrl" fit="contain" style="max-width: 100%; max-height: 400px" />
              <div style="margin-top: 16px; text-align: center">
                <el-button type="success" @click="downloadAdvanced">
                  <el-icon><Download /></el-icon>
                  下载此截图
                </el-button>
              </div>
            </el-card>
          </div>
        </el-tab-pane>

        <el-tab-pane label="元素检测" name="inspect">
          <el-alert type="info" :closable="false" style="margin-bottom: 16px">
            点击"开始检测"按钮后，鼠标悬停在页面上时会高亮显示元素信息。
            按 ESC 键退出检测模式。
          </el-alert>

          <el-button type="primary" @click="startElementInspect" :disabled="isInspecting">
            <el-icon><Search /></el-icon>
            开始检测
          </el-button>
          <el-button @click="stopElementInspect" :disabled="!isInspecting">
            <el-icon><Close /></el-icon>
            退出检测
          </el-button>

          <el-card v-if="inspectedElement" style="margin-top: 20px" header="当前元素信息">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="标签名">{{ inspectedElement.tagName }}</el-descriptions-item>
              <el-descriptions-item label="类名">{{ inspectedElement.className || '无' }}</el-descriptions-item>
              <el-descriptions-item label="ID">{{ inspectedElement.id || '无' }}</el-descriptions-item>
              <el-descriptions-item label="文本内容">{{ inspectedElement.textContent?.slice(0, 50) || '无' }}</el-descriptions-item>
              <el-descriptions-item label="CSS选择器" :span="2">
                <code>{{ inspectedElement.cssSelector }}</code>
                <el-button size="small" @click="copySelector(inspectedElement.cssSelector)" style="margin-left: 10px">复制</el-button>
              </el-descriptions-item>
              <el-descriptions-item label="XPath" :span="2">
                <code>{{ inspectedElement.xpath }}</code>
                <el-button size="small" @click="copySelector(inspectedElement.xpath)" style="margin-left: 10px">复制</el-button>
              </el-descriptions-item>
            </el-descriptions>

            <el-button type="primary" @click="screenshotInspectedElement" style="margin-top: 16px">
              <el-icon><Camera /></el-icon>
              截取此元素
            </el-button>
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="历史记录" name="history">
          <el-empty v-if="!screenshotHistory.length" description="暂无截图历史" :image-size="80" />
          <el-row v-else :gutter="20">
            <el-col :span="6" v-for="(item, idx) in screenshotHistory" :key="idx">
              <el-card :body-style="{ padding: '10px' }" shadow="hover">
                <el-image :src="item.url" fit="cover" style="width: 100%; height: 120px" />
                <div style="margin-top: 8px; font-size: 12px; color: #909399">
                  <div>{{ item.name }}</div>
                  <div>{{ item.time }}</div>
                </div>
                <div style="margin-top: 8px">
                  <el-button size="small" @click="downloadHistoryItem(item)">下载</el-button>
                  <el-button size="small" type="danger" @click="deleteHistoryItem(idx)">删除</el-button>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Monitor, FullScreen, Crop, Download, CopyDocument, Camera, Search, Close } from '@element-plus/icons-vue'
import {
  captureScreenshot,
  captureFullPage as captureFullPageApi,
  captureElement,
  createRegionSelector,
  captureRegion as captureRegionApi
} from '@/utils/screenshot'

const activeTab = ref('basic')
const capturing = ref(false)
const previewUrl = ref('')
const currentBlob = ref<Blob | null>(null)

const exportFormat = ref('png')
const fileName = ref(`screenshot-${Date.now()}`)

const captureType = ref<'viewport' | 'fullpage' | 'region' | 'element'>('viewport')
const elementSelector = ref('')
const backgroundColor = ref('#ffffff')
const quality = ref(1)
const scale = ref(2)

const advancedPreviewUrl = ref('')
const advancedBlob = ref<Blob | null>(null)

const isInspecting = ref(false)
const inspectedElement = ref<{
  tagName: string
  className: string
  id: string
  textContent: string
  cssSelector: string
  xpath: string
  element: HTMLElement
} | null>(null)

const screenshotHistory = ref<Array<{ url: string; name: string; time: string; blob: Blob }>>([])

let inspectOverlay: HTMLDivElement | null = null
let inspectTooltip: HTMLDivElement | null = null

async function captureViewport() {
  capturing.value = true
  try {
    const blob = await captureScreenshot({
      format: exportFormat.value as 'png' | 'jpeg' | 'webp',
      quality: quality.value,
      scale: scale.value,
      backgroundColor: backgroundColor.value
    })
    currentBlob.value = blob
    previewUrl.value = URL.createObjectURL(blob)
    addToHistory(previewUrl.value, fileName.value, blob)
    ElMessage.success('截图成功')
  } catch (e) {
    ElMessage.error('截图失败: ' + String(e))
  } finally {
    capturing.value = false
  }
}

async function captureFullPage() {
  capturing.value = true
  try {
    const blob = await captureFullPageApi()
    currentBlob.value = blob
    previewUrl.value = URL.createObjectURL(blob)
    addToHistory(previewUrl.value, 'fullpage-' + Date.now(), blob)
    ElMessage.success('全页截图成功')
  } catch (e) {
    ElMessage.error('截图失败: ' + String(e))
  } finally {
    capturing.value = false
  }
}

async function startRegionSelection() {
  try {
    const region = await createRegionSelector()
    if (region) {
      const blob = await captureRegionApi(region)
      currentBlob.value = blob
      previewUrl.value = URL.createObjectURL(blob)
      addToHistory(previewUrl.value, 'region-' + Date.now(), blob)
      ElMessage.success('区域截图成功')
    }
  } catch (e) {
    ElMessage.error('截图失败: ' + String(e))
  }
}

async function doAdvancedCapture() {
  capturing.value = true
  try {
    let blob: Blob

    if (captureType.value === 'viewport') {
      blob = await captureScreenshot({
        format: exportFormat.value as 'png' | 'jpeg' | 'webp',
        quality: quality.value,
        scale: scale.value,
        backgroundColor: backgroundColor.value
      })
    } else if (captureType.value === 'fullpage') {
      blob = await captureFullPageApi()
    } else if (captureType.value === 'region') {
      const region = await createRegionSelector()
      if (!region) {
        ElMessage.warning('未选择区域')
        return
      }
      blob = await captureRegionApi(region)
    } else {
      const element = document.querySelector(elementSelector.value) as HTMLElement
      if (!element) {
        ElMessage.error('未找到指定元素')
        return
      }
      blob = await captureElement(element)
    }

    advancedBlob.value = blob
    advancedPreviewUrl.value = URL.createObjectURL(blob)
    ElMessage.success('截图成功')
  } catch (e) {
    ElMessage.error('截图失败: ' + String(e))
  } finally {
    capturing.value = false
  }
}

function previewElement() {
  const element = document.querySelector(elementSelector.value)
  if (element) {
    ;(element as HTMLElement).style.outline = '3px solid #667eea'
    setTimeout(() => {
      ;(element as HTMLElement).style.outline = ''
    }, 2000)
    ElMessage.success('元素已高亮显示')
  } else {
    ElMessage.error('未找到元素: ' + elementSelector.value)
  }
}

function downloadCurrent() {
  if (currentBlob.value) {
    const url = URL.createObjectURL(currentBlob.value)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName.value}.${exportFormat.value}`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  }
}

function downloadAdvanced() {
  if (advancedBlob.value) {
    const url = URL.createObjectURL(advancedBlob.value)
    const a = document.createElement('a')
    a.href = url
    a.download = `advanced-screenshot-${Date.now()}.png`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  }
}

async function copyToClipboard() {
  if (currentBlob.value) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [currentBlob.value.type]: currentBlob.value })
      ])
      ElMessage.success('已复制到剪贴板')
    } catch {
      ElMessage.error('复制失败，请尝试下载')
    }
  }
}

function addToHistory(url: string, name: string, blob: Blob) {
  const now = new Date()
  const timeStr = now.toLocaleString()
  screenshotHistory.value.unshift({ url, name, time: timeStr, blob })
  if (screenshotHistory.value.length > 20) {
    screenshotHistory.value.pop()
  }
}

function downloadHistoryItem(item: { url: string; name: string; blob: Blob }) {
  const a = document.createElement('a')
  a.href = item.url
  a.download = `${item.name}.png`
  a.click()
}

function deleteHistoryItem(idx: number) {
  screenshotHistory.value.splice(idx, 1)
}

function generateCSSSelector(element: HTMLElement): string {
  if (element.id) return `#${element.id}`

  const parts: string[] = []
  let current: HTMLElement | null = element

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()

    if (current.id) {
      selector = `#${current.id}`
      parts.unshift(selector)
      break
    }

    if (current.className) {
      const classes = current.className.split(/\s+/).filter(c => c)
      if (classes.length > 0) {
        selector += '.' + classes.slice(0, 2).join('.')
      }
    }

    const parent = current.parentElement
    if (parent && current.tagName) {
      const currentTagName = current.tagName
      const siblings = Array.from(parent.children).filter(c => c.tagName === currentTagName)
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-child(${index})`
      }
    }

    parts.unshift(selector)
    current = current.parentElement
  }

  return parts.join(' > ')
}

function generateXPath(element: HTMLElement): string {
  const parts: string[] = []
  let current: HTMLElement | null = element

  while (current && current !== document.body) {
    let index = 1
    let sibling = current.previousElementSibling

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++
      }
      sibling = sibling.previousElementSibling
    }

    const tagName = current.tagName.toLowerCase()
    parts.unshift(`${tagName}[${index}]`)
    current = current.parentElement
  }

  return '/' + parts.join('/')
}

function startElementInspect() {
  if (isInspecting.value) return

  isInspecting.value = true

  inspectOverlay = document.createElement('div')
  inspectOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 99998;
    cursor: crosshair;
  `
  document.body.appendChild(inspectOverlay)

  inspectTooltip = document.createElement('div')
  inspectTooltip.style.cssText = `
    position: fixed;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 99999;
    display: none;
    max-width: 300px;
  `
  document.body.appendChild(inspectTooltip)

  function onMouseOver(e: MouseEvent) {
    const target = e.target as HTMLElement
    if (target === inspectOverlay || target === inspectTooltip) return

    if (inspectTooltip) {
      inspectTooltip.style.display = 'block'
      inspectTooltip.innerHTML = `
        <div><strong>${target.tagName}</strong></div>
        <div>ID: ${target.id || '无'}</div>
        <div>类: ${target.className?.slice(0, 30) || '无'}</div>
      `
    }

    target.style.outline = '2px solid #667eea'
  }

  function onMouseOut(e: MouseEvent) {
    const target = e.target as HTMLElement
    target.style.outline = ''
  }

  function onMouseMove(e: MouseEvent) {
    if (inspectTooltip) {
      inspectTooltip.style.left = `${e.clientX + 15}px`
      inspectTooltip.style.top = `${e.clientY + 15}px`
    }
  }

  function onClick(e: MouseEvent) {
    e.stopPropagation()
    const target = e.target as HTMLElement
    if (target === inspectOverlay || target === inspectTooltip) return

    inspectedElement.value = {
      tagName: target.tagName,
      className: target.className,
      id: target.id,
      textContent: target.textContent || '',
      cssSelector: generateCSSSelector(target),
      xpath: generateXPath(target),
      element: target
    }

    stopElementInspect()
    ElMessage.success('已选择元素')
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      stopElementInspect()
    }
  }

  inspectOverlay.addEventListener('mouseover', onMouseOver)
  inspectOverlay.addEventListener('mouseout', onMouseOut)
  inspectOverlay.addEventListener('mousemove', onMouseMove)
  inspectOverlay.addEventListener('click', onClick)
  document.addEventListener('keydown', onKeyDown)
}

function stopElementInspect() {
  isInspecting.value = false

  if (inspectOverlay) {
    inspectOverlay.remove()
    inspectOverlay = null
  }

  if (inspectTooltip) {
    inspectTooltip.remove()
    inspectTooltip = null
  }

  document.querySelectorAll('[style*="outline"]').forEach(el => {
    ;(el as HTMLElement).style.outline = ''
  })
}

async function screenshotInspectedElement() {
  if (!inspectedElement.value) return

  try {
    const blob = await captureElement(inspectedElement.value.element)
    const url = URL.createObjectURL(blob)
    addToHistory(url, 'element-' + Date.now(), blob)
    ElMessage.success('元素截图已保存到历史记录')
  } catch (e) {
    ElMessage.error('截图失败: ' + String(e))
  }
}

function copySelector(selector: string) {
  navigator.clipboard.writeText(selector)
  ElMessage.success('已复制到剪贴板')
}
</script>

<style scoped>
.screenshot-tool {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.screenshot-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  background: #f5f5f5;
  border-radius: 8px;
}

.screenshot-actions {
  justify-content: center;
  margin-top: 16px;
}
</style>
