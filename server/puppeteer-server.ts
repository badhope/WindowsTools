import express from 'express'
import puppeteer from 'puppeteer'

const app = express()
const PORT = 3000

app.use(express.json())

interface CrawlOptions {
  url: string
  selectors: { name: string; selector: string; type: 'css' | 'xpath' }[]
  waitFor?: string
  delay?: number
  proxy?: string
  userAgent?: string
}

app.post('/api/crawl', async (req, res) => {
  const options: CrawlOptions = req.body

  if (!options.url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  let browser
  try {
    const launchOptions: any = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }

    if (options.proxy) {
      launchOptions.args.push(`--proxy-server=${options.proxy}`)
    }

    if (options.userAgent) {
      launchOptions.userAgent = options.userAgent
    }

    browser = await puppeteer.launch(launchOptions)
    const page = await browser.newPage()

    if (options.userAgent) {
      await page.setUserAgent(options.userAgent)
    }

    await page.goto(options.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    })

    if (options.waitFor) {
      await page.waitForSelector(options.waitFor, { timeout: 5000 }).catch(() => {})
    }

    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay))
    }

    const results: Record<string, any>[] = []

    if (options.selectors && options.selectors.length > 0) {
      for (const sel of options.selectors) {
        if (sel.type === 'css') {
          const elements = await page.$$(sel.selector)
          const values = await Promise.all(
            elements.map(el => page.evaluate((node: any) => {
              if (node.tagName === 'A') return node.href
              if (node.tagName === 'IMG') return node.src
              if (node.tagName === 'INPUT') return node.value
              return node.textContent?.trim() || ''
            }, el))
          )
          results.push({ [sel.name]: values })
        } else {
          const elements = await page.$x(sel.selector)
          const values = await Promise.all(
            elements.map(el => page.evaluate((node: any) => node.textContent?.trim() || '', el))
          )
          results.push({ [sel.name]: values })
        }
      }
    } else {
      const html = await page.content()
      results.push({ html })
    }

    const cookies = await page.cookies()
    const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage))

    await browser.close()

    res.json({
      success: true,
      data: results,
      meta: {
        url: options.url,
        timestamp: new Date().toISOString(),
        cookies,
        localStorage
      }
    })
  } catch (error: any) {
    if (browser) await browser.close()
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.post('/api/screenshot', async (req, res) => {
  const { url, fullPage = false, selector } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  let browser
  try {
    browser = await puppeteer.launch({ headless: 'new' })
    const page = await browser.newPage()

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    let screenshot

    if (selector) {
      const element = await page.$(selector)
      if (element) {
        screenshot = await element.screenshot({ encoding: 'base64', type: 'png' })
      } else {
        screenshot = await page.screenshot({ encoding: 'base64', type: 'png', fullPage })
      }
    } else {
      screenshot = await page.screenshot({ encoding: 'base64', type: 'png', fullPage })
    }

    await browser.close()

    res.json({
      success: true,
      data: {
        screenshot: `data:image/png;base64,${screenshot}`
      }
    })
  } catch (error: any) {
    if (browser) await browser.close()
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.post('/api/evaluate', async (req, res) => {
  const { url, script } = req.body

  if (!url || !script) {
    return res.status(400).json({ error: 'URL and script are required' })
  }

  let browser
  try {
    browser = await puppeteer.launch({ headless: 'new' })
    const page = await browser.newPage()

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    const result = await page.evaluate(script)

    await browser.close()

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    if (browser) await browser.close()
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.listen(PORT, () => {
  console.log(`VisualSpider Puppeteer Server running on http://localhost:${PORT}`)
  console.log(`API Endpoints:`)
  console.log(`  POST /api/crawl - Crawl page with selectors`)
  console.log(`  POST /api/screenshot - Take screenshot`)
  console.log(`  POST /api/evaluate - Execute JavaScript`)
})
