<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <el-button class="language-btn" circle>
      <el-icon size="18">
        <Connection />
      </el-icon>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="en" :class="{ 'is-active': currentLocale === 'en' }">
          <span class="locale-name">🇺🇸 English</span>
        </el-dropdown-item>
        <el-dropdown-item command="zh-CN" :class="{ 'is-active': currentLocale === 'zh-CN' }">
          <span class="locale-name">🇨🇳 中文</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Connection } from '@element-plus/icons-vue'
import { setLocale, getLocale } from '@/locales'

const currentLocale = computed(() => getLocale())

function handleCommand(locale: 'en' | 'zh-CN'): void {
  setLocale(locale)
}
</script>

<style scoped>
.language-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.locale-name {
  font-size: 14px;
}

:deep(.el-dropdown-menu__item.is-active) {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
</style>
