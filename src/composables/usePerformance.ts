import { ref, onMounted, onUnmounted } from 'vue'

interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
}

interface PerformanceStats {
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  avgResponseTime: number
  maxResponseTime: number
  minResponseTime: number
  recentMetrics: PerformanceMetric[]
}

const performanceStats = ref<PerformanceStats>({
  totalCalls: 0,
  successfulCalls: 0,
  failedCalls: 0,
  avgResponseTime: 0,
  maxResponseTime: 0,
  minResponseTime: 0,
  recentMetrics: []
})

const apiTimings = ref<Record<string, number[]>>({})

let intervalId: number | null = null

export function usePerformance() {
  const isMonitoring = ref(false)

  function recordMetric(name: string, duration: number, success: boolean) {
    performanceStats.value.totalCalls++
    
    if (success) {
      performanceStats.value.successfulCalls++
    } else {
      performanceStats.value.failedCalls++
    }

    if (!apiTimings.value[name]) {
      apiTimings.value[name] = []
    }
    apiTimings.value[name].push(duration)
    if (apiTimings.value[name].length > 100) {
      apiTimings.value[name] = apiTimings.value[name].slice(-100)
    }

    const metrics = performanceStats.value.recentMetrics
    metrics.push({ name, duration, timestamp: Date.now() })
    if (metrics.length > 50) {
      metrics.shift()
    }

    updateStats()
  }

  function updateStats() {
    const allDurations: number[] = []
    Object.values(apiTimings.value).forEach(timings => {
      allDurations.push(...timings)
    })

    if (allDurations.length > 0) {
      performanceStats.value.avgResponseTime = Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
      performanceStats.value.maxResponseTime = Math.max(...allDurations)
      performanceStats.value.minResponseTime = Math.min(...allDurations)
    }
  }

  function getApiStats(name: string) {
    const timings = apiTimings.value[name] || []
    if (timings.length === 0) {
      return { count: 0, avg: 0, max: 0, min: 0 }
    }
    return {
      count: timings.length,
      avg: Math.round(timings.reduce((a, b) => a + b, 0) / timings.length),
      max: Math.max(...timings),
      min: Math.min(...timings)
    }
  }

  function startMonitoring() {
    if (isMonitoring.value) return
    isMonitoring.value = true
  }

  function stopMonitoring() {
    isMonitoring.value = false
  }

  function resetStats() {
    performanceStats.value = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0,
      recentMetrics: []
    }
    apiTimings.value = {}
  }

  function getPerformanceReport() {
    return {
      stats: { ...performanceStats.value },
      apiDetails: Object.fromEntries(
        Object.entries(apiTimings.value).map(([name, timings]) => [
          name,
          {
            count: timings.length,
            avg: timings.length > 0 ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length) : 0,
            max: timings.length > 0 ? Math.max(...timings) : 0,
            min: timings.length > 0 ? Math.min(...timings) : 0
          }
        ])
      )
    }
  }

  onMounted(() => {
    startMonitoring()
  })

  onUnmounted(() => {
    stopMonitoring()
    if (intervalId) {
      clearInterval(intervalId)
    }
  })

  return {
    performanceStats,
    isMonitoring,
    recordMetric,
    getApiStats,
    startMonitoring,
    stopMonitoring,
    resetStats,
    getPerformanceReport
  }
}

export function monitorApiCall<T>(fn: () => Promise<T>, name: string): Promise<T> {
  const startTime = performance.now()
  
  return fn().then(result => {
    const duration = performance.now() - startTime
    const { recordMetric } = usePerformance()
    recordMetric(name, duration, true)
    return result
  }).catch(error => {
    const duration = performance.now() - startTime
    const { recordMetric } = usePerformance()
    recordMetric(name, duration, false)
    throw error
  })
}