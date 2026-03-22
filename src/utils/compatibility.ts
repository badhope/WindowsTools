export interface BrowserInfo {
  name: string
  version: string
  platform: string
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isChrome: boolean
  isFirefox: boolean
  isSafari: boolean
  isEdge: boolean
  isIE: boolean
  isOpera: boolean
  isUC: boolean
  isQQ: boolean
  isWeixin: boolean
  isDingtalk: boolean
  isLark: boolean
  supports: {
    fetch: boolean
    websockets: boolean
    serviceWorker: boolean
    intersectionObserver: boolean
    mutationObserver: boolean
    clipboard: boolean
    notifications: boolean
    fullscreen: boolean
    paymentRequest: boolean
    share: boolean
  }
}

export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent
  const platform = navigator.platform || ''

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua)
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet|Tablet/i.test(ua)
  const isDesktop = !isMobile && !isTablet

  const browsers: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /Edg\//, name: 'Edge' },
    { pattern: /OPR\//, name: 'Opera' },
    { pattern: /Chrome\//, name: 'Chrome' },
    { pattern: /Firefox\//, name: 'Firefox' },
    { pattern: /Safari\//, name: 'Safari' },
    { pattern: /MSIE|Trident/, name: 'IE' }
  ]

  let name = 'Unknown'
  let version = '0'

  for (const browser of browsers) {
    const match = ua.match(browser.pattern)
    if (match) {
      name = browser.name
      version = match[0].split('/')[1] || '0'
      break
    }
  }

  const socialApps: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /MicroMessenger\//, name: 'Weixin' },
    { pattern: /QQ\//, name: 'QQ' },
    { pattern: /DingTalk/, name: 'Dingtalk' },
    { pattern: /Lark/, name: 'Lark' },
    { pattern: /UCBrowser|Ucmini/, name: 'UC' }
  ]

  let socialName = ''
  for (const app of socialApps) {
    if (app.pattern.test(ua)) {
      socialName = app.name
      break
    }
  }

  const supports = {
    fetch: typeof fetch !== 'undefined',
    websockets: typeof WebSocket !== 'undefined',
    serviceWorker: 'serviceWorker' in navigator,
    intersectionObserver: 'IntersectionObserver' in window,
    mutationObserver: 'MutationObserver' in window,
    clipboard: 'clipboard' in navigator || 'Clipboard' in window,
    notifications: 'Notification' in window,
    fullscreen: 'requestFullscreen' in document.documentElement ||
                'webkitRequestFullscreen' in document.documentElement ||
                'mozRequestFullScreen' in document.documentElement ||
                'msRequestFullscreen' in document.documentElement,
    paymentRequest: 'PaymentRequest' in window,
    share: 'share' in navigator
  }

  return {
    name: socialName || name,
    version,
    platform,
    isMobile,
    isTablet,
    isDesktop,
    isChrome: name === 'Chrome',
    isFirefox: name === 'Firefox',
    isSafari: name === 'Safari',
    isEdge: name === 'Edge',
    isIE: name === 'IE',
    isOpera: name === 'Opera',
    isUC: socialName === 'UC',
    isQQ: socialName === 'QQ',
    isWeixin: socialName === 'Weixin',
    isDingtalk: socialName === 'Dingtalk',
    isLark: socialName === 'Lark',
    supports
  }
}

export interface FeatureCheck {
  name: string
  supported: boolean
  fallback?: string
  polyfill?: string
}

export function checkFeatures(): FeatureCheck[] {
  const features: FeatureCheck[] = [
    {
      name: 'Fetch API',
      supported: typeof fetch !== 'undefined',
      fallback: '使用 XMLHttpRequest 作为替代'
    },
    {
      name: 'WebSocket',
      supported: typeof WebSocket !== 'undefined',
      fallback: '使用轮询作为替代'
    },
    {
      name: 'Service Worker',
      supported: 'serviceWorker' in navigator,
      fallback: '无法使用离线缓存功能'
    },
    {
      name: 'Intersection Observer',
      supported: 'IntersectionObserver' in window,
      fallback: '使用滚动事件监听作为替代'
    },
    {
      name: 'Mutation Observer',
      supported: 'MutationObserver' in window,
      fallback: '使用 DOMSubtreeModified 事件作为替代'
    },
    {
      name: 'Clipboard API',
      supported: 'clipboard' in navigator,
      fallback: '使用 document.execCommand 作为替代'
    },
    {
      name: 'Web Notifications',
      supported: 'Notification' in window,
      fallback: '使用内联提示作为替代'
    },
    {
      name: 'Fullscreen API',
      supported: 'requestFullscreen' in document.documentElement,
      fallback: '无法使用全屏功能'
    },
    {
      name: 'Payment Request API',
      supported: 'PaymentRequest' in window,
      fallback: '使用传统表单作为替代'
    },
    {
      name: 'Web Share API',
      supported: 'share' in navigator,
      fallback: '使用自定义分享对话框作为替代'
    },
    {
      name: 'CSS Grid',
      supported: CSS.supports('display', 'grid'),
      fallback: '使用 Flexbox 作为替代'
    },
    {
      name: 'CSS Custom Properties',
      supported: CSS.supports('--custom', 'value'),
      fallback: '使用预处理器变量作为替代'
    },
    {
      name: 'ES6+',
      supported: typeof Promise !== 'undefined' && typeof Map !== 'undefined',
      fallback: '使用 polyfill 或降级语法'
    },
    {
      name: 'Async/Await',
      supported: (() => {
        try {
          eval('async function _test(){await 1}')
          return true
        } catch {
          return false
        }
      })(),
      fallback: '使用 Promise.then 作为替代'
    }
  ]

  return features
}

export interface CompatibilityIssue {
  feature: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  suggestion: string
}

export function analyzeCompatibility(): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = []
  const browser = detectBrowser()
  const features = checkFeatures()

  for (const feature of features) {
    if (!feature.supported) {
      if (feature.name === 'Fetch API') {
        issues.push({
          feature: feature.name,
          severity: 'critical',
          message: '浏览器不支持 Fetch API，无法进行网络请求',
          suggestion: feature.fallback || '请使用 XMLHttpRequest'
        })
      } else if (feature.name === 'ES6+') {
        issues.push({
          feature: feature.name,
          severity: 'critical',
          message: '浏览器不支持 ES6+，代码可能无法正常运行',
          suggestion: '请使用 Babel 转译或降级语法'
        })
      } else {
        issues.push({
          feature: feature.name,
          severity: 'warning',
          message: `浏览器不支持 ${feature.name}，部分功能可能受限`,
          suggestion: feature.fallback || '考虑使用 polyfill'
        })
      }
    }
  }

  if (browser.isIE) {
    issues.push({
      feature: 'Internet Explorer',
      severity: 'critical',
      message: '检测到 Internet Explorer 浏览器，强烈建议使用现代浏览器',
      suggestion: '请使用 Chrome、Firefox、Edge 或 Safari 以获得最佳体验'
    })
  }

  if (browser.isMobile && !browser.isTablet) {
    if (window.innerWidth < 375) {
      issues.push({
        feature: '小屏设备',
        severity: 'info',
        message: '检测到小屏移动设备，界面可能需要调整',
        suggestion: '应用已响应式设计，但某些功能在小屏上可能受限'
      })
    }
  }

  return issues
}

export function getCompatibilityScore(): number {
  const features = checkFeatures()
  const criticalFeatures = ['Fetch API', 'ES6+', 'Mutation Observer']
  let score = 100

  for (const feature of features) {
    if (!feature.supported) {
      if (criticalFeatures.includes(feature.name)) {
        score -= 30
      } else {
        score -= 5
      }
    }
  }

  return Math.max(0, score)
}

export function getRecommendation(): string {
  const score = getCompatibilityScore()
  const browser = detectBrowser()

  if (score >= 90) {
    return `当前浏览器 (${browser.name} ${browser.version}) 完全支持所有核心功能，建议使用最新版本以获得最佳体验。`
  } else if (score >= 70) {
    return `当前浏览器支持大部分功能，但部分高级特性可能受限。建议使用 Chrome、Firefox、Edge 或 Safari 以获得完整功能。`
  } else {
    return `当前浏览器支持有限，建议升级到最新版本的 Chrome、Firefox、Edge 或 Safari 以获得完整功能和最佳安全性。`
  }
}
