<template>
  <el-popover
    placement="bottom-end"
    :width="360"
    trigger="click"
    v-model:visible="visible"
  >
    <template #reference>
      <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
        <el-button circle>
          <el-icon size="18"><Bell /></el-icon>
        </el-button>
      </el-badge>
    </template>

    <div class="notification-panel">
      <div class="notification-header">
        <span class="notification-title">通知中心</span>
        <el-space>
          <el-button link size="small" @click="markAllRead" v-if="unreadCount > 0">
            全部已读
          </el-button>
          <el-button link size="small" @click="clearAll">
            清空
          </el-button>
        </el-space>
      </div>

      <div class="notification-tabs">
        <el-radio-group v-model="activeTab" size="small">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="unread">未读</el-radio-button>
        </el-radio-group>
      </div>

      <div class="notification-list" v-if="displayNotifications.length > 0">
        <div
          v-for="item in displayNotifications"
          :key="item.id"
          class="notification-item"
          :class="{ unread: !item.read }"
          @click="handleClick(item)"
        >
          <div class="notification-icon" :class="item.type">
            <el-icon v-if="item.type === 'success'"><CircleCheck /></el-icon>
            <el-icon v-else-if="item.type === 'error'"><CircleClose /></el-icon>
            <el-icon v-else-if="item.type === 'warning'"><Warning /></el-icon>
            <el-icon v-else><InfoFilled /></el-icon>
          </div>
          <div class="notification-content">
            <div class="notification-item-title">{{ item.title }}</div>
            <div class="notification-message">{{ item.message }}</div>
            <div class="notification-time">{{ formatTime(item.timestamp) }}</div>
          </div>
        </div>
      </div>

      <el-empty
        v-else
        description="暂无通知"
        :image-size="60"
      />
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Bell, CircleCheck, CircleClose, Warning, InfoFilled } from '@element-plus/icons-vue'
import { useAppStore } from '@/stores/appStore'
import { storeToRefs } from 'pinia'

const appStore = useAppStore()
const { notifications } = storeToRefs(appStore)

const visible = ref(false)
const activeTab = ref('all')

const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

const displayNotifications = computed(() => {
  const list = [...notifications.value].reverse()
  if (activeTab.value === 'unread') {
    return list.filter(n => !n.read)
  }
  return list
})

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`
  } else {
    return date.toLocaleDateString()
  }
}

function handleClick(item: any): void {
  appStore.markNotificationRead(item.id)
}

function markAllRead(): void {
  appStore.markAllNotificationsRead()
}

function clearAll(): void {
  appStore.clearNotifications()
}
</script>

<style scoped>
.notification-panel {
  margin: -8px -12px;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.notification-title {
  font-weight: 600;
  font-size: 14px;
}

.notification-tabs {
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.notification-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item:hover {
  background-color: var(--el-fill-color-light);
}

.notification-item.unread {
  background-color: var(--el-color-primary-light-9);
}

.notification-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.notification-icon.success {
  background-color: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.notification-icon.error {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.notification-icon.warning {
  background-color: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
}

.notification-icon.info {
  background-color: var(--el-color-info-light-9);
  color: var(--el-color-info);
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-item-title {
  font-weight: 500;
  font-size: 14px;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.notification-message {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-time {
  font-size: 11px;
  color: var(--el-text-color-disabled);
  margin-top: 4px;
}
</style>
