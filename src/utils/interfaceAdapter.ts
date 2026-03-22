export interface InterfaceType {
  type: 'news' | 'ecommerce' | 'video' | 'social' | 'forum' | 'blog' | 'government' | 'unknown'
  confidence: number
  name: string
  icon: string
}

export interface ElementInfo {
  tagName: string
  className: string
  id: string
  text: string
  href?: string
  src?: string
  dataSrc?: string
  ariaLabel?: string
  role?: string
}

export interface AdaptResult {
  success: boolean
  interfaceType: InterfaceType
  recommendedSelectors: SelectorRecommendation[]
  linkPatterns: LinkPattern[]
  paginationSelectors: string[]
  fieldMappings: FieldMapping[]
  warnings: string[]
}

export interface SelectorRecommendation {
  field: string
  cssSelector: string
  xpathSelector: string
  confidence: number
  examples: string[]
}

export interface LinkPattern {
  pattern: RegExp
  type: 'video' | 'article' | 'product' | 'user' | 'comment' | 'other'
  examples: string[]
}

export interface FieldMapping {
  fieldName: string
  cssSelector: string
  attribute: 'text' | 'href' | 'src' | 'data-src' | 'aria-label'
  example: string
}

export function detectInterfaceType(html: string, url?: string): InterfaceType {
  const urlLower = url?.toLowerCase() || ''

  const bilibiliScore = analyzeSite(html, urlLower, 'bilibili', ['bili', 'bilibili', 'video'])
  const ecommerceScore = analyzeSite(html, urlLower, 'ecommerce', ['taobao', 'tmall', 'jd', 'jd.com', 'pinduoduo', '1688'])
  const videoScore = analyzeSite(html, urlLower, 'video', ['youtube', 'youku', 'iqiyi', 'qq.com/video', 'vue', 'tiktok'])
  const socialScore = analyzeSite(html, urlLower, 'social', ['weibo', 'twitter', 'facebook', 'douyin', 'xiaohongshu'])
  const forumScore = analyzeSite(html, urlLower, 'forum', ['zhihu', 'baidu.com/tieba', 'douban', 'reddit'])
  const blogScore = analyzeSite(html, urlLower, 'blog', ['juejin', 'segmentfault', 'cnblogs', 'blog'])
  const govScore = analyzeSite(html, urlLower, 'government', ['gov.cn', 'government'])

  const scores: Array<{type: InterfaceType['type']; score: number; name: string; icon: string}> = [
    { type: 'video', score: bilibiliScore + videoScore, name: '视频网站', icon: '📺' },
    { type: 'ecommerce', score: ecommerceScore, name: '电商网站', icon: '🛒' },
    { type: 'social', score: socialScore, name: '社交媒体', icon: '👥' },
    { type: 'forum', score: forumScore, name: '论坛社区', icon: '💬' },
    { type: 'blog', score: blogScore, name: '博客资讯', icon: '📝' },
    { type: 'news', score: bilibiliScore, name: '新闻资讯', icon: '📰' },
    { type: 'government', score: govScore, name: '政府网站', icon: '🏛️' },
    { type: 'unknown', score: 10, name: '通用网站', icon: '🌐' }
  ]

  scores.sort((a, b) => b.score - a.score)

  return {
    type: scores[0].type,
    confidence: Math.min(scores[0].score / 100, 1),
    name: scores[0].name,
    icon: scores[0].icon
  }
}

function analyzeSite(html: string, url: string, site: string, keywords: string[]): number {
  let score = 0

  if (keywords.some(k => url.includes(k))) {
    score += 50
  }

  const lowerHtml = html.toLowerCase()

  if (site === 'bilibili') {
    if (lowerHtml.includes('bili-')) score += 30
    if (lowerHtml.includes('video-card')) score += 20
    if (lowerHtml.includes('bili-video')) score += 20
    if (lowerHtml.includes('bilibili')) score += 15
  }

  if (site === 'ecommerce') {
    if (lowerHtml.includes('product') || lowerHtml.includes('goods-item')) score += 30
    if (lowerHtml.includes('price')) score += 20
    if (lowerHtml.includes('add-cart') || lowerHtml.includes('buy-now')) score += 20
  }

  if (site === 'video') {
    if (lowerHtml.includes('video-player') || lowerHtml.includes('player')) score += 30
    if (lowerHtml.includes('play-count') || lowerHtml.includes('playcount')) score += 20
  }

  if (site === 'social') {
    if (lowerHtml.includes('user-post') || lowerHtml.includes('feed-item')) score += 30
    if (lowerHtml.includes('like-count') || lowerHtml.includes('comment-count')) score += 20
  }

  return Math.min(score, 100)
}

