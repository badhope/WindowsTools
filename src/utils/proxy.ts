export interface ProxyConfig {
  url: string
  username?: string
  password?: string
  timeout?: number
  retry?: number
  weight?: number
  type?: 'http' | 'https' | 'socks4' | 'socks5'
}

export interface ProxyPool {
  proxies: ProxyConfig[]
  currentIndex: number
  failedProxies: Map<string, number>
  successCount: Map<string, number>
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  timeout?: number
  retries?: number
  proxy?: ProxyConfig
  userAgent?: string
  referer?: string
  cookies?: string
}

export interface CrawlResult {
  success: boolean
  data?: any
  error?: string
  statusCode?: number
  headers?: Record<string, string>
  proxy?: string
  duration?: number
  timestamp?: number
}

export interface RateLimitConfig {
  maxRequests: number
  timeWindow: number
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
]

const REFERERS = [
  'https://www.google.com',
  'https://www.baidu.com',
  'https://www.bing.com',
  'https://search.yahoo.com',
  'https://www.sogou.com',
]

const defaultProxyPool: ProxyPool = {
  proxies: [],
  currentIndex: 0,
  failedProxies: new Map(),
  successCount: new Map()
}

let proxyPool = { ...defaultProxyPool }

export function createProxyPool(proxies: ProxyConfig[]): ProxyPool {
  proxyPool = {
    proxies: proxies.map(p => ({ ...p, weight: p.weight || 1 })),
    currentIndex: 0,
    failedProxies: new Map(),
    successCount: new Map()
  }
  return proxyPool
}

export function addProxy(proxy: ProxyConfig): void {
  proxyPool.proxies.push({ ...proxy, weight: proxy.weight || 1 })
}

export function removeProxy(url: string): void {
  proxyPool.proxies = proxyPool.proxies.filter(p => p.url !== url)
}

export function getProxy(): ProxyConfig | null {
  if (proxyPool.proxies.length === 0) return null

  const availableProxies = proxyPool.proxies.filter(p => {
    const failedCount = proxyPool.failedProxies.get(p.url) || 0
    return failedCount < 3
  })

  if (availableProxies.length === 0) {
    proxyPool.failedProxies.clear()
    return proxyPool.proxies[proxyPool.currentIndex % proxyPool.proxies.length]
  }

  const totalWeight = availableProxies.reduce((sum, p) => sum + (p.weight || 1), 0)
  let random = Math.random() * totalWeight

  for (const proxy of availableProxies) {
    random -= proxy.weight || 1
    if (random <= 0) {
      return proxy
    }
  }

  return availableProxies[0]
}

export function markProxySuccess(proxy: ProxyConfig): void {
  const count = proxyPool.successCount.get(proxy.url) || 0
  proxyPool.successCount.set(proxy.url, count + 1)
  proxyPool.failedProxies.delete(proxy.url)
}

export function markProxyFailed(proxy: ProxyConfig): void {
  const count = proxyPool.failedProxies.get(proxy.url) || 0
  proxyPool.failedProxies.set(proxy.url, count + 1)

  if (count >= 5) {
    proxyPool.proxies = proxyPool.proxies.filter(p => p.url !== proxy.url)
  }
}

export function getProxyStats(): { url: string; success: number; failed: number }[] {
  return proxyPool.proxies.map(p => ({
    url: p.url,
    success: proxyPool.successCount.get(p.url) || 0,
    failed: proxyPool.failedProxies.get(p.url) || 0
  }))
}

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

export function getRandomReferer(): string {
  return REFERERS[Math.floor(Math.random() * REFERERS.length)]
}

