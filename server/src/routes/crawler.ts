import { Router } from 'express'
import puppeteer, { Browser, Page } from 'puppeteer'
import * as cheerio from 'cheerio'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger.js'

export const CrawlerRouter = Router()

let browser: Browser | null = null
const crawlingTasks = new Map<string, any>()

interface CrawlRequest {
  url: string
  method: 'GET' | 'POST'
  headers?: Record<string, string>
  data?: any
  useBrowser?: boolean
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

const ANTI_DETECT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
]

function getRandomUserAgent(): string {
  return ANTI_DETECT_USER_AGENTS[Math.floor(Math.random() * ANTI_DETECT_USER_AGENTS.length)]
}

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-notifications',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-mode=disable',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors'
      ]
    })
  }
  return browser
}

function applyStealthMode(page: Page): void {
  page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false })
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en-US', 'en'] })
    ;(window as any).chrome = { runtime: {} }
  })
}

CrawlerRouter.post('/crawl', async (req, res) => {
  const taskId = uuidv4()
  const startTime = Date.now()

  try {
    const config: CrawlRequest = req.body

    if (!config.url) {
      return res.status(400).json({ error: 'URL is required', code: 'MISSING_URL' })
    }

    logger.info(`Starting crawl task ${taskId} for URL: ${config.url}`)

    const task: any = {
      id: taskId,
      url: config.url,
      status: 'running',
      startTime,
      progress: 0
    }
    crawlingTasks.set(taskId, task)

    let result: any

    if (config.useBrowser) {
      result = await crawlWithBrowser(config, task)
    } else {
      result = await crawlWithHttp(config, task)
    }

    task.status = 'completed'
    task.progress = 100
    task.result = result
    task.duration = Date.now() - startTime

    logger.info(`Crawl task ${taskId} completed in ${task.duration}ms`)

    res.json({
      success: true,
      taskId,
      duration: Date.now() - startTime,
      data: result
    })
  } catch (error: any) {
    logger.error(`Crawl task ${taskId} failed`, { error: error.message })
    crawlingTasks.get(taskId).status = 'failed'
    res.status(500).json({
      error: error.message,
      code: error.code || 'CRAWL_ERROR',
      taskId
    })
  }
})

async function crawlWithBrowser(config: CrawlRequest, task: any): Promise<any> {
  const browser = await getBrowser()
  const page: Page = await browser.newPage()

  try {
    applyStealthMode(page)

    if (config.proxy) {
      await page.authenticate({ username: '', password: '' }).catch(() => {})
    }

    if (config.headers) {
      await page.setExtraHTTPHeaders(config.headers)
    }

    await page.setUserAgent(getRandomUserAgent())

    await page.evaluate(() => {
      Object.defineProperty(navigator, 'platform', { get: () => 'Win32' })
      Object.defineProperty(navigator, 'oscpu', { get: () => 'Windows NT 10.0' })
    })

    task.progress = 20

    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const resourceType = req.resourceType()
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort()
      } else {
        req.continue()
      }
    })

    const navigationPromise = config.waitForSelector
      ? page.waitForSelector(config.waitForSelector, { timeout: config.timeout || 30000 })
      : page.goto(config.url, { waitUntil: 'networkidle2', timeout: config.timeout || 30000 })

    await navigationPromise

    await page.waitForTimeout(2000)

    const html = await page.content()
    const $ = cheerio.load(html)

    task.progress = 70

    let data: any = {}

    if (config.selectors && config.selectors.length > 0) {
      for (const sel of config.selectors) {
        if (sel.type === 'css') {
          const elements = $(sel.selector)
          if (elements.length > 1) {
            data[sel.name] = elements.map((_, el) => getElementValue($(el), sel.attribute || 'text')).get()
          } else {
            data[sel.name] = getElementValue(elements.first(), sel.attribute || 'text')
          }
        }
      }
    } else {
      data = extractDefaultFields($)
    }

    const allLinks = $('a[href]').map((_, el) => $(el).attr('href')).get()
    const allImages = $('img[src]').map((_, el) => $(el).attr('src')).get()

    data._meta = {
      url: config.url,
      title: $('title').text(),
      links: allLinks.length,
      images: allImages.length,
      pageLinks: allLinks,
      pageImages: allImages
    }

    if (config.pagination?.enabled) {
      data._pagination = {
        nextPageSelector: config.pagination.selector,
        maxPages: config.pagination.maxPages
      }
    }

    task.progress = 100

    return data
  } finally {
    await page.close()
  }
}

