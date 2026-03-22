export interface UrlComponents {
  protocol: string
  host: string
  port: string
  path: string
  query: Record<string, string>
  hash: string
  raw: string
}

export interface ParsedUrl {
  original: string
  components: UrlComponents
  isAjax: boolean
  isRedirect: boolean
  redirectChain: string[]
  encoding: string
  contentType?: string
}

export interface AntiCrawlConfig {
  userAgent?: string
  cookie?: string
  referer?: string
  acceptLanguage?: string
  acceptEncoding?: string
}

export interface AntiCrawlResult {
  success: boolean
  html?: string
  error?: string
  statusCode?: number
  finalUrl?: string
  cookies?: Record<string, string>
}

export function parseUrl(url: string): ParsedUrl {
  const components: UrlComponents = {
    protocol: '',
    host: '',
    port: '',
    path: '',
    query: {},
    hash: '',
    raw: url
  }

  try {
    const urlObj = new URL(url)

    components.protocol = urlObj.protocol.replace(':', '')
    components.host = urlObj.hostname
    components.port = urlObj.port
    components.path = urlObj.pathname
    components.hash = urlObj.hash.replace('#', '')

    urlObj.searchParams.forEach((value, key) => {
      components.query[key] = value
    })
  } catch (e) {
    const match = url.match(/^(?:([a-z]+):)?\/?\/?(?:([^:\/?#]+)(?::(\d+))?)?(\/[^?#]*)?(?:\?([^#]*))?(?:#(.*))?/)
    if (match) {
      if (match[1]) components.protocol = match[1]
      if (match[2]) components.host = match[2]
      if (match[3]) components.port = match[3]
      if (match[4]) components.path = match[4]
      if (match[5]) {
        match[5].split('&').forEach(pair => {
          const [k, v] = pair.split('=')
          if (k) components.query[decodeURIComponent(k)] = decodeURIComponent(v || '')
        })
      }
      if (match[6]) components.hash = match[6]
    }
  }

  const ajaxPatterns = [
    /\/api\//i, /\/ajax\//i, /xhr/i, /_render/i,
    /\.json$/i, /\.xml$/i, /\?.*=JSON/i
  ]

  const redirectPatterns = [
    /url=/i, /redirect=/i, /goto=/i, /link=/i,
    /target=/i, /dest=/i, /next=/i, /continue=/i
  ]

  const isAjax = ajaxPatterns.some(p => p.test(url))
  const isRedirect = redirectPatterns.some(p => p.test(url)) ||
    (components.query && Object.keys(components.query).some(k =>
      /url|redirect|goto|link/i.test(k)
    ))

  return {
    original: url,
    components,
    isAjax,
    isRedirect,
    redirectChain: [],
    encoding: 'utf-8'
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
    const queryString = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    return queryString ? `${base}?${queryString}` : base
  }
}

export function encodeUrlParam(value: string, encoding = 'encodeURIComponent'): string {
  switch (encoding) {
    case 'encodeURIComponent':
      return encodeURIComponent(value)
    case 'base64':
      return btoa(encodeURIComponent(value))
    case 'unicode':
      return Array.from(value).map(c => `%u${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join('')
    default:
      return encodeURIComponent(value)
  }
}

export function decodeUrlParam(value: string, encoding = 'encodeURIComponent'): string {
  switch (encoding) {
    case 'encodeURIComponent':
      return decodeURIComponent(value)
    case 'base64':
      return decodeURIComponent(atob(value))
    default:
      return decodeURIComponent(value)
  }
}

export function parseQueryString(query: string): Record<string, string> {
  const params: Record<string, string> = {}

  query.replace(/^\?/, '').split('&').forEach(pair => {
    const [key, value] = pair.split('=')
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || '')
    }
  })

  return params
}

export function buildQueryString(params: Record<string, any>): string {
  return Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

export function extractBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
  } catch {
    return url.split('?')[0].split('#')[0]
  }
}

export function resolveRelativeUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).toString()
  } catch {
    if (relative.startsWith('//')) {
      return `https:${relative}`
    }
    if (relative.startsWith('/')) {
      const baseUrl = extractBaseUrl(base)
      return baseUrl + relative
    }
    return base.replace(/\/[^\/]*$/, '/') + relative
  }
}

export interface DynamicParam {
  name: string
  pattern: string
  generationType: 'timestamp' | 'random' | 'sequence' | 'md5' | 'sha1' | 'base64' | 'custom'
  options?: {
    min?: number
    max?: number
    length?: number
    prefix?: string
    suffix?: string
    customFn?: string
  }
}

let sequenceCounter = 0

export function generateDynamicParam(param: DynamicParam): string {
  const { pattern, generationType, options = {} } = param

  switch (generationType) {
    case 'timestamp':
      return String(Date.now())

    case 'random':
      const min = options.min || 0
      const max = options.max || 1000000
      return String(Math.floor(Math.random() * (max - min + 1)) + min)

    case 'sequence':
      sequenceCounter++
      const prefix = options.prefix || ''
      const suffix = options.suffix || ''
      return `${prefix}${sequenceCounter}${suffix}`

    case 'md5':
      return md5Hash(pattern + Date.now())

    case 'sha1':
      return sha1Hash(pattern + Date.now())

    case 'base64':
      return btoa(`${pattern}_${Date.now()}`)

    case 'custom':
      if (options.customFn) {
        try {
          const fn = new Function('t', 'r', options.customFn)
          return fn(Date.now(), Math.random)
        } catch {
          return pattern
        }
      }
      return pattern

    default:
      return pattern
  }
}

function md5Hash(str: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3]
    a = ff(a, b, c, d, k[0], 7, -680876936)
    d = ff(d, a, b, c, k[1], 12, -389564586)
    c = ff(c, d, a, b, k[2], 17, 606105819)
    b = ff(b, c, d, a, k[3], 22, -1044525330)
    a = ff(a, b, c, d, k[4], 7, -176418897)
    d = ff(d, a, b, c, k[5], 12, 1200080426)
    c = ff(c, d, a, b, k[6], 17, -1473231341)
    b = ff(b, c, d, a, k[7], 22, -45705983)
    a = ff(a, b, c, d, k[8], 7, 1770035416)
    d = ff(d, a, b, c, k[9], 12, -1958414417)
    c = ff(c, d, a, b, k[10], 17, -42063)
    b = ff(b, c, d, a, k[11], 22, -1990404162)
    a = ff(a, b, c, d, k[12], 7, 1804603682)
    d = ff(d, a, b, c, k[13], 12, -40341101)
    c = ff(c, d, a, b, k[14], 17, -1502002290)
    b = ff(b, c, d, a, k[15], 22, 1236535329)
    a = gg(a, b, c, d, k[1], 5, -165796510)
    d = gg(d, a, b, c, k[6], 9, -1069501632)
    c = gg(c, d, a, b, k[11], 14, 643717713)
    b = gg(b, c, d, a, k[0], 20, -373897302)
    a = gg(a, b, c, d, k[5], 5, -701558691)
    d = gg(d, a, b, c, k[10], 9, 38016083)
    c = gg(c, d, a, b, k[15], 14, -660478335)
    b = gg(b, c, d, a, k[4], 20, -405537848)
    a = gg(a, b, c, d, k[9], 5, 568446438)
    d = gg(d, a, b, c, k[14], 9, -1019803690)
    c = gg(c, d, a, b, k[3], 14, -187363961)
    b = gg(b, c, d, a, k[8], 20, 1163531501)
    a = gg(a, b, c, d, k[13], 5, -1444681467)
    d = gg(d, a, b, c, k[2], 9, -51403784)
    c = gg(c, d, a, b, k[7], 14, 1735328473)
    b = gg(b, c, d, a, k[12], 20, -1926607734)
    a = hh(a, b, c, d, k[5], 4, -378558)
    d = hh(d, a, b, c, k[8], 11, -2022574463)
    c = hh(c, d, a, b, k[11], 16, 1839030562)
    b = hh(b, c, d, a, k[14], 23, -35309556)
    a = hh(a, b, c, d, k[1], 4, -1530992060)
    d = hh(d, a, b, c, k[4], 11, 1272893353)
    c = hh(c, d, a, b, k[7], 16, -155497632)
    b = hh(b, c, d, a, k[10], 23, -1094730640)
    a = hh(a, b, c, d, k[13], 4, 681279174)
    d = hh(d, a, b, c, k[0], 11, -358537222)
    c = hh(c, d, a, b, k[3], 16, -722521979)
    b = hh(b, c, d, a, k[6], 23, 76029189)
    a = hh(a, b, c, d, k[9], 4, -640364487)
    d = hh(d, a, b, c, k[12], 11, -421815835)
    c = hh(c, d, a, b, k[15], 16, 530742520)
    b = hh(b, c, d, a, k[2], 23, -995338651)
    a = ii(a, b, c, d, k[0], 6, -198630844)
    d = ii(d, a, b, c, k[7], 10, 1126891415)
    c = ii(c, d, a, b, k[14], 15, -1416354905)
    b = ii(b, c, d, a, k[3], 21, -57434055)
    a = ii(a, b, c, d, k[10], 6, 1700485571)
    d = ii(d, a, b, c, k[1], 10, -1894986606)
    c = ii(c, d, a, b, k[8], 15, -1051523)
    b = ii(b, c, d, a, k[15], 21, -2054922799)
    a = ii(a, b, c, d, k[6], 6, 1873313359)
    d = ii(d, a, b, c, k[13], 10, -30611744)
    c = ii(c, d, a, b, k[4], 15, -1560198380)
    b = ii(b, c, d, a, k[11], 21, 1309151649)
    a = ii(a, b, c, d, k[2], 6, -145523070)
    d = ii(d, a, b, c, k[9], 10, -1120210379)
    c = ii(c, d, a, b, k[0], 15, 718787259)
    b = ii(b, c, d, a, k[7], 21, -343485551)
    x[0] = add32(a, x[0])
    x[1] = add32(b, x[1])
    x[2] = add32(c, x[2])
    x[3] = add32(d, x[3])
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t))
    return add32((a << s) | (a >>> (32 - s)), b)
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t)
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t)
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t)
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t)
  }

  function md51(s: string) {
    const n = s.length
    const state = [1732584193, -271733879, -1732584194, 271733878]
    let i: number
    for (i = 64; i <= n; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)))
    }
    s = s.substring(i - 64)
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    for (i = 0; i < s.length; i++) {
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3)
    }
    tail[i >> 2] |= 0x80 << ((i % 4) << 3)
    if (i > 55) {
      md5cycle(state, tail)
      for (i = 0; i < 16; i++) tail[i] = 0
    }
    tail[14] = n * 8
    md5cycle(state, tail)
    return state
  }

  function md5blk(s: string): number[] {
    const md5blks: number[] = []
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24)
    }
    return md5blks
  }

  const hex_chr = '0123456789abcdef'.split('')

  function rhex(n: number) {
    let s = ''
    for (let j = 0; j < 4; j++) {
      s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F]
    }
    return s
  }

  function hex(x: (string | number)[]): string {
    let result = ''
    for (let i = 0; i < x.length; i++) result += String(rhex(Number(x[i])))
    return result
  }

  function add32(a: number, b: number) {
    return (a + b) & 0xFFFFFFFF
  }

  return hex(md51(str))
}

function sha1Hash(str: string): string {
  function rotl(n: number, s: number) { return (n << s) | (n >>> (32 - s)) }
  function toHex(n: number) {
    let s = ''
    for (let j = 0; j < 32; j += 8) {
      s += ((n >>> j) & 255).toString(16).padStart(2, '0')
    }
    return s
  }

  const h = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0]
  const ml = str.length * 8
  str += '\x80'

  while ((str.length % 64) !== 56) str += '\x00'
  str += String.fromCharCode(0) + String.fromCharCode(0) + String.fromCharCode(0) + String.fromCharCode(0)
  str += String.fromCharCode((ml >>> 24) & 255) + String.fromCharCode((ml >>> 16) & 255) + String.fromCharCode((ml >>> 8) & 255) + String.fromCharCode(ml & 255)

  for (let i = 0; i < str.length; i += 64) {
    const k: number[] = []
    for (let j = 0; j < 16; j++) {
      k.push(str.charCodeAt(i + j * 4) * 0x1000000 + str.charCodeAt(i + j * 4 + 1) * 0x10000 + str.charCodeAt(i + j * 4 + 2) * 0x100 + str.charCodeAt(i + j * 4 + 3))
    }

    for (let j = 16; j < 80; j++) {
      k[j] = rotl(k[j - 3] ^ k[j - 8] ^ k[j - 14] ^ k[j - 16], 1)
    }

    let [a, b, c, d, e] = h

    for (let j = 0; j < 80; j++) {
      let f: number, x: number
      if (j < 20) { f = (b & c) | ((~b) & d); x = 0x5A827999 }
      else if (j < 40) { f = b ^ c ^ d; x = 0x6ED9EBA1 }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d); x = 0x8F1BBCDC }
      else { f = b ^ c ^ d; x = 0xCA62C1D6 }

      const temp = (rotl(a, 5) + f + e + x + k[j]) >>> 0
      e = d
      d = c
      c = rotl(b, 30)
      b = a
      a = temp
    }

    h[0] = (h[0] + a) >>> 0
    h[1] = (h[1] + b) >>> 0
    h[2] = (h[2] + c) >>> 0
    h[3] = (h[3] + d) >>> 0
    h[4] = (h[4] + e) >>> 0
  }

  return h.map(v => toHex(v >>> 0)).join('')
}

export function obfuscateUrl(url: string, type: 'base64' | 'unicode' | 'url'): string {
  switch (type) {
    case 'base64':
      return btoa(url)
    case 'unicode':
      return Array.from(url).map(c => `%u${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join('')
    case 'url':
      return encodeURIComponent(url)
    default:
      return url
  }
}

export function deobfuscateUrl(url: string, type: 'base64' | 'unicode' | 'url'): string {
  switch (type) {
    case 'base64':
      return atob(url)
    case 'unicode':
      return url.replace(/%u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    case 'url':
      return decodeURIComponent(url)
    default:
      return url
  }
}

export function followRedirectChain(url: string, maxRedirects = 10): Promise<string[]> {
  const chain: string[] = []
  let currentUrl = url

  return new Promise(async (resolve) => {
    for (let i = 0; i < maxRedirects; i++) {
      chain.push(currentUrl)

      try {
        const response = await fetch(currentUrl, {
          method: 'HEAD',
          redirect: 'manual'
        })

        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('Location')
          if (!location) break
          currentUrl = new URL(location, currentUrl).toString()
        } else {
          break
        }
      } catch {
        break
      }
    }

    resolve(chain)
  })
}

export function detectAjax(url: string): { isAjax: boolean; pattern: string } {
  const ajaxPatterns = [
    { pattern: /\/api\//i, name: 'REST API' },
    { pattern: /\/ajax\//i, name: 'AJAX Endpoint' },
    { pattern: /xhr/i, name: 'XMLHttpRequest' },
    { pattern: /_render/i, name: 'Client-side Render' },
    { pattern: /\.json$/i, name: 'JSON Response' },
    { pattern: /\.xml$/i, name: 'XML Response' },
    { pattern: /\?.*=JSON/i, name: 'JSON Parameter' }
  ]

  for (const { pattern } of ajaxPatterns) {
    if (pattern.test(url)) {
      return { isAjax: true, pattern: pattern.source }
    }
  }

  return { isAjax: false, pattern: '' }
}

export function detectUrlSignature(url: string): {
  hasTimestamp: boolean
  hasSignature: boolean
  hasToken: boolean
  isObfuscated: boolean
  signatureType?: string
} {
  const timestampPatterns = [
    /([?&]t(ime)?=|\bt=\d{10,}|\btimestamp=)/i,
    /([?&]_=|\b_=\d+)/i
  ]

  const signaturePatterns = [
    /([?&]sign(ature)?=|\bsig=)/i,
    /([?&]token=)/i,
    /([?&]hash=)/i,
    /([?&]key=)/i
  ]

  const obfuscatedPatterns = [
    /%u/i,
    /base64/i,
    /^[A-Za-z0-9+/=]{20,}$/
  ]

  const hasTimestamp = timestampPatterns.some(p => p.test(url))
  const hasSignature = signaturePatterns.some(p => p.test(url))
  const hasToken = /token=/i.test(url) || /auth=/i.test(url)
  const isObfuscated = obfuscatedPatterns.some(p => p.test(url))

  let signatureType: string | undefined
  if (/sign(ature)?=/i.test(url)) signatureType = 'signature'
  else if (/token=/i.test(url)) signatureType = 'token'
  else if (/hash=/i.test(url)) signatureType = 'hash'
  else if (/key=/i.test(url)) signatureType = 'key'

  return { hasTimestamp, hasSignature, hasToken, isObfuscated, signatureType }
}

export interface CaptchaInfo {
  type: 'slider' | 'image' | 'text' | 'sms' | 'email' | 'unknown'
  severity: 'low' | 'medium' | 'high'
  bypassStrategy?: string
}

export function detectCaptcha(html: string): CaptchaInfo | null {
  const captchaIndicators = [
    { pattern: /captcha|验证码|验证|验证图片/i, type: 'image' as const, severity: 'medium' as const },
    { pattern: /slider|滑动|拼图|验证/i, type: 'slider' as const, severity: 'high' as const },
    { pattern: /click|点击|验证/i, type: 'text' as const, severity: 'low' as const },
    { pattern: /sms|短信|手机验证/i, type: 'sms' as const, severity: 'high' as const },
    { pattern: /email|邮箱验证/i, type: 'email' as const, severity: 'high' as const }
  ]

  for (const indicator of captchaIndicators) {
    if (indicator.pattern.test(html)) {
      return {
        type: indicator.type,
        severity: indicator.severity,
        bypassStrategy: getBypassStrategy(indicator.type)
      }
    }
  }

  return null
}

function getBypassStrategy(type: string): string {
  const strategies: Record<string, string> = {
    slider: '使用图像识别或第三方验证码解决服务',
    image: '使用 OCR 识别或人工打码平台',
    text: '基于规则的自动识别或机器学习模型',
    sms: '需要接码平台或人工接收',
    email: '需要临时邮箱服务',
    unknown: '建议使用 Puppeteer 模拟真实用户行为'
  }
  return strategies[type] || '无法自动绕过'
}

export function generateAntiCrawlHeaders(config: AntiCrawlConfig = {}): Record<string, string> {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
  ]

  const acceptLanguages = [
    'zh-CN,zh;q=0.9,en;q=0.8',
    'en-US,en;q=0.9,zh-CN;q=0.8',
    'zh-CN,zh;q=0.9',
    'en;q=0.9'
  ]

  const acceptEncodings = [
    'gzip, deflate, br',
    'gzip, deflate',
    'deflate, gzip'
  ]

  return {
    'User-Agent': config.userAgent || userAgents[Math.floor(Math.random() * userAgents.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': config.acceptLanguage || acceptLanguages[Math.floor(Math.random() * acceptLanguages.length)],
    'Accept-Encoding': config.acceptEncoding || acceptEncodings[Math.floor(Math.random() * acceptEncodings.length)],
    'Connection': 'keep-alive',
    'Cache-Control': 'max-age=0',
    ...(config.cookie ? { 'Cookie': config.cookie } : {}),
    ...(config.referer ? { 'Referer': config.referer } : {})
  }
}

export function simulateHumanBehavior(delay = true): number {
  const delays = [100, 200, 300, 400, 500, 600, 800, 1000]
  const delayTime = delays[Math.floor(Math.random() * delays.length)]
  if (delay) {
    return new Promise(resolve => setTimeout(resolve, delayTime)).then(() => delayTime) as unknown as number
  }
  return delayTime
}

export function parseRobotsTxt(robotsTxt: string): {
  allowed: Record<string, string[]>
  disallowed: Record<string, string[]>
  sitemaps: string[]
  crawlDelay: Record<string, number>
} {
  const allowed: Record<string, string[]> = {}
  const disallowed: Record<string, string[]> = {}
  const sitemaps: string[] = []
  const crawlDelay: Record<string, number> = {}
  let currentUserAgent = '*'

  robotsTxt.split('\n').forEach(line => {
    line = line.trim()

    if (line.startsWith('#') || !line) return

    const lowerLine = line.toLowerCase()

    if (lowerLine.startsWith('user-agent:')) {
      currentUserAgent = line.split(':')[1].trim()
      if (!allowed[currentUserAgent]) allowed[currentUserAgent] = []
      if (!disallowed[currentUserAgent]) disallowed[currentUserAgent] = []
    } else if (lowerLine.startsWith('allow:')) {
      const path = line.split(':')[1].trim()
      if (!allowed[currentUserAgent]) allowed[currentUserAgent] = []
      allowed[currentUserAgent].push(path)
    } else if (lowerLine.startsWith('disallow:')) {
      const path = line.split(':')[1].trim()
      if (!disallowed[currentUserAgent]) disallowed[currentUserAgent] = []
      disallowed[currentUserAgent].push(path)
    } else if (lowerLine.startsWith('sitemap:')) {
      sitemaps.push(line.split(':')[1].trim())
    } else if (lowerLine.startsWith('crawl-delay:')) {
      const delay = parseFloat(line.split(':')[1])
      if (!isNaN(delay)) crawlDelay[currentUserAgent] = delay
    }
  })

  return { allowed, disallowed, sitemaps, crawlDelay }
}

export function isUrlAllowed(url: string, robotsTxt: string): boolean {
  const parsed = parseRobotsTxt(robotsTxt)
  let currentUrl = url

  try {
    const urlObj = new URL(url)
    currentUrl = urlObj.pathname
  } catch {
    return true
  }

  const userAgents = ['*', 'googlebot', 'bingbot', 'baiduspider', 'general']

  for (const ua of userAgents) {
    if (parsed.disallowed[ua]) {
      for (const pattern of parsed.disallowed[ua]) {
        if (pattern === '/') return false
        if (currentUrl.startsWith(pattern)) return false
      }
    }
  }

  return true
}
