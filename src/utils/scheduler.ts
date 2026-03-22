import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

export interface ScheduledTask {
  id: string
  name: string
  cron: string
  taskConfig: any
  enabled: boolean
  lastRun?: string
  nextRun?: string
}

export function useScheduler() {
  const tasks = ref<ScheduledTask[]>([])
  const isRunning = ref(false)
  const checkInterval = ref<number | null>(null)

  function parseCron(cronStr: string): { minute: string; hour: string; day: string; month: string; weekday: string } {
    const parts = cronStr.split(' ')
    return {
      minute: parts[0] || '*',
      hour: parts[1] || '*',
      day: parts[2] || '*',
      month: parts[3] || '*',
      weekday: parts[4] || '*'
    }
  }

  function getNextRunTime(cronStr: string): Date | null {
    const cron = parseCron(cronStr)
    const now = new Date()
    const next = new Date(now)

    next.setSeconds(0)
    next.setMilliseconds(0)

    if (cron.minute !== '*') {
      const minute = parseInt(cron.minute)
      next.setMinutes(minute > now.getMinutes() ? minute : 0)
    }

    if (cron.hour !== '*') {
      const hour = parseInt(cron.hour)
      if (next.getHours() < hour) {
        next.setHours(hour, 0, 0, 0)
      }
    }

    return next
  }

  function shouldRun(cronStr: string): boolean {
    const now = new Date()
    const cron = parseCron(cronStr)

    const minute = now.getMinutes().toString()
    const hour = now.getHours().toString()
    const day = now.getDate().toString()
    const month = (now.getMonth() + 1).toString()
    const weekday = now.getDay().toString()

    const matchMinute = cron.minute === '*' || cron.minute === minute
    const matchHour = cron.hour === '*' || cron.hour === hour
    const matchDay = cron.day === '*' || cron.day === day
    const matchMonth = cron.month === '*' || cron.month === month
    const matchWeekday = cron.weekday === '*' || cron.weekday === weekday

    return matchMinute && matchHour && matchDay && matchMonth && matchWeekday
  }

  function addTask(task: Omit<ScheduledTask, 'id' | 'nextRun'>): string {
    const id = Date.now().toString()
    const newTask: ScheduledTask = {
      ...task,
      id,
      nextRun: getNextRunTime(task.cron)?.toISOString()
    }
    tasks.value.push(newTask)
    saveTasks()
    return id
  }

  function removeTask(id: string): void {
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tasks.value.splice(index, 1)
      saveTasks()
    }
  }

  function updateTask(id: string, updates: Partial<ScheduledTask>): void {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      Object.assign(task, updates)
      if (updates.cron) {
        task.nextRun = getNextRunTime(updates.cron)?.toISOString()
      }
      saveTasks()
    }
  }

  function toggleTask(id: string): void {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      task.enabled = !task.enabled
      saveTasks()
    }
  }

  function startScheduler(onTaskRun: (task: ScheduledTask) => void): void {
    if (isRunning.value) return

    isRunning.value = true
    checkInterval.value = window.setInterval(() => {
      const now = new Date()

      for (const task of tasks.value) {
        if (!task.enabled) continue

        if (shouldRun(task.cron)) {
          const lastRun = task.lastRun ? new Date(task.lastRun) : null
          if (!lastRun || now.getTime() - lastRun.getTime() > 60000) {
            task.lastRun = now.toISOString()
            task.nextRun = getNextRunTime(task.cron)?.toISOString()
            saveTasks()
            onTaskRun(task)
          }
        }
      }
    }, 30000)
  }

  function stopScheduler(): void {
    if (checkInterval.value) {
      clearInterval(checkInterval.value)
      checkInterval.value = null
    }
    isRunning.value = false
  }

  function saveTasks(): void {
    try {
      localStorage.setItem('visual-spider-scheduler-tasks', JSON.stringify(tasks.value))
    } catch {}
  }

  function loadTasks(): void {
    try {
      const saved = localStorage.getItem('visual-spider-scheduler-tasks')
      if (saved) {
        tasks.value = JSON.parse(saved)
      }
    } catch {
      tasks.value = []
    }
  }

  function validateCron(cron: string): boolean {
    const pattern = /^(\*|(\d{1,2})(,\d{1,2})*) (\*|(\d{1,2})(,\d{1,2})*) (\*|(\d{1,2})(,\d{1,2})*) (\*|(\d{1,2})(,\d{1,2})*) (\*|(\d{1,2})(,\d{1,2})*)$/
    return pattern.test(cron)
  }

  function getCronDescription(cron: string): string {
    const parts = cron.split(' ')
    if (parts.length !== 5) return '无效的 cron 表达式'

    const [minute, hour, day, month, weekday] = parts

    if (minute === '*' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
      return '每分钟'
    }

    if (minute !== '*' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
      return `每小时第 ${minute} 分钟`
    }

    if (minute !== '*' && hour !== '*' && day === '*' && month === '*' && weekday === '*') {
      return `每天 ${hour}:${minute.padStart(2, '0')}`
    }

    if (minute !== '*' && hour !== '*' && day !== '*' && month === '*' && weekday === '*') {
      return `每月第 ${day} 日 ${hour}:${minute.padStart(2, '0')}`
    }

    if (weekday !== '*') {
      const weekNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const wd = parseInt(weekday)
      return `每周${weekNames[wd]} ${hour}:${minute.padStart(2, '0')}`
    }

    return cron
  }

  onMounted(() => {
    loadTasks()
  })

  return {
    tasks,
    isRunning,
    addTask,
    removeTask,
    updateTask,
    toggleTask,
    startScheduler,
    stopScheduler,
    validateCron,
    getCronDescription
  }
}

export function useNotification() {
  function notify(title: string, options?: NotificationOptions): Notification | null {
    if (!('Notification' in window)) {
      ElMessage.warning('当前浏览器不支持通知功能')
      return null
    }

    if (Notification.permission === 'granted') {
      return new Notification(title, options)
    }

    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, options)
        }
      })
    }

    return null
  }

  function notifySuccess(message: string): void {
    notify('VisualSpider', {
      body: message,
      icon: '/vite.svg',
      tag: 'success'
    })
  }

  function notifyError(message: string): void {
    notify('VisualSpider - 错误', {
      body: message,
      icon: '/vite.svg',
      tag: 'error'
    })
  }

  function notifyTaskComplete(taskName: string, recordCount: number): void {
    notify(`任务完成: ${taskName}`, {
      body: `成功抓取 ${recordCount} 条数据`,
      icon: '/vite.svg',
      tag: 'task-complete'
    })
  }

  return {
    notify,
    notifySuccess,
    notifyError,
    notifyTaskComplete
  }
}