export function adaptInterface(html: string, url: string): AdaptResult {
  const interfaceType = detectInterfaceType(html, url)
  const warnings: string[] = []

  let recommendedSelectors: SelectorRecommendation[] = []
  let linkPatterns: LinkPattern[] = []
  let paginationSelectors: string[] = []
  let fieldMappings: FieldMapping[] = []

  switch (interfaceType.type) {
    case 'video':
      recommendedSelectors = getVideoSelectors(html)
      linkPatterns = getVideoLinkPatterns()
      paginationSelectors = getVideoPaginationSelectors()
      fieldMappings = getVideoFieldMappings()
      warnings.push('视频网站通常需要JavaScript渲染，建议开启JS渲染功能')
      warnings.push('部分视频链接可能需要登录后才能访问')
      break

    case 'ecommerce':
      recommendedSelectors = getEcommerceSelectors(html)
      linkPatterns = getEcommerceLinkPatterns()
      paginationSelectors = getEcommercePaginationSelectors()
      fieldMappings = getEcommerceFieldMappings()
      warnings.push('电商网站可能有反爬机制，建议设置合理的请求间隔')
      warnings.push('价格和销量数据可能需要登录后才能获取完整信息')
      break

    case 'social':
      recommendedSelectors = getSocialSelectors(html)
      linkPatterns = getSocialLinkPatterns()
      paginationSelectors = getSocialPaginationSelectors()
      fieldMappings = getSocialFieldMappings()
      warnings.push('社交媒体通常需要登录才能获取完整数据')
      warnings.push('部分内容可能受隐私设置限制无法访问')
      break

    case 'forum':
      recommendedSelectors = getForumSelectors(html)
      linkPatterns = getForumLinkPatterns()
      paginationSelectors = getForumPaginationSelectors()
      fieldMappings = getForumFieldMappings()
      warnings.push('论坛可能有登录限制或反爬机制')
      break

    case 'blog':
      recommendedSelectors = getBlogSelectors(html)
      linkPatterns = getBlogLinkPatterns()
      paginationSelectors = getBlogPaginationSelectors()
      fieldMappings = getBlogFieldMappings()
      break

    case 'news':
      recommendedSelectors = getNewsSelectors(html)
      linkPatterns = getNewsLinkPatterns()
      paginationSelectors = getNewsPaginationSelectors()
      fieldMappings = getNewsFieldMappings()
      break

    default:
      recommendedSelectors = getGenericSelectors(html)
      linkPatterns = getGenericLinkPatterns()
      paginationSelectors = getGenericPaginationSelectors()
      fieldMappings = []
      warnings.push('未识别到特定网站类型，使用通用抓取策略')
  }

  return {
    success: true,
    interfaceType,
    recommendedSelectors,
    linkPatterns,
    paginationSelectors,
    fieldMappings,
    warnings
  }
}

