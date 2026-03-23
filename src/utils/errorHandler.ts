export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical'

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  category: string
  message: string
  details?: Record<string, any>
  stack?: string
}

export interface ErrorInfo {
  code: string
  message: string
  suggestion?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export const ERROR_CODES = {
  NETWORK_ERROR: 'E001',
  PARSE_ERROR: 'E002',
  SELECTOR_ERROR: 'E003',
  EXPORT_ERROR: 'E004',
  STORAGE_ERROR: 'E005',
  VALIDATION_ERROR: 'E006',
  TIMEOUT_ERROR: 'E007',
  AUTH_ERROR: 'E008',
  RATE_LIMIT_ERROR: 'E009',
  UNKNOWN_ERROR: 'E999'
}

export const ERROR_MESSAGES: Record<string, ErrorInfo> = {
  [ERROR_CODES.NETWORK_ERROR]: {
    code: ERROR_CODES.NETWORK_ERROR,
    message: '网络请求失败',
    suggestion: '请检查网络连接或目标URL是否正确，尝试使用代理或增加超时时间',
    severity: 'high'
  },
  [ERROR_CODES.PARSE_ERROR]: {
    code: ERROR_CODES.PARSE_ERROR,
    message: '页面解析失败',
    suggestion: '请检查选择器是否正确，尝试使用其他选择器或调整属性类型',
    severity: 'medium'
  },
  [ERROR_CODES.SELECTOR_ERROR]: {
    code: ERROR_CODES.SELECTOR_ERROR,
    message: '选择器无效或匹配失败',
    suggestion: '请验证CSS或XPath选择器语法，确保选择器能匹配到目标元素',
    severity: 'medium'
  },
  [ERROR_CODES.EXPORT_ERROR]: {
    code: ERROR_CODES.EXPORT_ERROR,
    message: '数据导出失败',
    suggestion: '请检查导出格式和文件路径，确保有足够的存储空间',
    severity: 'medium'
  },
  [ERROR_CODES.STORAGE_ERROR]: {
    code: ERROR_CODES.STORAGE_ERROR,
    message: '本地存储操作失败',
    suggestion: '请检查浏览器存储空间，尝试清理缓存或导出数据后重试',
    severity: 'high'
  },
  [ERROR_CODES.VALIDATION_ERROR]: {
    code: ERROR_CODES.VALIDATION_ERROR,
    message: '数据验证失败',
    suggestion: '请检查输入数据的格式和类型，确保符合预期要求',
    severity: 'low'
  },
  [ERROR_CODES.TIMEOUT_ERROR]: {
    code: ERROR_CODES.TIMEOUT_ERROR,
    message: '请求超时',
    suggestion: '请增加超时时间设置，或检查目标服务器是否响应缓慢',
    severity: 'medium'
  },
  [ERROR_CODES.AUTH_ERROR]: {
    code: ERROR_CODES.AUTH_ERROR,
    message: '认证/授权失败',
    suggestion: '请检查Cookie、Token或认证信息是否正确或已过期',
    severity: 'high'
  },
  [ERROR_CODES.RATE_LIMIT_ERROR]: {
    code: ERROR_CODES.RATE_LIMIT_ERROR,
    message: '请求频率超限',
    suggestion: '请增加请求间隔时间，或使用代理池分散请求',
    severity: 'medium'
  },
  [ERROR_CODES.UNKNOWN_ERROR]: {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: '未知错误',
    suggestion: '请查看详细错误信息，或联系技术支持',
    severity: 'medium'
  }
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 500
  private listeners: Array<(log: LogEntry) => void> = []
  private persistenceKey = 'visual-spider-logs'

  constructor() {
    this.loadFromStorage()
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  private getTimestamp(): string {
    return new Date().toISOString()
  }

  private persist(): void {
    try {
      const logsToSave = this.logs.slice(-this.maxLogs)
      localStorage.setItem(this.persistenceKey, JSON.stringify(logsToSave))
    } catch (e) {
      console.error('Failed to persist logs:', e)
    }
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.persistenceKey)
      if (saved) {
        this.logs = JSON.parse(saved)
      }
    } catch (e) {
      console.error('Failed to load logs:', e)
    }
  }

  log(level: LogLevel, category: string, message: string, details?: Record<string, any>): string {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: this.getTimestamp(),
      level,
      category,
      message,
      details,
      stack: level === 'error' || level === 'critical' ? new Error().stack : undefined
    }

    this.logs.push(entry)

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    this.persist()
    this.notifyListeners(entry)

