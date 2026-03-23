<template>
  <el-dialog
    v-model="visible"
    :title="$t('guides.welcome')"
    width="600px"
    :close-on-click-modal="false"
    class="welcome-dialog"
  >
    <div class="welcome-content">
      <div class="welcome-icon">
        <el-icon size="64" color="#409eff"><Monitor /></el-icon>
      </div>

      <h2 class="welcome-title">{{ $t('guides.welcome') }} VisualSpider</h2>
      <p class="welcome-subtitle">{{ $t('app.subtitle') }} v1.0.1</p>

      <el-steps :active="currentStep" finish-status="success" class="welcome-steps">
        <el-step :title="$t('guides.step1')" />
        <el-step :title="$t('guides.step2')" />
        <el-step :title="$t('guides.step3')" />
        <el-step :title="$t('guides.step4')" />
        <el-step :title="$t('guides.step5')" />
      </el-steps>

      <div class="step-content">
        <div v-if="currentStep === 0" class="step-detail">
          <el-icon size="48" color="#67c23a"><Link /></el-icon>
          <h3>{{ $t('guides.step1') }}</h3>
          <p>{{ $t('tooltips.taskUrl') }}</p>
          <el-input
            :placeholder="$t('task.urlPlaceholder')"
            v-model="demoUrl"
            class="demo-input"
          >
            <template #prefix>
              <el-icon><Link /></el-icon>
            </template>
          </el-input>
        </div>

        <div v-if="currentStep === 1" class="step-detail">
          <el-icon size="48" color="#e6a23c"><Aim /></el-icon>
          <h3>{{ $t('guides.step2') }}</h3>
          <p>{{ $t('tooltips.selectorHelp') }}</p>
          <div class="code-preview">
            <code>.product-card .title</code>
            <code>#item-price</code>
            <code>//div[@class='shop']</code>
          </div>
        </div>

        <div v-if="currentStep === 2" class="step-detail">
          <el-icon size="48" color="#909399"><Document /></el-icon>
          <h3>{{ $t('guides.step3') }}</h3>
          <p>{{ $t('tooltips.paginationHelp') }}</p>
        </div>

        <div v-if="currentStep === 3" class="step-detail">
          <el-icon size="48" color="#f56c6c"><VideoPlay /></el-icon>
          <h3>{{ $t('guides.step4') }}</h3>
          <p>{{ $t('task.start') }} - {{ $t('task.stop') }}</p>
        </div>

        <div v-if="currentStep === 4" class="step-detail">
          <el-icon size="48" color="#409eff"><Download /></el-icon>
          <h3>{{ $t('guides.step5') }}</h3>
          <p>{{ $t('task.export') }}: CSV, JSON, Excel, PDF...</p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-checkbox v-model="dontShowAgain" v-if="currentStep === 4">
          {{ locale === 'en' ? "Don't show again" : '不再显示' }}
        </el-checkbox>
        <div class="button-group">
          <el-button @click="handleSkip" v-if="currentStep < 4">
            {{ locale === 'en' ? 'Skip' : '跳过' }}
          </el-button>
          <el-button @click="handlePrev" v-if="currentStep > 0">
            {{ $t('common.previous') }}
          </el-button>
          <el-button type="primary" @click="handleNext">
            {{ currentStep === 4 ? $t('common.ok') : $t('common.next') }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Monitor, Link, Aim, Document, VideoPlay, Download } from '@element-plus/icons-vue'
import { getLocale } from '@/locales'

const locale = computed(() => getLocale())

const visible = ref(false)
const currentStep = ref(0)
const demoUrl = ref('')
const dontShowAgain = ref(false)

const STORAGE_KEY = 'visual-spider-welcome-shown'

function checkShouldShow(): void {
  const shown = localStorage.getItem(STORAGE_KEY)
  if (!shown) {
    visible.value = true
  }
}

function handleNext(): void {
  if (currentStep.value < 4) {
    currentStep.value++
  } else {
    handleClose()
  }
}

function handlePrev(): void {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function handleSkip(): void {
  handleClose()
}

function handleClose(): void {
  if (dontShowAgain.value) {
    localStorage.setItem(STORAGE_KEY, 'true')
  }
  visible.value = false
}

watch(visible, (val) => {
  if (val) {
    currentStep.value = 0
    dontShowAgain.value = false
  }
})

defineExpose({ checkShouldShow })
</script>

<style scoped>
.welcome-content {
  text-align: center;
  padding: 20px 0;
}

.welcome-icon {
  margin-bottom: 20px;
}

.welcome-title {
  font-size: 24px;
  color: #303133;
  margin-bottom: 8px;
}

.welcome-subtitle {
  font-size: 14px;
  color: #909399;
  margin-bottom: 30px;
}

.welcome-steps {
  margin: 30px 0;
  padding: 0 20px;
}

.step-content {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.step-detail {
  text-align: center;
  animation: fadeIn 0.3s ease;
}

.step-detail h3 {
  font-size: 18px;
  color: #303133;
  margin: 15px 0 10px;
}

.step-detail p {
  font-size: 14px;
  color: #606266;
  margin-bottom: 15px;
}

.demo-input {
  max-width: 400px;
  margin-top: 15px;
}

.code-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f5f7fa;
  padding: 15px 25px;
  border-radius: 8px;
  margin-top: 15px;
}

.code-preview code {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  color: #409eff;
  background: #ecf5ff;
  padding: 4px 12px;
  border-radius: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.button-group {
  display: flex;
  gap: 10px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:deep(.el-step__title) {
  font-size: 12px;
}
</style>
