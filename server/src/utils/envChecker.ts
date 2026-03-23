import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { platform } from 'os'

export interface EnvStatus {
  ready: boolean
  node: { installed: boolean; version: string | null }
  npm: { installed: boolean; version: string | null }
  chromium: { installed: boolean; path: string | null; canLaunch: boolean }
  puppeteer: { installed: boolean; version: string | null }
  system: { platform: string; arch: string; memory: number | null }
  issues: string[]
  recommendations: string[]
}

export const envChecker = {
  async checkAll(): Promise<EnvStatus> {
    const status: EnvStatus = {
      ready: false,
      node: { installed: false, version: null },
      npm: { installed: false, version: null },
      chromium: { installed: false, path: null, canLaunch: false },
      puppeteer: { installed: false, version: null },
      system: {
        platform: platform(),
        arch: process.arch,
        memory: this.getSystemMemory()
      },
      issues: [],
      recommendations: []
    }

    this.checkNode(status)
    this.checkNpm(status)
    this.checkPuppeteer(status)
    this.checkChromium(status)

    status.ready = status.node.installed && status.chromium.canLaunch

    if (!status.ready) {
      if (!status.node.installed) {
        status.issues.push('Node.js is not installed')
        status.recommendations.push('Install Node.js 18+ from https://nodejs.org/')
      }
      if (!status.chromium.canLaunch) {
        status.issues.push('Chromium browser is not available')
        status.recommendations.push('Run: npm run setup-browser')
      }
    }

    return status
  },

  checkNode(status: EnvStatus): void {
    try {
      const version = execSync('node --version', { encoding: 'utf8' }).trim()
      const major = parseInt(version.replace('v', '').split('.')[0])
      status.node.installed = major >= 18
      status.node.version = version
      if (major < 18) {
        status.issues.push(`Node.js version ${major} is too old, need 18+`)
        status.recommendations.push('Upgrade Node.js to version 18 or higher')
      }
    } catch {
      status.issues.push('Node.js is not installed')
    }
  },

  checkNpm(status: EnvStatus): void {
    try {
      const version = execSync('npm --version', { encoding: 'utf8' }).trim()
      status.npm.installed = true
      status.npm.version = version
    } catch {
      status.issues.push('npm is not installed')
    }
  },

  checkPuppeteer(status: EnvStatus): void {
    try {
      const packagePath = resolve(process.cwd(), 'node_modules', 'puppeteer', 'package.json')
      if (existsSync(packagePath)) {
        const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
        status.puppeteer.installed = true
        status.puppeteer.version = pkg.version
      }
    } catch {
      status.puppeteer.installed = false
    }
  },

  checkChromium(status: EnvStatus): void {
    const possiblePaths = this.getChromiumPaths()
    for (const chromiumPath of possiblePaths) {
      if (existsSync(chromiumPath)) {
        status.chromium.installed = true
        status.chromium.path = chromiumPath
        status.chromium.canLaunch = true
        break
      }
    }

    if (!status.chromium.canLaunch) {
      const executablePath = this.detectChromiumExecutable()
      if (executablePath) {
        status.chromium.installed = true
        status.chromium.path = executablePath
        status.chromium.canLaunch = true
      }
    }
  },

  getChromiumPaths(): string[] {
    const home = process.env.HOME || process.env.USERPROFILE || ''
    const appData = process.env.APPDATA || ''

    const paths: string[] = []

    if (platform() === 'win32') {
      paths.push(
        resolve(appData, 'npm', 'node_modules', 'puppeteer', '.local-chromium', 'chrome-win', 'chrome.exe'),
        resolve(appData, 'puppeteer', 'chrome-win', 'chrome.exe'),
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      )
    } else if (platform() === 'darwin') {
      paths.push(
        resolve(home, 'node_modules', 'puppeteer', '.local-chromium', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      )
    } else {
      paths.push(
        resolve(home, 'node_modules', 'puppeteer', '.local-chromium', 'chrome-linux', 'chrome'),
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome'
      )
    }

    return paths
  },

  detectChromiumExecutable(): string | null {
    try {
      if (platform() === 'win32') {
        const result = execSync('where chrome', { encoding: 'utf8', stdio: 'pipe' })
        const paths = result.split('\n').filter(Boolean)
        return paths[0] || null
      } else {
        const result = execSync('which chromium || which chromium-browser || which google-chrome || which chrome', { encoding: 'utf8', stdio: 'pipe' })
        return result.trim() || null
      }
    } catch {
      return null
    }
  },

  getSystemMemory(): number | null {
    try {
      if (platform() === 'win32') {
        const result = execSync('wmic OS get TotalVisibleMemorySize', { encoding: 'utf8', stdio: 'pipe' })
        const lines = result.split('\n').filter(line => line.trim() && /\d+/.test(line))
        if (lines[1]) {
          return Math.round(parseInt(lines[1].trim()) / 1024)
        }
      } else {
        const result = execSync('free -k 2>/dev/null || sysctl hw.memsize 2>/dev/null', { encoding: 'utf8', stdio: 'pipe' })
        return Math.round(parseInt(result.match(/\d+/)?.[0] || '0') / 1024 / 1024)
      }
    } catch {
      return null
    }
    return null
  },

  async setupEnvironment(): Promise<{ success: boolean; message: string }> {
    const status = await this.checkAll()

    if (status.node.installed && !status.chromium.canLaunch) {
      try {
        execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' })
        return { success: true, message: 'Chromium browser installed successfully' }
      } catch (error: any) {
        return { success: false, message: `Failed to install Chromium: ${error.message}` }
      }
    }

    return { success: true, message: 'Environment is ready' }
  }
}