    const prefix = `[${level.toUpperCase()}] [${category}]`
    switch (level) {
      case 'debug':
        console.debug(prefix, message, details || '')
        break
      case 'info':
        console.info(prefix, message, details || '')
        break
      case 'warn':
        console.warn(prefix, message, details || '')
        break
      case 'error':
      case 'critical':
        console.error(prefix, message, details || '', entry.stack || '')
        break
    }

    return entry.id
  }

  debug(category: string, message: string, details?: Record<string, any>): string {
    return this.log('debug', category, message, details)
  }

  info(category: string, message: string, details?: Record<string, any>): string {
    return this.log('info', category, message, details)
  }

  warn(category: string, message: string, details?: Record<string, any>): string {
    return this.log('warn', category, message, details)
  }

  error(category: string, message: string, details?: Record<string, any>): string {
    return this.log('error', category, message, details)
  }

  critical(category: string, message: string, details?: Record<string, any>): string {
    return this.log('critical', category, message, details)
  }

  getLogs(options?: {
    level?: LogLevel
    category?: string
    startTime?: string
    endTime?: string
    limit?: number
  }): LogEntry[] {
    let filtered = [...this.logs]

    if (options?.level) {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical']
      const levelIndex = levels.indexOf(options.level)
      filtered = filtered.filter(log => levels.indexOf(log.level) >= levelIndex)
    }

    if (options?.category) {
      filtered = filtered.filter(log => log.category === options.category)
    }

    if (options?.startTime) {
      filtered = filtered.filter(log => log.timestamp >= options.startTime!)
    }

    if (options?.endTime) {
      filtered = filtered.filter(log => log.timestamp <= options.endTime!)
    }

    if (options?.limit) {
      filtered = filtered.slice(-options.limit)
    }

    return filtered
  }

  clearLogs(): void {
    this.logs = []
    localStorage.removeItem(this.persistenceKey)
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  subscribe(listener: (log: LogEntry) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(log: LogEntry): void {
    this.listeners.forEach(listener => {
      try {
        listener(log)
      } catch (e) {
        console.error('Log listener error:', e)
      }
    })
  }

  getStats(): Record<LogLevel, number> {
    const stats: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0
    }

    this.logs.forEach(log => {
      stats[log.level]++
    })

    return stats
  }
}

export const logger = new Logger()

export function handleError(error: unknown, defaultCode: string = ERROR_CODES.UNKNOWN_ERROR): ErrorInfo {
  let errorInfo: ErrorInfo
  let originalMessage: string
  let details: Record<string, any> = {}

  if (typeof error === 'string') {
    originalMessage = error
  } else if (error instanceof Error) {
    originalMessage = error.message
    details.stack = error.stack
  } else if (typeof error === 'object' && error !== null) {
    originalMessage = (error as any).message || JSON.stringify(error)
    details = error as Record<string, any>
  } else {
    originalMessage = String(error)
  }

  const matchingCode = Object.keys(ERROR_MESSAGES).find(code => {
    const info = ERROR_MESSAGES[code]
    return originalMessage.toLowerCase().includes(info.message.toLowerCase()) ||
           originalMessage.toLowerCase().includes(code.toLowerCase())
  }) || defaultCode

  errorInfo = { ...ERROR_MESSAGES[matchingCode] }
  errorInfo.message = originalMessage

  logger.error('ErrorHandler', originalMessage, {
    code: errorInfo.code,
    severity: errorInfo.severity,
    ...details
  })

  return errorInfo
}

export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL不能为空' }
  }

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: '仅支持HTTP和HTTPS协议' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: '无效的URL格式' }
  }
}

export function validateSelector(selector: string, type: 'css' | 'xpath'): { valid: boolean; error?: string } {
  if (!selector || !selector.trim()) {
    return { valid: false, error: '选择器不能为空' }
  }

  if (type === 'css') {
    if (selector.includes('<>') || selector.includes('{}')) {
      return { valid: false, error: 'CSS选择器包含非法字符' }
    }
  }

  if (type === 'xpath') {
    if (!selector.startsWith('//') && !selector.startsWith('/') && !selector.startsWith('(')) {
      return { valid: false, error: 'XPath选择器必须以/或//开头' }
    }
  }

  return { valid: true }
}

export function validateFieldConfig(field: { name: string; selector: string; selectorType: string }): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!field.name || !field.name.trim()) {
    errors.push('字段名称不能为空')
  }

  const selectorValidation = validateSelector(field.selector, field.selectorType as 'css' | 'xpath')
  if (!selectorValidation.valid) {
    errors.push(selectorValidation.error!)
  }

  return { valid: errors.length === 0, errors }
}
