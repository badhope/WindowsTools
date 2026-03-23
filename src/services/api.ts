import axios, { AxiosInstance } from 'axios'

export interface ServerStatus {
  status: 'ok' | 'error'
  timestamp: string
  version: string
}

export interface EnvStatus {
  ready: boolean
  node: { installed: boolean; version: string | null }
  npm: { installed: boolean; version: string | null }
  chromium: { installed: boolean; path: string | null; canLaunch: boolean }
  puppeteer: { installed: boolean; version: string | null }
  system: { platform: string; arch: string; memory: number | null }
  issues: string[]
  recommendations: string[]
}

export interface CrawlResult {
  success: boolean
  taskId: string
  duration: number
  data: any
}

export interface CrawlConfig {
  url: string
  method: 'GET' | 'POST'
  headers?: Record<string, string>
  data?: any
  useBrowser: boolean
  waitForSelector?: string
  timeout?: number
  selectors?: Array<{
    name: string
    selector: string
    type: 'css' | 'xpath' | 'regex'
    attribute?: 'text' | 'href' | 'src' | 'html'
  }>
  pagination?: {
    enabled: boolean
    selector: string
    maxPages: number
    type: 'css' | 'xpath'
  }
  proxy?: string
}

class ApiService {
  private client: AxiosInstance
  private serverUrl: string = 'http://localhost:3000'

  constructor() {
    this.client = axios.create({
      baseURL: this.serverUrl,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  setServerUrl(url: string) {
    this.serverUrl = url
    this.client.defaults.baseURL = url
  }

  getServerUrl(): string {
    return this.serverUrl
  }

  async checkHealth(): Promise<ServerStatus | null> {
    try {
      const response = await this.client.get('/api/health')
      return response.data
    } catch (error) {
      return null
    }
  }

  async getStatus(): Promise<EnvStatus | null> {
    try {
      const response = await this.client.get('/api/status')
      return response.data
    } catch (error) {
      return null
    }
  }

  async setupEnvironment(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.post('/api/status/setup')
      return response.data
    } catch (error: any) {
      return { success: false, message: error.message }
    }
  }

  async crawl(config: CrawlConfig): Promise<CrawlResult> {
    const response = await this.client.post('/api/crawler/crawl', config)
    return response.data
  }

  async getTask(taskId: string) {
    const response = await this.client.get(`/api/crawler/task/${taskId}`)
    return response.data
  }

  async getTasks() {
    const response = await this.client.get('/api/crawler/tasks')
    return response.data
  }

  async deleteTask(taskId: string) {
    const response = await this.client.delete(`/api/crawler/task/${taskId}`)
    return response.data
  }

  async takeScreenshot(url: string, fullPage?: boolean, selector?: string) {
    const response = await this.client.post('/api/crawler/screenshot', {
      url,
      fullPage,
      selector
    })
    return response.data
  }

  async launchBrowser(headless?: boolean): Promise<{ success: boolean; version?: string }> {
    const response = await this.client.post('/api/browser/launch', { headless })
    return response.data
  }

  async closeBrowser(): Promise<{ success: boolean }> {
    const response = await this.client.post('/api/browser/close')
    return response.data
  }

  async getBrowserStatus() {
    const response = await this.client.get('/api/browser/status')
    return response.data
  }

  async navigateToPage(url: string) {
    const response = await this.client.post('/api/browser/page/navigate', { url })
    return response.data
  }

  async evaluateScript(script: string) {
    const response = await this.client.post('/api/browser/evaluate', { script })
    return response.data
  }

  async getPageHtml(includeStyles?: boolean) {
    const response = await this.client.post('/api/browser/html', { includeStyles })
    return response.data
  }

  async getCookies() {
    const response = await this.client.post('/api/browser/cookies', { action: 'get' })
    return response.data
  }

  async setCookies(cookies: any[]) {
    const response = await this.client.post('/api/browser/cookies', { action: 'set', cookies })
    return response.data
  }

  async waitForSelector(selector: string, timeout?: number) {
    const response = await this.client.post('/api/browser/wait', { selector, timeout })
    return response.data
  }

  async getProxyList() {
    const response = await this.client.get('/api/proxy/list')
    return response.data
  }

  async addProxy(proxy: { host: string; port: number; protocol?: string; username?: string; password?: string }) {
    const response = await this.client.post('/api/proxy/add', proxy)
    return response.data
  }

  async removeProxy(id: string) {
    const response = await this.client.delete(`/api/proxy/remove/${id}`)
    return response.data
  }

  async testProxy(id: string) {
    const response = await this.client.post(`/api/proxy/test/${id}`)
    return response.data
  }

  async testAllProxies() {
    const response = await this.client.post('/api/proxy/test-all')
    return response.data
  }

  async getNextProxy() {
    const response = await this.client.get('/api/proxy/next')
    return response.data
  }

  async loadProxiesFromFile(content: string, format?: string) {
    const response = await this.client.post('/api/proxy/load-file', { content, format })
    return response.data
  }
}

export const apiService = new ApiService()
export default apiService
