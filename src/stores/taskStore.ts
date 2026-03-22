import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Task, CrawlResult, CrawlConfig, Field, PaginationConfig } from '@/types'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const currentTask = ref<Task | null>(null)
  const crawlResults = ref<CrawlResult | null>(null)
  const crawlStatus = ref<'idle' | 'running' | 'paused' | 'completed' | 'error'>('idle')
  const crawlStats = ref({ crawled: 0, success: 0, errors: 0 })

  const defaultCrawlConfig: CrawlConfig = {
    method: 'GET',
    headers: {},
    proxy: null,
    delay: [2, 5],
    maxRetries: 3,
    timeout: 30000,
    renderJs: false
  }

  const defaultPagination: PaginationConfig = {
    enabled: false,
    selector: '',
    selectorType: 'css',
    maxPages: 10,
    nextButtonText: '下一页'
  }

  function createNewTask(): Task {
    const task: Task = {
      id: generateId(),
      name: '未命名任务',
      url: '',
      crawlConfig: { ...defaultCrawlConfig },
      fields: [],
      pagination: { ...defaultPagination },
      status: 'idle',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    return task
  }

  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  function addTask(task: Task) {
    tasks.value.push(task)
    saveTasks()
  }

  function updateTask(taskId: string, updates: Partial<Task>) {
    const index = tasks.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      tasks.value[index] = {
        ...tasks.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      if (currentTask.value?.id === taskId) {
        currentTask.value = tasks.value[index]
      }
      saveTasks()
    }
  }

  function deleteTask(taskId: string) {
    const index = tasks.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      tasks.value.splice(index, 1)
      if (currentTask.value?.id === taskId) {
        currentTask.value = null
      }
      saveTasks()
    }
  }

  function setCurrentTask(task: Task | null) {
    currentTask.value = task
  }

  function addField(field: Field) {
    if (currentTask.value) {
      currentTask.value.fields.push(field)
      updateTask(currentTask.value.id, { fields: currentTask.value.fields })
    }
  }

  function updateField(fieldId: string, updates: Partial<Field>) {
    if (currentTask.value) {
      const index = currentTask.value.fields.findIndex(f => f.id === fieldId)
      if (index !== -1) {
        currentTask.value.fields[index] = {
          ...currentTask.value.fields[index],
          ...updates
        }
        updateTask(currentTask.value.id, { fields: currentTask.value.fields })
      }
    }
  }

  function removeField(fieldId: string) {
    if (currentTask.value) {
      currentTask.value.fields = currentTask.value.fields.filter(f => f.id !== fieldId)
      updateTask(currentTask.value.id, { fields: currentTask.value.fields })
    }
  }

  function setCrawlResults(results: CrawlResult | null) {
    crawlResults.value = results
  }

  function updateCrawlStats(stats: Partial<{ crawled: number; success: number; errors: number }>) {
    crawlStats.value = { ...crawlStats.value, ...stats }
  }

  function resetCrawlStats() {
    crawlStats.value = { crawled: 0, success: 0, errors: 0 }
  }

  function saveTasks() {
    localStorage.setItem('visual-spider-tasks', JSON.stringify(tasks.value))
  }

  function loadTasks() {
    const saved = localStorage.getItem('visual-spider-tasks')
    if (saved) {
      try {
        tasks.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load tasks:', e)
      }
    }
  }

  return {
    tasks,
    currentTask,
    crawlResults,
    crawlStatus,
    crawlStats,
    createNewTask,
    addTask,
    updateTask,
    deleteTask,
    setCurrentTask,
    addField,
    updateField,
    removeField,
    setCrawlResults,
    updateCrawlStats,
    resetCrawlStats,
    loadTasks,
    saveTasks
  }
})
