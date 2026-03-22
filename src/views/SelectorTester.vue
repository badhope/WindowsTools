<template>
  <div class="selector-tester">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>XPath/CSS 选择器测试器</span>
          <el-space>
            <el-button size="small" @click="loadPageSelectors">
              <el-icon><Refresh /></el-icon>
              加载建议
            </el-button>
            <el-button size="small" type="primary" @click="highlightMatches">
              <el-icon><View /></el-icon>
              高亮匹配
            </el-button>
            <el-button size="small" @click="clearHighlights">
              <el-icon><Delete /></el-icon>
              清除高亮
            </el-button>
          </el-space>
        </div>
      </template>

      <el-form inline>
        <el-form-item label="选择器类型">
          <el-radio-group v-model="selectorType">
            <el-radio label="css">CSS</el-radio>
            <el-radio label="xpath">XPath</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="选择器表达式">
          <el-input
            v-model="selector"
            placeholder="输入选择器，如: div.item 或 //div[@class='item']"
            style="width: 400px"
            @keyup.enter="testSelector"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="testSelector">测试</el-button>
        </el-form-item>
      </el-form>

      <el-divider />

      <el-row :gutter="20">
        <el-col :span="12">
          <el-card header="建议的选择器" size="small">
            <div class="suggestions">
              <el-empty v-if="suggestions.length === 0" description="点击「加载建议」获取页面元素" />
              <div
                v-for="(item, idx) in suggestions"
                :key="idx"
                class="suggestion-item"
                :class="{ active: selectedIndex === idx }"
                @click="useSuggestion(item)"
              >
                <div class="suggestion-header">
                  <el-tag size="small" :type="item.tagName === 'a' ? 'success' : item.tagName === 'img' ? 'warning' : 'info'">
                    {{ item.tagName }}
                  </el-tag>
                  <span class="suggestion-score">评分: {{ item.score }}</span>
                </div>
                <div class="suggestion-selector">{{ item.css }}</div>
                <div class="suggestion-text" v-if="item.textPreview">{{ item.textPreview }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card header="匹配结果" size="small">
            <template #header>
              <span>匹配结果 ({{ matchCount }} 个)</span>
            </template>
            <div class="results">
              <el-empty v-if="matches.length === 0" description="输入选择器并点击「测试」" />
              <div v-for="(match, idx) in matches.slice(0, 20)" :key="idx" class="match-item">
                <span class="match-index">{{ idx + 1 }}</span>
                <span class="match-text">{{ match.text || match.tagName }}</span>
              </div>
              <div v-if="matches.length > 20" class="more-results">
                还有 {{ matches.length - 20 }} 个结果...
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, View, Delete } from '@element-plus/icons-vue'
import {
  findSelectorCandidates,
  evaluateCSS,
  evaluateXPath,
  type SelectorCandidate
} from '@/utils/selectors'

const selectorType = ref<'css' | 'xpath'>('css')
const selector = ref('')
const suggestions = ref<SelectorCandidate[]>([])
const selectedIndex = ref(-1)
const matches = ref<{ text: string; tagName: string }[]>([])
const matchCount = ref(0)

function loadPageSelectors() {
  try {
    const candidates = findSelectorCandidates(document)
    suggestions.value = candidates.slice(0, 50)
    ElMessage.success(`发现 ${suggestions.value.length} 个可选元素`)
  } catch (e) {
    ElMessage.error('加载失败: ' + String(e))
  }
}

function useSuggestion(item: SelectorCandidate) {
  selector.value = item.css
  selectorType.value = 'css'
  testSelector()
}

function testSelector() {
  if (!selector.value) {
    ElMessage.warning('请输入选择器')
    return
  }

  try {
    let elements: Element[]

    if (selectorType.value === 'css') {
      elements = evaluateCSS(selector.value)
    } else {
      elements = evaluateXPath(selector.value)
    }

    matches.value = elements.map(el => ({
      text: el.textContent?.trim().slice(0, 100) || '',
      tagName: el.tagName.toLowerCase()
    }))

    matchCount.value = elements.length

    if (elements.length === 0) {
      ElMessage.info('没有匹配到任何元素')
    } else {
      ElMessage.success(`匹配到 ${elements.length} 个元素`)
    }
  } catch (e) {
    ElMessage.error('选择器无效: ' + String(e))
  }
}

function highlightMatches() {
  if (!selector.value) {
    ElMessage.warning('请输入选择器')
    return
  }

  try {
    let elements: Element[]

    if (selectorType.value === 'css') {
      elements = evaluateCSS(selector.value)
    } else {
      elements = evaluateXPath(selector.value)
    }

    elements.forEach(el => {
      ;(el as HTMLElement).style.outline = '3px solid #667eea'
      ;(el as HTMLElement).style.transition = 'outline 0.3s'
    })

    setTimeout(() => {
      elements.forEach(el => {
        ;(el as HTMLElement).style.outline = ''
      })
    }, 2000)

    ElMessage.success(`已高亮 ${elements.length} 个元素`)
  } catch (e) {
    ElMessage.error('高亮失败: ' + String(e))
  }
}

function clearHighlights() {
  const allElements = document.querySelectorAll('*')
  allElements.forEach(el => {
    ;(el as HTMLElement).style.outline = ''
    ;(el as HTMLElement).style.transition = ''
  })
  ElMessage.info('已清除所有高亮')
}
</script>

<style scoped>
.selector-tester {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.suggestions {
  max-height: 400px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-item:hover {
  border-color: #667eea;
  background: #f8f8ff;
}

.suggestion-item.active {
  border-color: #667eea;
  background: #667eea10;
}

.suggestion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.suggestion-score {
  font-size: 11px;
  color: #999;
}

.suggestion-selector {
  font-family: monospace;
  font-size: 12px;
  color: #333;
  word-break: break-all;
}

.suggestion-text {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.results {
  max-height: 400px;
  overflow-y: auto;
}

.match-item {
  display: flex;
  gap: 8px;
  padding: 6px;
  border-bottom: 1px solid #eee;
}

.match-index {
  color: #999;
  font-size: 12px;
  min-width: 20px;
}

.match-text {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.more-results {
  padding: 10px;
  text-align: center;
  color: #999;
  font-size: 12px;
}
</style>