export async function fetchWithProxy(
  url: string,
  options: RequestOptions = {}
): Promise<CrawlResult> {
  const startTime = Date.now()
  const method = options.method || 'GET'
  const timeout = options.timeout || 30000
  const retries = options.retries ?? 3

  let lastError: string = ''
  let proxy: ProxyConfig | null = options.proxy || getProxy()

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      proxy = getProxy()
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const headers: Record<string, string> = {
        'User-Agent': options.userAgent || getRandomUserAgent(),
        ...options.headers
      }

      if (options.referer) {
        headers['Referer'] = options.referer
      } else {
        headers['Referer'] = getRandomReferer()
      }

      if (options.cookies) {
        headers['Cookie'] = options.cookies
      }

      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal
      }

      if (options.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
        headers['Content-Type'] = headers['Content-Type'] || 'application/json'
      }

      let response: Response
      const usedProxy: ProxyConfig | null = proxy
      let proxyResultUrl: string | undefined = undefined

      if (usedProxy) {
        const proxyHeaders: Record<string, string> = {}
        if (usedProxy.username && usedProxy.password) {
          const auth = btoa(`${usedProxy.username}:${usedProxy.password}`)
          proxyHeaders['Proxy-Authorization'] = `Basic ${auth}`
        }

        const proxyResponse = await fetch(usedProxy.url, {
          method: 'POST',
          headers: {
            ...proxyHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: url,
            method: method,
            headers: headers,
            body: fetchOptions.body
          })
        })

        clearTimeout(timeoutId)

        if (!proxyResponse.ok) {
          throw new Error(`Proxy error: ${proxyResponse.status}`)
        }

        const result = await proxyResponse.json()

        markProxySuccess(usedProxy)
        proxyResultUrl = usedProxy.url

        return {
          success: true,
          data: result.data,
          statusCode: result.statusCode,
          headers: result.headers,
          proxy: proxyResultUrl,
          duration: Date.now() - startTime,
          timestamp: Date.now()
        }
      } else {
        response = await fetch(url, fetchOptions)
        clearTimeout(timeoutId)
      }

      const data = await response.text()

      if (usedProxy) {
        markProxySuccess(usedProxy)
        proxyResultUrl = (usedProxy as ProxyConfig).url
      }

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      return {
        success: response.ok,
        data: data,
        statusCode: response.status,
        headers: responseHeaders,
        proxy: proxyResultUrl,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      }
    } catch (error: any) {
      lastError = error.message

      if (proxy) {
        markProxyFailed(proxy)
        proxy = getProxy()
      }

      if (attempt === retries) {
        return {
          success: false,
          error: lastError,
          proxy: proxy?.url,
          duration: Date.now() - startTime,
          timestamp: Date.now()
        }
      }
    }
  }

  return {
    success: false,
    error: lastError,
    proxy: proxy?.url,
    duration: Date.now() - startTime,
    timestamp: Date.now()
  }
}

export async function fetchMultiple(
  urls: string[],
  options: RequestOptions = {}
): Promise<CrawlResult[]> {
  const concurrency = options.retries ?? 5
  const results: CrawlResult[] = []

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(url => fetchWithProxy(url, options))
    )
    results.push(...batchResults)
  }

  return results
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(key: string, config: RateLimitConfig): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + config.timeWindow
    })
    return true
  }

  if (record.count >= config.maxRequests) {
    return false
  }

  record.count++
  return true
}

export function waitForRateLimit(key: string, config: RateLimitConfig): Promise<void> {
  return new Promise(resolve => {
    const check = () => {
      if (checkRateLimit(key, config)) {
        resolve()
      } else {
        setTimeout(check, 1000)
      }
    }
    check()
  })
}

export function encodeUrlParams(params: Record<string, any>): string {
  return Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

export function parseUrlParameters(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url)
    const params: Record<string, string> = {}
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value
    })
    return params
  } catch {
    return {}
  }
}

export function buildUrl(base: string, params: Record<string, any>): string {
  try {
    const urlObj = new URL(base)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.set(key, String(value))
      }
    })
    return urlObj.toString()
  } catch {
    const queryString = encodeUrlParams(params)
    return queryString ? `${base}?${queryString}` : base
  }
}

export function detectEncoding(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data.slice(0, 4))

  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'utf-8'
  }
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return 'utf-16le'
  }
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return 'utf-16be'
  }

  return 'utf-8'
}

export function followRedirects(url: string, maxRedirects = 10): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let currentUrl = url
    let redirects = 0

    while (redirects < maxRedirects) {
      try {
        const response = await fetch(currentUrl, {
          method: 'HEAD',
          redirect: 'manual'
        })

        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('Location')
          if (!location) break
          currentUrl = new URL(location, currentUrl).toString()
          redirects++
        } else {
          break
        }
      } catch (error) {
        reject(error)
        return
      }
    }

    resolve(currentUrl)
  })
}

export function detectAjaxPatterns(url: string): { isAjax: boolean; pattern: string } {
  const ajaxIndicators = [
    /\/api\//i,
    /\/ajax\//i,
    /\?.*=JSON/i,
    /\.json$/i,
    /xhr/i,
    /fetch/i
  ]

  for (const pattern of ajaxIndicators) {
    if (pattern.test(url)) {
      return { isAjax: true, pattern: pattern.source }
    }
  }

  return { isAjax: false, pattern: '' }
}
