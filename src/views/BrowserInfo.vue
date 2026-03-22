<template>
  <div class="browser-info">
    <el-card>
      <template #header>
        <span>浏览器兼容性检测</span>
        <el-button type="primary" link @click="handleRecheck">
          <el-icon><Refresh /></el-icon>
          重新检测
        </el-button>
      </template>

      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="browser-card" shadow="hover">
            <div class="browser-icon">
              <span class="browser-icon-text" :style="{ color: browserColor }">
                {{ browserIcon }}
              </span>
            </div>
            <div class="browser-name">{{ browser.name }} {{ browser.version }}</div>
            <div class="browser-platform">{{ browser.platform }}</div>
            <div class="browser-type">
              <el-tag v-if="browser.isDesktop" type="success" size="small">桌面端</el-tag>
              <el-tag v-else-if="browser.isTablet" type="warning" size="small">平板端</el-tag>
              <el-tag v-else type="info" size="small">移动端</el-tag>
            </div>
          </el-card>
        </el-col>

        <el-col :span="16">
          <el-card>
            <template #header>兼容性评分</template>
            <div class="score-section">
              <el-progress
                type="circle"
                :percentage="score"
                :color="scoreColor"
                :width="120"
              />
              <div class="score-text">
                <div class="score-label">{{ scoreLabel }}</div>
                <div class="score-desc">{{ scoreDescription }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>功能支持情况</template>
      <el-table :data="featureList" stripe size="small">
        <el-table-column prop="name" label="功能" width="200" />
        <el-table-column label="支持" width="100">
          <template #default="{ row }">
            <el-icon :color="row.supported ? '#67C23A' : '#F56C6C'" :size="20">
              <CircleCheck v-if="row.supported" />
              <CircleClose v-else />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="fallback" label="替代方案">
          <template #default="{ row }">
            <span v-if="row.fallback" class="fallback-text">{{ row.fallback }}</span>
            <span v-else class="no-fallback">-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card style="margin-top: 20px" v-if="issues.length > 0">
      <template #header>兼容性问题</template>
      <el-alert
        v-for="(issue, index) in issues"
        :key="index"
        :type="issue.severity === 'critical' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info'"
        :closable="false"
        style="margin-bottom: 12px"
      >
        <template #title>
          {{ issue.feature }} - {{ issue.severity === 'critical' ? '严重' : issue.severity === 'warning' ? '警告' : '提示' }}
        </template>
        <div style="margin-top: 8px">
          <p>{{ issue.message }}</p>
          <p style="color: #67C23A; margin-top: 4px">建议: {{ issue.suggestion }}</p>
        </div>
      </el-alert>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>浏览器检测详情</template>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="用户代理">
          {{ userAgent }}
        </el-descriptions-item>
        <el-descriptions-item label="屏幕分辨率">
          {{ screenWidth }} x {{ screenHeight }}
        </el-descriptions-item>
        <el-descriptions-item label="窗口大小">
          {{ windowWidth }} x {{ windowHeight }}
        </el-descriptions-item>
        <el-descriptions-item label="颜色深度">
          {{ colorDepth }} bit
        </el-descriptions-item>
        <el-descriptions-item label="像素比">
          {{ pixelRatio }}
        </el-descriptions-item>
        <el-descriptions-item label="语言">
          {{ language }}
        </el-descriptions-item>
        <el-descriptions-item label="时区">
          {{ timezone }}
        </el-descriptions-item>
        <el-descriptions-item label="Cookie启用">
          <el-tag size="small" :type="cookiesEnabled ? 'success' : 'danger'">
            {{ cookiesEnabled ? '是' : '否' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="JavaScript启用">
          <el-tag size="small" type="success">是</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="在线状态">
          <el-tag size="small" :type="onLine ? 'success' : 'danger'">
            {{ onLine ? '在线' : '离线' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card style="margin-top: 20px" v-if="!browser.isDesktop">
      <template #header>移动端适配建议</template>
      <el-alert type="info" :closable="false">
        <template #title>针对移动端的优化建议</template>
        <ul style="margin-top: 12px; padding-left: 20px">
          <li>建议使用竖屏模式以获得最佳浏览体验</li>
          <li>部分复杂功能（如截图标注）建议在桌面端使用</li>
          <li>如遇到界面显示异常，请尝试缩放或旋转屏幕</li>
          <li>建议添加至主屏幕以便快速访问</li>
        </ul>
      </el-alert>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Refresh, CircleCheck, CircleClose } from '@element-plus/icons-vue'
import {
  detectBrowser,
  checkFeatures,
  analyzeCompatibility,
  getCompatibilityScore,
  getRecommendation
} from '@/utils/compatibility'

const browser = ref(detectBrowser())
const features = ref(checkFeatures())
const issues = ref(analyzeCompatibility())
const score = ref(getCompatibilityScore())
const recommendation = ref(getRecommendation())

const userAgent = ref(navigator.userAgent)
const screenWidth = ref(window.screen.width)
const screenHeight = ref(window.screen.height)
const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)
const colorDepth = ref(window.screen.colorDepth)
const pixelRatio = ref(window.devicePixelRatio)
const language = ref(navigator.language)
const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone)
const cookiesEnabled = ref(navigator.cookieEnabled)
const onLine = ref(navigator.onLine)

const featureList = computed(() => features.value)

const browserIcon = computed(() => {
  if (browser.value.isChrome) return 'Chrome'
  if (browser.value.isFirefox) return 'Firefox'
  if (browser.value.isSafari) return 'Safari'
  if (browser.value.isEdge) return 'Edge'
  if (browser.value.isOpera) return 'Opera'
  return 'Monitor'
})

const browserColor = computed(() => {
  if (browser.value.isChrome) return '#4285F4'
  if (browser.value.isFirefox) return '#FF7139'
  if (browser.value.isSafari) return '#000000'
  if (browser.value.isEdge) return '#0078D4'
  if (browser.value.isOpera) return '#FF1B8D'
  return '#909399'
})

const scoreColor = computed(() => {
  if (score.value >= 90) return '#67C23A'
  if (score.value >= 70) return '#E6A23C'
  return '#F56C6C'
})

const scoreLabel = computed(() => {
  if (score.value >= 90) return '优秀'
  if (score.value >= 70) return '良好'
  if (score.value >= 50) return '一般'
  return '较差'
})

const scoreDescription = computed(() => recommendation.value)

function handleRecheck() {
  browser.value = detectBrowser()
  features.value = checkFeatures()
  issues.value = analyzeCompatibility()
  score.value = getCompatibilityScore()
  recommendation.value = getRecommendation()
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
}

onMounted(() => {
  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  })
})
</script>

<style scoped>
.browser-info {
  padding: 20px;
}

.browser-card {
  text-align: center;
  padding: 20px 0;
}

.browser-icon {
  margin-bottom: 16px;
}

.browser-icon-text {
  font-size: 48px;
  font-weight: bold;
}

.browser-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.browser-platform {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
}

.browser-type {
  margin-top: 12px;
}

.score-section {
  display: flex;
  align-items: center;
  gap: 24px;
}

.score-text {
  flex: 1;
}

.score-label {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.score-desc {
  margin-top: 8px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.fallback-text {
  font-size: 12px;
  color: #909399;
}

.no-fallback {
  color: #C0C4CC;
}
</style>
