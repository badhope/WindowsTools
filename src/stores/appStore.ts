import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { logger, type LogEntry, type LogLevel } from '@/utils/errorHandler'

export interface AppSettings {
  general: {
    defaultDelay: [number, number]
    defaultTimeout: number
    defaultRetries: number
    respectRobotsTxt: boolean
    concurrency: number
    autoSaveInterval: number
    theme: 'light' | 'dark' | 'auto'
    language: 'zh-CN' | 'en-US'
  }
  export: {
    defaultFormat: 'csv' | 'json' | 'excel' | 'html' | 'pdf' | 'markdown' | 'tsv' | 'xml'
    defaultEncoding: 'utf-8' | 'gbk'
    exportDirectory: string
    compressExports: boolean
    maxExportRows: number
  }
  proxy: {
    enabled: boolean
    autoRotate: boolean
    rotateInterval: number
    testUrls: string[]
    selectedProxies: string[]
  }
  notification: {
    enabled: boolean
    onStart: boolean
    onComplete: boolean
    onError: boolean
    soundEnabled: boolean
  }
  advanced: {
    enableDebug: boolean
    maxLogEntries: number
    enableCache: boolean
    cacheDuration: number
    enableMetrics: boolean
  }
}

export interface NotificationItem {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
}

const defaultSettings: AppSettings = {
  general: {
    defaultDelay: [1, 3],
    defaultTimeout: 30000,
    defaultRetries: 3,
    respectRobotsTxt: true,
    concurrency: 3,
    autoSaveInterval: 30000,
    theme: 'light',
    language: 'zh-CN'
  },
  export: {
    defaultFormat: 'csv',
    defaultEncoding: 'utf-8',
    exportDirectory: 'downloads',
    compressExports: false,
    maxExportRows: 100000
  },
  proxy: {
    enabled: false,
    autoRotate: false,
    rotateInterval: 300000,
    testUrls: ['https://www.baidu.com', 'https://www.google.com'],
    selectedProxies: []
  },
  notification: {
    enabled: true,
    onStart: true,
    onComplete: true,
    onError: true,
    soundEnabled: false
  },
  advanced: {
    enableDebug: false,
    maxLogEntries: 500,
    enableCache: true,
    cacheDuration: 3600000,
    enableMetrics: false
  }
}

const STORAGE_KEY = 'visual-spider-settings'
const SERVER_URL_KEY = 'visual-spider-server-url'

export const useAppStore = defineStore('app', () => {
  const settings = ref<AppSettings>(loadSettings())
  const notifications = ref<NotificationItem[]>([])
  const isInitialized = ref(false)
  const serverUrl = ref(loadServerUrl())

  function loadSettings(): AppSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return deepMerge(defaultSettings, parsed)
      }
    } catch (e) {
      logger.error('Settings', 'Failed to load settings', { error: String(e) })
    }
    return { ...defaultSettings }
  }

  function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target }
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] as any, source[key] as any)
      } else {
        result[key] = source[key] as any
      }
    }
    return result
  }

  function saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
      logger.info('Settings', 'Settings saved successfully')
    } catch (e) {
      logger.error('Settings', 'Failed to save settings', { error: String(e) })
    }
  }

  function updateSettings(updates: Partial<AppSettings>): void {
    settings.value = deepMerge(settings.value, updates)
    saveSettings()
  }

  function resetSettings(): void {
    settings.value = { ...defaultSettings }
    saveSettings()
    logger.info('Settings', 'Settings reset to defaults')
  }

  function addNotification(
    type: NotificationItem['type'],
    title: string,
    message: string
  ): void {
    const notification: NotificationItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false
    }

    notifications.value.push(notification)

    if (notifications.value.length > 100) {
      notifications.value = notifications.value.slice(-100)
    }

    logger.info('Notification', `${title}: ${message}`)
  }

  function markNotificationRead(id: string): void {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      notification.read = true
    }
  }

  function markAllNotificationsRead(): void {
    notifications.value.forEach(n => {
      n.read = true
    })
  }

  function clearNotifications(): void {
    notifications.value = []
  }

  function loadServerUrl(): string {
    return localStorage.getItem(SERVER_URL_KEY) || 'http://localhost:3000'
  }

  function setServerUrl(url: string): void {
    serverUrl.value = url
    localStorage.setItem(SERVER_URL_KEY, url)
    logger.info('Server', `Server URL set to: ${url}`)
  }

  function getUnreadCount(): number {
    return notifications.value.filter(n => !n.read).length
  }

  function getLogs(options?: {
    level?: LogLevel
    category?: string
    limit?: number
  }): LogEntry[] {
    return logger.getLogs(options)
  }

  function getLogStats(): Record<LogLevel, number> {
    return logger.getStats()
  }

  function clearLogs(): void {
    logger.clearLogs()
  }

  function exportLogs(): string {
    return logger.exportLogs()
  }

  function initialize(): void {
    if (isInitialized.value) return

    settings.value = loadSettings()

    if (settings.value.notification.enabled) {
      addNotification('info', '系统启动', 'VisualSpider 已成功加载')
    }

    isInitialized.value = true
    logger.info('App', 'Application initialized')
  }

  watch(settings, () => {
    if (isInitialized.value) {
      saveSettings()
    }
  }, { deep: true })

  return {
    settings,
    notifications,
    isInitialized,
    serverUrl,
    updateSettings,
    resetSettings,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    getUnreadCount,
    getLogs,
    getLogStats,
    clearLogs,
    exportLogs,
    initialize,
    setServerUrl
  }
})
