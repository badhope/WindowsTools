import { Router } from 'express'
import axios from 'axios'
import { logger } from '../utils/logger.js'

export const ProxyRouter = Router()

interface ProxyConfig {
  host: string
  port: number
  protocol?: 'http' | 'https' | 'socks4' | 'socks5'
  username?: string
  password?: string
}

const proxyPool: Map<string, ProxyConfig & { lastUsed?: number; failed?: number; latency?: number }> = new Map()
let currentProxyIndex = 0

ProxyRouter.get('/list', (req, res) => {
  const proxies = Array.from(proxyPool.entries()).map(([id, config]) => ({
    id,
    ...config
  }))
  res.json({ proxies })
})

ProxyRouter.post('/add', (req, res) => {
  const { host, port, protocol = 'http', username, password } = req.body

  if (!host || !port) {
    return res.status(400).json({ error: 'Host and port are required' })
  }

  const id = `${host}:${port}`
  const config: ProxyConfig & { lastUsed?: number; failed?: number } = {
    host,
    port,
    protocol,
    username,
    password
  }

  proxyPool.set(id, config)

  logger.info(`Proxy added: ${id}`)

  res.json({ success: true, id, ...config })
})

ProxyRouter.delete('/remove/:id', (req, res) => {
  const { id } = req.params
  const deleted = proxyPool.delete(id)

  if (deleted) {
    logger.info(`Proxy removed: ${id}`)
  }

  res.json({ success: deleted })
})

ProxyRouter.post('/test/:id', async (req, res) => {
  const { id } = req.params
  const proxy = proxyPool.get(id)

  if (!proxy) {
    return res.status(404).json({ error: 'Proxy not found' })
  }

  const startTime = Date.now()

  try {
    const response = await axios.get('https://httpbin.org/ip', {
      proxy: {
        host: proxy.host,
        port: proxy.port,
        auth: proxy.username ? { username: proxy.username, password: proxy.password || '' } : undefined
      },
      timeout: 10000
    })

    const latency = Date.now() - startTime
    proxy.latency = latency
    proxy.failed = 0

    res.json({
      success: true,
      latency,
      ip: response.data?.origin,
      proxy: id
    })
  } catch (error: any) {
    proxy.failed = (proxy.failed || 0) + 1

    res.status(400).json({
      success: false,
      error: error.message,
      proxy: id
    })
  }
})

ProxyRouter.post('/test-all', async (req, res) => {
  const results: any[] = []

  for (const [id, proxy] of proxyPool.entries()) {
    const startTime = Date.now()

    try {
      const response = await axios.get('https://httpbin.org/ip', {
        proxy: {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.username ? { username: proxy.username, password: proxy.password || '' } : undefined
        },
        timeout: 10000
      })

      proxy.latency = Date.now() - startTime
      proxy.failed = 0

      results.push({
        id,
        ...proxy,
        success: true,
        latency: proxy.latency,
        ip: response.data?.origin
      })
    } catch (error: any) {
      proxy.failed = (proxy.failed || 0) + 1

      results.push({
        id,
        ...proxy,
        success: false,
        error: error.message
      })
    }
  }

  res.json({ results })
})

ProxyRouter.get('/next', (req, res) => {
  const available = Array.from(proxyPool.entries())
    .filter(([_, p]) => (p.failed || 0) < 3)
    .map(([id, config]) => ({ id, ...config }))

  if (available.length === 0) {
    return res.status(404).json({ error: 'No available proxies' })
  }

  currentProxyIndex = (currentProxyIndex + 1) % available.length
  const selected = available[currentProxyIndex]

  const proxy = proxyPool.get(selected.id)
  if (proxy) {
    proxy.lastUsed = Date.now()
  }

  res.json(selected)
})

ProxyRouter.post('/clear', (req, res) => {
  proxyPool.clear()
  currentProxyIndex = 0
  logger.info('Proxy pool cleared')
  res.json({ success: true })
})

ProxyRouter.post('/load-file', async (req, res) => {
  const { content, format = 'txt' } = req.body

  if (!content) {
    return res.status(400).json({ error: 'Content is required' })
  }

  const lines = content.split('\n').filter(line => line.trim())
  let added = 0

  for (const line of lines) {
    try {
      let proxy: ProxyConfig

      if (line.includes('@')) {
        const [creds, hostPort] = line.split('@')
        const [username, password] = creds.split(':')
        const [host, portStr] = hostPort.split(':')
        proxy = { host, port: parseInt(portStr), protocol: 'http', username, password }
      } else if (line.includes('://')) {
        const url = new URL(line)
        proxy = {
          host: url.hostname,
          port: parseInt(url.port),
          protocol: url.protocol.replace(':', '') as any,
          username: url.username || undefined,
          password: url.password || undefined
        }
      } else {
        const [host, portStr] = line.split(':')
        proxy = { host, port: parseInt(portStr), protocol: 'http' }
      }

      const id = `${proxy.host}:${proxy.port}`
      proxyPool.set(id, proxy)
      added++
    } catch (e) {
      logger.warn(`Failed to parse proxy line: ${line}`)
    }
  }

  logger.info(`Loaded ${added} proxies`)

  res.json({ success: true, added, total: proxyPool.size })
})
