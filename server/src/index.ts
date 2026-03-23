import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { CrawlerRouter } from './routes/crawler.js'
import { BrowserRouter } from './routes/browser.js'
import { ProxyRouter } from './routes/proxy.js'
import { logger } from './utils/logger.js'
import { envChecker } from './utils/envChecker.js'

config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip })
  next()
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

app.get('/api/status', async (req, res) => {
  try {
    const envStatus = await envChecker.checkAll()
    res.json(envStatus)
  } catch (error) {
    logger.error('Status check failed', { error })
    res.status(500).json({ error: 'Status check failed' })
  }
})

app.use('/api/crawler', CrawlerRouter)
app.use('/api/browser', BrowserRouter)
app.use('/api/proxy', ProxyRouter)

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Server error', { error: err.message, stack: err.stack })
  res.status(500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'SERVER_ERROR'
  })
})

async function start() {
  try {
    logger.info('Starting VisualSpider Server...')

    const envStatus = await envChecker.checkAll()
    logger.info('Environment status', envStatus)

    if (!envStatus.ready) {
      logger.warn('Environment not fully ready, server will start with limited functionality')
    }

    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`)
      logger.info(`API documentation: http://localhost:${PORT}/api/health`)
    })
  } catch (error) {
    logger.error('Failed to start server', { error })
    process.exit(1)
  }
}

start()
