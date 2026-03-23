import { Router } from 'express'
import puppeteer, { Browser } from 'puppeteer'
import { logger } from '../utils/logger.js'

export const BrowserRouter = Router()

let browserInstance: Browser | null = null

BrowserRouter.post('/launch', async (req, res) => {
  try {
    const { headless = true, args = [] } = req.body

    if (browserInstance && browserInstance.connected) {
      return res.json({ success: true, message: 'Browser already running', connected: true })
    }

    browserInstance = await puppeteer.launch({
      headless: headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        ...args
      ]
    })

    const version = await browserInstance.version()

    logger.info(`Browser launched: ${version}`)

    res.json({
      success: true,
      version,
      connected: true
    })
  } catch (error: any) {
    logger.error('Browser launch failed', { error: error.message })
    res.status(500).json({
      error: error.message,
      code: 'BROWSER_LAUNCH_FAILED'
    })
  }
})

BrowserRouter.post('/close', async (req, res) => {
  try {
    if (browserInstance) {
      await browserInstance.close()
      browserInstance = null
    }
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

BrowserRouter.get('/status', async (req, res) => {
  res.json({
    connected: browserInstance !== null && browserInstance.connected,
    pages: browserInstance ? (await browserInstance.pages()).length : 0
  })
})

BrowserRouter.post('/page', async (req, res) => {
  try {
    if (!browserInstance) {
      return res.status(400).json({ error: 'Browser not running. Please launch first.' })
    }

    const page = await browserInstance.newPage()
    const pageId = (await page.target()).id()

    res.json({
      success: true,
      pageId,
      url: 'about:blank'
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

BrowserRouter.post('/page/:pageId/navigate', async (req, res) => {
  try {
    if (!browserInstance) {
      return res.status(400).json({ error: 'Browser not running' })
    }

    const { url } = req.body
    const target = await browserInstance.target()
    const page = await target.page()

    if (!page) {
      return res.status(404).json({ error: 'Page not found' })
    }

    await page.goto(url, { waitUntil: 'networkidle2' })
    const title = await page.title()

    res.json({
      success: true,
      url,
      title
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

BrowserRouter.post('/evaluate', async (req, res) => {
  try {
    if (!browserInstance) {
      return res.status(400).json({ error: 'Browser not running' })
    }

    const { script } = req.body
    const target = await browserInstance.target()
    const page = await target.page()

    if (!page) {
      return res.status(404).json({ error: 'Page not found' })
    }

    const result = await page.evaluate(script)

    res.json({
      success: true,
      result
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

BrowserRouter.post('/screenshot', async (req, res) => {
  try {
    if (!browserInstance) {
      return res.status(400).json({ error: 'Browser not running' })
    }

    const { fullPage = false, selector } = req.body
    const target = await browserInstance.target()
    const page = await target.page()

    if (!page) {
      return res.status(404).json({ error: 'Page not found' })
    }

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

    res.json({
      success: true,
      screenshot: `data:image/png;base64,${screenshot}`
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

BrowserRouter.post('/html', async (req, res) => {
  try {
    if (!browserInstance) {
      return res.status(400).json({ error: 'Browser not running' })
    }

    const { includeStyles = false } = req.body
    const target = await browserInstance.target()
    const page = await target.page()

    if (!page) {
      return res.status(404).json({ error: 'Page not found' })
    }

    const content = await page.content()
    const title = await page.title()
    const url = page.url()

    res.json({
      success: true,
      html: content,
      title,
      url
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

BrowserRouter.post('/cookies', async (req, res) => {
  try {
    if (!browserInstance) {
      return res.status(400).json({ error: 'Browser not running' })
    }

    const { action, cookies = [] } = req.body
    const target = await browserInstance.target()
    const page = await target.page()

    if (!page) {
      return res.status(404).json({ error: 'Page not found' })
    }

    if (action === 'get') {
      const pageCookies = await page.cookies()
      res.json({ success: true, cookies: pageCookies })
    } else if (action === 'set') {
      await page.setCookie(...cookies)
      res.json({ success: true })
    } else if (action === 'clear') {
      await page.deleteCookie()
      res.json({ success: true })
    } else {
      res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

BrowserRouter.post('/wait', async (req, res) => {
  try {
    if (!browserInstance) {
      return res.status(400).json({ error: 'Browser not running' })
    }

    const { selector, timeout = 30000 } = req.body
    const target = await browserInstance.target()
    const page = await target.page()

    if (!page) {
      return res.status(404).json({ error: 'Page not found' })
    }

    await page.waitForSelector(selector, { timeout })

    res.json({ success: true, message: `Element ${selector} found` })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

process.on('exit', async () => {
  if (browserInstance) {
    await browserInstance.close()
  }
})