function getVideoSelectors(html: string): SelectorRecommendation[] {
  const selectors: SelectorRecommendation[] = []

  const videoSelectors = [
    { name: '视频标题', selectors: ['.title', 'h3', '[class*="title"]', '.video-title'] },
    { name: '视频描述', selectors: ['.desc', '.description', '[class*="desc"]'] },
    { name: '播放量', selectors: ['[class*="play"]', '.count', '[class*="view"]'] },
    { name: '弹幕数', selectors: ['[class*="danmu"]', '[class*="dm"]'] },
    { name: 'UP主', selectors: ['[class*="up"]', '[class*="author"]', '[class*="user"]'] },
    { name: '发布时间', selectors: ['[class*="time"]', '[class*="date"]', '.publish-time'] },
    { name: '视频封面', selectors: ['[class*="cover"] img', '[class*="pic"] img', '.thumbnail img'] },
    { name: '视频链接', selectors: ['a[href*="video"]', 'a[href*="watch"]', '.video-link'] }
  ]

  for (const s of videoSelectors) {
    for (const sel of s.selectors) {
      if (html.includes(sel.replace(/[.#]/g, ''))) {
        selectors.push({
          field: s.name,
          cssSelector: sel,
          xpathSelector: cssToXPath(sel),
          confidence: 0.8,
          examples: []
        })
        break
      }
    }
  }

  return selectors
}

function getEcommerceSelectors(html: string): SelectorRecommendation[] {
  const selectors: SelectorRecommendation[] = []

  const ecSelectors = [
    { name: '商品标题', selectors: ['.title', '[class*="title"]', 'h3'] },
    { name: '商品价格', selectors: ['[class*="price"]', '.price-wrap', '.goods-price'] },
    { name: '原价', selectors: ['[class*="original"]', '[class*="market"]', '.origin-price'] },
    { name: '销量', selectors: ['[class*="sales"]', '[class*="sold"]', '.sales-count'] },
    { name: '店铺名称', selectors: ['[class*="shop"]', '[class*="seller"]', '.store-name'] },
    { name: '商品图片', selectors: ['[class*="img"] img', '[class*="pic"] img', '.goods-img'] },
    { name: '商品链接', selectors: ['a[href*="item"]', 'a[href*="product"]', '.goods-link'] }
  ]

  for (const s of ecSelectors) {
    for (const sel of s.selectors) {
      if (html.includes(sel.replace(/[.#]/g, ''))) {
        selectors.push({
          field: s.name,
          cssSelector: sel,
          xpathSelector: cssToXPath(sel),
          confidence: 0.8,
          examples: []
        })
        break
      }
    }
  }

  return selectors
}

function getSocialSelectors(_html: string): SelectorRecommendation[] {
  return [
    { field: '帖子内容', cssSelector: '[class*="content"]', xpathSelector: '', confidence: 0.7, examples: [] },
    { field: '用户名', cssSelector: '[class*="user"]', xpathSelector: '', confidence: 0.7, examples: [] },
    { field: '发布时间', cssSelector: '[class*="time"]', xpathSelector: '', confidence: 0.7, examples: [] },
    { field: '点赞数', cssSelector: '[class*="like"]', xpathSelector: '', confidence: 0.6, examples: [] },
    { field: '评论数', cssSelector: '[class*="comment"]', xpathSelector: '', confidence: 0.6, examples: [] },
    { field: '分享数', cssSelector: '[class*="share"]', xpathSelector: '', confidence: 0.6, examples: [] }
  ]
}

function getForumSelectors(_html: string): SelectorRecommendation[] {
  return [
    { field: '帖子标题', cssSelector: 'h2, h3, [class*="title"]', xpathSelector: '', confidence: 0.8, examples: [] },
    { field: '帖子内容', cssSelector: '[class*="content"]', xpathSelector: '', confidence: 0.7, examples: [] },
    { field: '作者', cssSelector: '[class*="author"]', xpathSelector: '', confidence: 0.7, examples: [] },
    { field: '回复数', cssSelector: '[class*="reply"]', xpathSelector: '', confidence: 0.7, examples: [] },
    { field: '查看数', cssSelector: '[class*="view"]', xpathSelector: '', confidence: 0.6, examples: [] },
    { field: '最后回复', cssSelector: '[class*="last"]', xpathSelector: '', confidence: 0.6, examples: [] }
  ]
}

function getBlogSelectors(_html: string): SelectorRecommendation[] {
  return [
    { field: '文章标题', cssSelector: 'h1, [class*="title"]', xpathSelector: '', confidence: 0.9, examples: [] },
    { field: '文章内容', cssSelector: '[class*="content"]', xpathSelector: '', confidence: 0.8, examples: [] },
    { field: '作者', cssSelector: '[class*="author"]', xpathSelector: '', confidence: 0.8, examples: [] },
    { field: '发布时间', cssSelector: '[class*="time"]', xpathSelector: '', confidence: 0.7, examples: [] },
    { field: '阅读量', cssSelector: '[class*="read"]', xpathSelector: '', confidence: 0.6, examples: [] },
    { field: '标签', cssSelector: '[class*="tag"]', xpathSelector: '', confidence: 0.6, examples: [] }
  ]
}

function getNewsSelectors(_html: string): SelectorRecommendation[] {
  return [
    { field: '新闻标题', cssSelector: 'h1, [class*="title"]', xpathSelector: '', confidence: 0.9, examples: [] },
    { field: '新闻内容', cssSelector: '[class*="content"]', xpathSelector: '', confidence: 0.8, examples: [] },
    { field: '来源', cssSelector: '[class*="source"]', xpathSelector: '', confidence: 0.8, examples: [] },
    { field: '发布时间', cssSelector: '[class*="time"]', xpathSelector: '', confidence: 0.7, examples: [] },
    { field: '责任编辑', cssSelector: '[class*="editor"]', xpathSelector: '', confidence: 0.6, examples: [] }
  ]
}

function getGenericSelectors(html: string): SelectorRecommendation[] {
  const selectors: SelectorRecommendation[] = []

  const patterns = [
    { name: '标题', patterns: ['h1', 'h2', 'h3', '[class*="title"]'] },
    { name: '链接', patterns: ['a[href]'] },
    { name: '图片', patterns: ['img[src]'] },
    { name: '段落', patterns: ['p'] },
    { name: '列表', patterns: ['li'] }
  ]

  for (const p of patterns) {
    for (const pattern of p.patterns) {
      if (html.includes(pattern.replace(/[.#]/g, ''))) {
        selectors.push({
          field: p.name,
          cssSelector: pattern,
          xpathSelector: cssToXPath(pattern),
          confidence: 0.5,
          examples: []
        })
        break
      }
    }
  }

  return selectors
}

function getVideoLinkPatterns(): LinkPattern[] {
  return [
    { pattern: /\/video\/[a-zA-Z0-9]+/, type: 'video', examples: ['/video/BV1xx411c7mD'] },
    { pattern: /watch\?v=[a-zA-Z0-9]+/, type: 'video', examples: ['watch?v=dQw4w9WgXcQ'] },
    { pattern: /\/av\d+/, type: 'video', examples: ['/av170001'] },
    { pattern: /\/user\/[a-zA-Z0-9]+/, type: 'user', examples: ['/user/uid123456'] }
  ]
}

function getEcommerceLinkPatterns(): LinkPattern[] {
  return [
    { pattern: /item\.taobao\.com\/item\.htm\?id=\d+/, type: 'product', examples: ['item.taobao.com/item.htm?id=123456'] },
    { pattern: /detail\.tmall\.com\/item\.htm\?id=\d+/, type: 'product', examples: ['detail.tmall.com/item.htm?id=123456'] },
    { pattern: /item\.jd\.com\/\d+\.html/, type: 'product', examples: ['item.jd.com/100012345.html'] },
    { pattern: /product\/\d+/, type: 'product', examples: ['/product/123456'] }
  ]
}

function getSocialLinkPatterns(): LinkPattern[] {
  return [
    { pattern: /weibo\.com\/\d+\/[a-zA-Z0-9]+/, type: 'article', examples: [] },
    { pattern: /twitter\.com\/\w+\/status\/\d+/, type: 'article', examples: [] },
    { pattern: /douyin\.com\/video\/\d+/, type: 'video', examples: [] }
  ]
}

function getForumLinkPatterns(): LinkPattern[] {
  return [
    { pattern: /zhihu\.com\/question\/\d+/, type: 'article', examples: [] },
    { pattern: /tieba\.baidu\.com\/f\?kw=/, type: 'article', examples: [] }
  ]
}

function getBlogLinkPatterns(): LinkPattern[] {
  return [
    { pattern: /juejin\.cn\/post\/\d+/, type: 'article', examples: [] },
    { pattern: /segmentfault\.com\/a\/\d+/, type: 'article', examples: [] }
  ]
}

function getNewsLinkPatterns(): LinkPattern[] {
  return [
    { pattern: /\/news\/\d+/, type: 'article', examples: [] },
    { pattern: /\/article\/\d+/, type: 'article', examples: [] }
  ]
}

function getGenericLinkPatterns(): LinkPattern[] {
  return [
    { pattern: /https?:\/\/[^\s]+/, type: 'other', examples: [] }
  ]
}

function getVideoPaginationSelectors(): string[] {
  return [
    '.video-page', '.pagination', '[class*="page"]',
    'a[href*="page"]', 'a[href*="p"]', '.next-page'
  ]
}

function getEcommercePaginationSelectors(): string[] {
  return [
    '.page-wrap', '.pagination', '[class*="page"]',
    'a[href*="page"]', '.next', '.ui-pager'
  ]
}

function getSocialPaginationSelectors(): string[] {
  return [
    '.pagination', '[class*="page"]',
    'a[href*="page"]', '.load-more', '.next'
  ]
}

function getForumPaginationSelectors(): string[] {
  return [
    '.pagination', '.thread-page', '[class*="page"]',
    'a[href*="page"]', '.楼', '.next'
  ]
}

function getBlogPaginationSelectors(): string[] {
  return [
    '.pagination', '.page-nav', '[class*="page"]',
    'a[href*="page"]', '.older'
  ]
}

function getNewsPaginationSelectors(): string[] {
  return [
    '.pagination', '.page', '[class*="page"]',
    'a[href*="page"]', '.next-page'
  ]
}

function getGenericPaginationSelectors(): string[] {
  return [
    'a[href*="page"]', 'a[href*="p"]', '.pagination', '[class*="page"]'
  ]
}

function getVideoFieldMappings(): FieldMapping[] {
  return [
    { fieldName: '标题', cssSelector: '.title', attribute: 'text', example: '' },
    { fieldName: '描述', cssSelector: '.desc', attribute: 'text', example: '' },
    { fieldName: '播放量', cssSelector: '[class*="play"]', attribute: 'text', example: '' },
    { fieldName: '弹幕数', cssSelector: '[class*="danmu"]', attribute: 'text', example: '' },
    { fieldName: 'UP主', cssSelector: '[class*="up"]', attribute: 'text', example: '' },
    { fieldName: '发布时间', cssSelector: '[class*="time"]', attribute: 'text', example: '' },
    { fieldName: '封面图', cssSelector: '[class*="cover"] img', attribute: 'src', example: '' },
    { fieldName: '视频链接', cssSelector: 'a[href*="video"]', attribute: 'href', example: '' }
  ]
}

function getEcommerceFieldMappings(): FieldMapping[] {
  return [
    { fieldName: '商品标题', cssSelector: '.title', attribute: 'text', example: '' },
    { fieldName: '价格', cssSelector: '[class*="price"]', attribute: 'text', example: '' },
    { fieldName: '原价', cssSelector: '[class*="original"]', attribute: 'text', example: '' },
    { fieldName: '销量', cssSelector: '[class*="sales"]', attribute: 'text', example: '' },
    { fieldName: '店铺', cssSelector: '[class*="shop"]', attribute: 'text', example: '' },
    { fieldName: '商品图片', cssSelector: '[class*="img"] img', attribute: 'src', example: '' },
    { fieldName: '商品链接', cssSelector: 'a[href*="item"]', attribute: 'href', example: '' }
  ]
}

function getSocialFieldMappings(): FieldMapping[] {
  return [
    { fieldName: '内容', cssSelector: '[class*="content"]', attribute: 'text', example: '' },
    { fieldName: '用户', cssSelector: '[class*="user"]', attribute: 'text', example: '' },
    { fieldName: '时间', cssSelector: '[class*="time"]', attribute: 'text', example: '' },
    { fieldName: '点赞', cssSelector: '[class*="like"]', attribute: 'text', example: '' },
    { fieldName: '评论', cssSelector: '[class*="comment"]', attribute: 'text', example: '' }
  ]
}

function getForumFieldMappings(): FieldMapping[] {
  return [
    { fieldName: '标题', cssSelector: 'h2, h3', attribute: 'text', example: '' },
    { fieldName: '内容', cssSelector: '[class*="content"]', attribute: 'text', example: '' },
    { fieldName: '作者', cssSelector: '[class*="author"]', attribute: 'text', example: '' },
    { fieldName: '回复', cssSelector: '[class*="reply"]', attribute: 'text', example: '' },
    { fieldName: '查看', cssSelector: '[class*="view"]', attribute: 'text', example: '' }
  ]
}

function getBlogFieldMappings(): FieldMapping[] {
  return [
    { fieldName: '标题', cssSelector: 'h1', attribute: 'text', example: '' },
    { fieldName: '内容', cssSelector: '[class*="content"]', attribute: 'text', example: '' },
    { fieldName: '作者', cssSelector: '[class*="author"]', attribute: 'text', example: '' },
    { fieldName: '时间', cssSelector: '[class*="time"]', attribute: 'text', example: '' },
    { fieldName: '标签', cssSelector: '[class*="tag"]', attribute: 'text', example: '' }
  ]
}

function getNewsFieldMappings(): FieldMapping[] {
  return [
    { fieldName: '标题', cssSelector: 'h1', attribute: 'text', example: '' },
    { fieldName: '内容', cssSelector: '[class*="content"]', attribute: 'text', example: '' },
    { fieldName: '来源', cssSelector: '[class*="source"]', attribute: 'text', example: '' },
    { fieldName: '时间', cssSelector: '[class*="time"]', attribute: 'text', example: '' }
  ]
}

export function cssToXPath(css: string): string {
  const result = css
    .replace(/>/g, '/')
    .replace(/(\.[\w-]+)/g, '[contains(concat(" ", normalize-space(@class), " "), " $1 ")]')
    .replace(/#([\w-]+)/g, '[@id="$1"]')
    .replace(/:nth-of-type\((\d+)\)/g, '[$1]')
    .replace(/:first-child/g, '[1]')
    .replace(/:last-child/g, '')
    .replace(/\s+/g, '//')

  return '//' + result
}

export interface LinkInfo {
  url: string
  text: string
  type: 'video' | 'article' | 'product' | 'user' | 'comment' | 'image' | 'other'
  context: string
  isValid: boolean
}

export function extractLinks(html: string, baseUrl?: string): LinkInfo[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const links: LinkInfo[] = []

  const anchorElements = doc.querySelectorAll('a[href]')

  anchorElements.forEach((anchor) => {
    const href = anchor.getAttribute('href') || ''
    const text = anchor.textContent?.trim() || ''

    if (!href || href.startsWith('javascript:') || href.startsWith('#')) {
      return
    }

    let fullUrl = href
    if (baseUrl && !href.startsWith('http')) {
      try {
        fullUrl = new URL(href, baseUrl).href
      } catch {
        fullUrl = baseUrl + href
      }
    }

    const linkType = classifyLink(fullUrl, text)
    const context = getLinkContext(anchor)

    links.push({
      url: fullUrl,
      text,
      type: linkType,
      context,
      isValid: isValidUrl(fullUrl)
    })
  })

  return links
}

function classifyLink(url: string, text: string): LinkInfo['type'] {
  const lowerUrl = url.toLowerCase()
  const lowerText = text.toLowerCase()

  if (/\/video\/|\/watch\?v=|bilibili\.com\/BV|\.mp4|\.avi|\.mov/.test(lowerUrl)) {
    return 'video'
  }
  if (/\/item\/|\/product\/|taobao\.com|tmall\.com|jd\.com|pinduoduo/.test(lowerUrl)) {
    return 'product'
  }
  if (/\/user\/|\/people\/|\/profile\//.test(lowerUrl)) {
    return 'user'
  }
  if (/\/article\/|\/post\/|\/blog\/|juejin\.cn|segmentfault/.test(lowerUrl)) {
    return 'article'
  }
  if (/\/comment\/|\/reply\/|\/discuss\//.test(lowerUrl)) {
    return 'comment'
  }
  if (/\.jpg|\.jpeg|\.png|\.gif|\.webp|\.svg/.test(lowerUrl)) {
    return 'image'
  }

  if (/视频|播放|watch|video/.test(lowerText)) {
    return 'video'
  }
  if (/商品|购买|价格|shop|product/.test(lowerText)) {
    return 'product'
  }
  if (/用户|author|up主/.test(lowerText)) {
    return 'user'
  }
  if (/文章|帖子|博客|article|post/.test(lowerText)) {
    return 'article'
  }

  return 'other'
}

function getLinkContext(anchor: Element): string {
  const parent = anchor.parentElement
  if (!parent) return ''

  const grandparent = parent.parentElement
  let context = parent.className || parent.id || ''
  if (grandparent) {
    context += ' ' + (grandparent.className || grandparent.id || '')
  }

  return context.substring(0, 100)
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function filterLinks(links: LinkInfo[], criteria: {
  types?: LinkInfo['type'][]
  minTextLength?: number
  maxTextLength?: number
  validOnly?: boolean
  pattern?: RegExp
}): LinkInfo[] {
  return links.filter(link => {
    if (criteria.types && !criteria.types.includes(link.type)) {
      return false
    }
    if (criteria.minTextLength && link.text.length < criteria.minTextLength) {
      return false
    }
    if (criteria.maxTextLength && link.text.length > criteria.maxTextLength) {
      return false
    }
    if (criteria.validOnly && !link.isValid) {
      return false
    }
    if (criteria.pattern && !criteria.pattern.test(link.url)) {
      return false
    }
    return true
  })
}

export function groupLinksByType(links: LinkInfo[]): Record<LinkInfo['type'], LinkInfo[]> {
  const grouped: Record<LinkInfo['type'], LinkInfo[]> = {
    video: [],
    article: [],
    product: [],
    user: [],
    comment: [],
    image: [],
    other: []
  }

  for (const link of links) {
    grouped[link.type].push(link)
  }

  return grouped
}

export function deduplicateLinks(links: LinkInfo[]): LinkInfo[] {
  const seen = new Set<string>()
  return links.filter(link => {
    if (seen.has(link.url)) {
      return false
    }
    seen.add(link.url)
    return true
  })
}