function getElementValue($el: cheerio.Cheerio<any>, attribute: string): string {
  switch (attribute) {
    case 'text':
      return $el.text().trim()
    case 'href':
      return $el.attr('href') || ''
    case 'src':
      return $el.attr('src') || ''
    case 'html':
      return $el.html() || ''
    default:
      return $el.text().trim()
  }
}

function extractDefaultFields($: cheerio.CheerioAPI): any {
  const data: any = {}

  const titleSelectors = ['h1', 'h2', 'h3', '.title', '[class*="title"]', '[class*="headline"]']
  for (const sel of titleSelectors) {
    const el = $(sel).first()
    if (el.length) {
      data.title = el.text().trim()
      break
    }
  }

  const contentSelectors = ['article', 'main', '[class*="content"]', '[class*="article"]', '.post', '.entry']
  for (const sel of contentSelectors) {
    const el = $(sel).first()
    if (el.length) {
      data.content = el.text().trim().substring(0, 500)
      break
    }
  }

  const priceSelectors = ['[class*="price"]', '.price', '[class*="Price"]']
  for (const sel of priceSelectors) {
    const el = $(sel).first()
    if (el.length) {
      data.price = el.text().trim()
      break
    }
  }

  const imgSelectors = ['img[src]', '[class*="image"] img', '[class*="thumbnail"] img']
  const images: string[] = []
  for (const sel of imgSelectors) {
    $(sel).each((_, el) => {
      const src = $(el).attr('src')
      if (src && !src.startsWith('data:')) {
        images.push(src)
      }
    })
    if (images.length > 0) break
  }
  if (images.length > 0) data.images = images

  const linkSelectors = ['a[href]']
  const links: any[] = []
  $(linkSelectors[0]).each((_, el) => {
    const href = $(el).attr('href')
    const text = $(el).text().trim()
    if (href && text) {
      links.push({ text, href })
    }
  })
  data.links = links.slice(0, 50)

  return data
}

async function crawlWithHttp(config: CrawlRequest, task: any): Promise<any> {
  task.progress = 20

  const response = await axios({
    method: config.method || 'GET',
    url: config.url,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...config.headers
    },
    data: config.data,
    timeout: config.timeout || 30000,
    proxy: config.proxy ? {
      host: config.proxy.split(':')[0],
      port: parseInt(config.proxy.split(':')[1])
    } : undefined
  })

  task.progress = 50

  const html = response.data
  const $ = cheerio.load(html)

  task.progress = 80

  const data: any = {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    ...extractDefaultFields($)
  }

  data._meta = {
    url: config.url,
    title: $('title').text()
  }

  task.progress = 100

  return data
}

CrawlerRouter.get('/task/:taskId', (req, res) => {
  const task = crawlingTasks.get(req.params.taskId)
  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }
  res.json(task)
})

CrawlerRouter.get('/tasks', (req, res) => {
  const tasks = Array.from(crawlingTasks.values())
    .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))
    .slice(0, 100)
  res.json(tasks)
})

CrawlerRouter.delete('/task/:taskId', (req, res) => {
  crawlingTasks.delete(req.params.taskId)
  res.json({ success: true })
})

CrawlerRouter.post('/screenshot', async (req, res) => {
  const { url, fullPage = false, selector } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  try {
    const browser = await getBrowser()
    const page = await browser.newPage()

    await page.setViewport({ width: 1920, height: 1080 })
    await page.goto(url, { waitUntil: 'networkidle2' })
    await page.waitForTimeout(1000)

    let screenshot: string

    if (selector) {
      const element = await page.$(selector)
      if (element) {
        screenshot = await element.screenshot({ encoding: 'base64' })
      } else {
        screenshot = await page.screenshot({ encoding: 'base64', fullPage })
      }
    } else {
      screenshot = await page.screenshot({ encoding: 'base64', fullPage })
    }

    await page.close()

    res.json({
      success: true,
      screenshot: `data:image/png;base64,${screenshot}`
    })
  } catch (error: any) {
    logger.error('Screenshot failed', { error: error.message })
    res.status(500).json({ error: error.message })
  }
})

CrawlerRouter.post('/close-browser', async (req, res) => {
  try {
    if (browser) {
      await browser.close()
      browser = null
    }
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

process.on('exit', async () => {
  if (browser) {
    await browser.close()
  }
})
