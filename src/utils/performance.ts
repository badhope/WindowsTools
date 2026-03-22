export interface CacheEntry<T> {
  value: T
  timestamp: number
  expiresAt: number
}

export class MemoryCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private defaultTTL: number

  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTL
  }

  set(key: string, value: T, ttl?: number): void {
    const now = Date.now()
    this.cache.set(key, {
      value,
      timestamp: now,
      expiresAt: now + (ttl || this.defaultTTL)
    })
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    return entry.value
  }

  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    this.cleanup()
    return this.cache.size
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

export interface BatchOptions {
  concurrency?: number
  delay?: number
}

export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchOptions = {}
): Promise<R[]> {
  const concurrency = options.concurrency || 5
  const delay = options.delay || 0
  const results: R[] = new Array(items.length)
  let index = 0

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++
      results[currentIndex] = await processor(items[currentIndex])
      if (delay > 0 && index < items.length) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker())

  await Promise.all(workers)
  return results
}

export function createLazyProxy<T extends object>(
  handler: () => T
): T {
  let instance: T | null = null

  return new Proxy({} as T, {
    get(_target, prop) {
      if (!instance) {
        instance = handler()
      }
      const value = (instance as any)[prop]
      if (typeof value === 'function') {
        return value.bind(instance)
      }
      return value
    }
  })
}

export interface PoolOptions<T> {
  create: () => Promise<T>
  destroy: (resource: T) => Promise<void>
  validate?: (resource: T) => Promise<boolean>
  min?: number
  max?: number
}

export class ResourcePool<T> {
  private available: T[] = []
  private inUse: Set<T> = new Set()
  private readonly create: () => Promise<T>
  private readonly destroy: (resource: T) => Promise<void>
  private readonly validate?: (resource: T) => Promise<boolean>
  private readonly min: number
  private readonly max: number
  private pending = 0

  constructor(options: PoolOptions<T>) {
    this.create = options.create
    this.destroy = options.destroy
    this.validate = options.validate
    this.min = options.min || 0
    this.max = options.max || 10
  }

  async acquire(): Promise<T> {
    while (this.available.length > 0) {
      const resource = this.available.pop()!
      if (this.validate) {
        const isValid = await this.validate(resource)
        if (isValid) {
          this.inUse.add(resource)
          return resource
        }
        await this.destroy(resource)
      } else {
        this.inUse.add(resource)
        return resource
      }
    }

    if (this.pending >= this.max) {
      await new Promise<void>(resolve => {
        const checkInterval = setInterval(() => {
          if (this.available.length > 0 || this.pending < this.max) {
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)
      })
      return this.acquire()
    }

    this.pending++
    try {
      const resource = await this.create()
      this.inUse.add(resource)
      return resource
    } finally {
      this.pending--
    }
  }

  async release(resource: T): Promise<void> {
    if (!this.inUse.has(resource)) return

    this.inUse.delete(resource)

    if (this.validate) {
      const isValid = await this.validate(resource)
      if (!isValid) {
        await this.destroy(resource)
        return
      }
    }

    this.available.push(resource)
  }

  async destroyAll(): Promise<void> {
    const all = [...this.available, ...this.inUse]
    this.available = []
    this.inUse.clear()

    await Promise.all(all.map(r => this.destroy(r)))
  }

  async initialize(): Promise<void> {
    const initialResources = []
    for (let i = 0; i < this.min; i++) {
      initialResources.push(this.create())
    }
    const resources = await Promise.all(initialResources)
    this.available.push(...resources)
  }

  get stats() {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      pending: this.pending
    }
  }
}

export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  ttl: number = 60000
): T {
  const cache = new MemoryCache<T>(ttl)

  return ((...args: any[]) => {
    const key = JSON.stringify(args)
    const cached = cache.get(key)
    if (cached !== undefined) {
      return cached
    }
    const result = fn(...args)
    if (result instanceof Promise) {
      return result.then((res: any) => {
        cache.set(key, res)
        return res
      })
    }
    cache.set(key, result)
    return result
  }) as T
}

export class EventBus<T extends Record<string, any>> {
  private listeners: Map<keyof T, Set<Function>> = new Map()

  on<K extends keyof T>(event: K, handler: (data: T[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)

    return () => this.off(event, handler)
  }

  off<K extends keyof T>(event: K, handler: (data: T[K]) => void): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error)
        }
      })
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}
