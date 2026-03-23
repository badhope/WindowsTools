#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { platform } from 'os'
import * as https from 'https'
import * as http from 'http'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '..', '..')

interface SetupResult {
  success: boolean
  message: string
  details?: any
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = existsSync(dest) ? require('fs').createWriteStream(dest) : require('fs').createWriteStream(dest)
    const protocol = url.startsWith('https') ? https : http

    protocol.get(url, (response: any) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject)
      }
      response.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', (err: Error) => {
      require('fs').unlink(dest, () => {})
      reject(err)
    })
  })
}

export async function autoSetup(): Promise<SetupResult> {
  console.log('🔍 开始自动环境检测与配置...\n')

  const results: SetupResult[] = []

  console.log('📦 检查 Node.js 环境...')
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim()
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim()
    console.log(`   Node.js: ${nodeVersion}`)
    console.log(`   npm: ${npmVersion}`)
    results.push({ success: true, message: `Node.js ${nodeVersion} 已安装` })
  } catch {
    console.log('   ❌ Node.js 未安装')
    results.push({
      success: false,
      message: 'Node.js 未安装，请从 https://nodejs.org/ 下载安装'
    })
  }

  console.log('\n📦 检查 Chromium 浏览器...')
  let chromiumPath = findChromium()
  if (chromiumPath) {
    console.log(`   ✅ 找到 Chromium: ${chromiumPath}`)
    results.push({ success: true, message: `Chromium: ${chromiumPath}` })
  } else {
    console.log('   ❌ 未找到 Chromium')
    console.log('   正在尝试安装 Puppeteer Chromium...')
    try {
      execSync('cd "' + rootDir + '" && npx puppeteer browsers install chrome', { stdio: 'inherit' })
      chromiumPath = findChromium()
      if (chromiumPath) {
        console.log(`   ✅ Chromium 安装成功: ${chromiumPath}`)
        results.push({ success: true, message: 'Chromium 安装成功' })
      }
    } catch (error: any) {
      console.log(`   ❌ Chromium 安装失败: ${error.message}`)
      results.push({ success: false, message: `Chromium 安装失败: ${error.message}` })
    }
  }

  console.log('\n📦 检查服务器依赖...')
  const serverDir = resolve(rootDir, 'server')
  if (!existsSync(resolve(serverDir, 'node_modules'))) {
    console.log('   正在安装服务器依赖...')
    try {
      execSync('cd "' + serverDir + '" && npm install', { stdio: 'inherit' })
      console.log('   ✅ 服务器依赖安装成功')
      results.push({ success: true, message: '服务器依赖安装成功' })
    } catch (error: any) {
      console.log(`   ❌ 服务器依赖安装失败: ${error.message}`)
      results.push({ success: false, message: `服务器依赖安装失败: ${error.message}` })
    }
  } else {
    console.log('   ✅ 服务器依赖已安装')
    results.push({ success: true, message: '服务器依赖已安装' })
  }

  console.log('\n📦 创建环境配置文件...')
  const envContent = `PORT=3000
NODE_ENV=development
LOG_LEVEL=info
`
  writeFileSync(resolve(serverDir, '.env'), envContent)
  console.log('   ✅ .env 文件已创建')

  const allSuccess = results.every(r => r.success)

  console.log('\n' + '='.repeat(50))
  if (allSuccess) {
    console.log('✅ 环境配置完成！')
  } else {
    console.log('⚠️  环境配置部分完成，请检查上述错误')
  }
  console.log('='.repeat(50))

  return {
    success: allSuccess,
    message: allSuccess ? '环境配置完成' : '环境配置部分完成',
    details: results
  }
}

function findChromium(): string | null {
  const { execSync } = require('child_process')
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const appData = process.env.APPDATA || ''

  const possiblePaths = platform() === 'win32' ? [
    resolve(appData, 'npm', 'node_modules', 'puppeteer', '.local-chromium', 'chrome-win', 'chrome.exe'),
    resolve(appData, 'puppeteer', 'chrome-win', 'chrome.exe'),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Chromium\\Application\\chrome.exe',
  ] : platform() === 'darwin' ? [
    resolve(home, 'Library', 'Caches', 'puppeteer', 'chromium', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ] : [
    resolve(home, '.cache', 'puppeteer', 'chromium', 'chrome-linux', 'chrome'),
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ]

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p
    }
  }

  try {
    if (platform() === 'win32') {
      const result = execSync('where chrome 2>nul || where chromium 2>nul', { encoding: 'utf8', stdio: 'pipe' })
      const paths = result.split('\n').filter(Boolean)
      return paths[0]?.trim() || null
    } else {
      const result = execSync('which chromium || which chromium-browser || which google-chrome || which chrome 2>/dev/null', { encoding: 'utf8', stdio: 'pipe' })
      return result.trim() || null
    }
  } catch {
    return null
  }
}

autoSetup().then(result => {
  process.exit(result.success ? 0 : 1)
}).catch(err => {
  console.error('Setup failed:', err)
  process.exit(1)
})
