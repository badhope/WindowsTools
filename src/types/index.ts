export interface Task {
  id: string
  name: string
  url: string
  crawlConfig: CrawlConfig
  fields: Field[]
  pagination: PaginationConfig
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error'
  createdAt: string
  updatedAt: string
}

export interface CrawlConfig {
  method: 'GET' | 'POST'
  headers: Record<string, string>
  proxy: string | null
  delay: [number, number]
  maxRetries: number
  timeout: number
  renderJs: boolean
}

export interface Field {
  id: string
  name: string
  selector: string
  selectorType: 'css' | 'xpath' | 'regex'
  attribute: 'text' | 'href' | 'src' | 'html' | string
  required: boolean
}

export interface PaginationConfig {
  enabled: boolean
  selector: string
  selectorType: 'css' | 'xpath'
  maxPages: number
  nextButtonText: string
}

export interface CrawlResult {
  taskId: string
  data: Record<string, any>[]
  total: number
  errors: string[]
  startTime: string
  endTime: string
}

export interface Proxy {
  id: string
  url: string
  status: 'active' | 'inactive' | 'testing'
  lastTest: string
  successRate: number
}

export interface Template {
  id: string
  name: string
  description: string
  category: string
  task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
  usageCount: number
  author: string
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel' | 'html'
  fileName: string
  includeHeaders: boolean
  encoding: 'utf-8' | 'gbk'
}
