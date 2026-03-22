const VisualSpiderExtension = {
  isSelecting: false,
  selectedElements: [],

  init() {
    this.createPanel()
    this.bindEvents()
  },

  createPanel() {
    const panel = document.createElement('div')
    panel.id = 'visual-spider-panel'
    panel.innerHTML = `
      <div class="vsp-header">
        <span>VisualSpider</span>
        <button class="vsp-close">&times;</button>
      </div>
      <div class="vsp-content">
        <div class="vsp-section">
          <h4>快速操作</h4>
          <button class="vsp-btn" data-action="extract-tables">提取表格</button>
          <button class="vsp-btn" data-action="extract-lists">提取列表</button>
          <button class="vsp-btn" data-action="extract-links">提取链接</button>
          <button class="vsp-btn" data-action="extract-images">提取图片</button>
        </div>
        <div class="vsp-section">
          <h4>选择器模式</h4>
          <button class="vsp-btn vsp-btn-primary" data-action="start-selector">开始选择</button>
          <button class="vsp-btn" data-action="stop-selector">停止选择</button>
        </div>
        <div class="vsp-section">
          <h4>页面信息</h4>
          <div class="vsp-info" id="vsp-page-info"></div>
        </div>
        <div class="vsp-section">
          <h4>导出选项</h4>
          <select id="vsp-export-format">
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="html">HTML</option>
          </select>
          <button class="vsp-btn vsp-btn-success" data-action="export-data">导出数据</button>
        </div>
      </div>
    `
    document.body.appendChild(panel)
    this.panel = panel
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]')
      if (btn) {
        const action = btn.dataset.action
        this.handleAction(action)
      }
    })

    this.panel.querySelector('.vsp-close').addEventListener('click', () => {
      this.panel.style.display = 'none'
    })
  },

  handleAction(action) {
    switch (action) {
      case 'extract-tables':
        this.extractTables()
        break
      case 'extract-lists':
        this.extractLists()
        break
      case 'extract-links':
        this.extractLinks()
        break
      case 'extract-images':
        this.extractImages()
        break
      case 'start-selector':
        this.startSelector()
        break
      case 'stop-selector':
        this.stopSelector()
        break
      case 'export-data':
        this.exportData()
        break
    }
  },

  extractTables() {
    const tables = document.querySelectorAll('table')
    const results = []

    tables.forEach((table, idx) => {
      const rows = table.querySelectorAll('tr')
      const tableData = []

      rows.forEach(row => {
        const cells = row.querySelectorAll('th, td')
        const rowData = Array.from(cells).map(c => c.textContent?.trim() || '')
        if (rowData.some(c => c)) {
          tableData.push(rowData)
        }
      })

      if (tableData.length > 0) {
        results.push({
          index: idx,
          data: tableData
        })
      }
    })

    this.showResults('表格数据', results)
  },

  extractLists() {
    const lists = document.querySelectorAll('ul, ol')
    const results = []

    lists.forEach((list, idx) => {
      const items = list.querySelectorAll('li')
      const listData = Array.from(items).map(li => li.textContent?.trim() || '').filter(t => t)

      if (listData.length > 0) {
        results.push({
          index: idx,
          tag: list.tagName.toLowerCase(),
          items: listData
        })
      }
    })

    this.showResults('列表数据', results)
  },

  extractLinks() {
    const links = document.querySelectorAll('a[href]')
    const results = []

    links.forEach((link, idx) => {
      results.push({
        index: idx,
        text: link.textContent?.trim() || '',
        href: link.href,
        title: link.title || ''
      })
    })

    this.showResults('链接数据', results.slice(0, 100))
  },

  extractImages() {
    const images = document.querySelectorAll('img[src]')
    const results = []

    images.forEach((img, idx) => {
      results.push({
        index: idx,
        alt: img.alt || '',
        src: img.src,
        width: img.width,
        height: img.height
      })
    })

    this.showResults('图片数据', results.slice(0, 50))
  },

  startSelector() {
    this.isSelecting = true
    document.body.style.cursor = 'crosshair'

    const overlay = document.createElement('div')
    overlay.id = 'vsp-selector-overlay'
    document.body.appendChild(overlay)

    document.addEventListener('mouseover', this.highlightElement.bind(this))
    document.addEventListener('mouseout', this.unhighlightElement.bind(this))
    document.addEventListener('click', this.selectElement.bind(this), true)
  },

  stopSelector() {
    this.isSelecting = false
    document.body.style.cursor = ''

    const overlay = document.getElementById('vsp-selector-overlay')
    if (overlay) overlay.remove()

    document.removeEventListener('mouseover', this.highlightElement.bind(this))
    document.removeEventListener('mouseout', this.unhighlightElement.bind(this))
    document.removeEventListener('click', this.selectElement.bind(this), true)
  },

  highlightElement(e) {
    if (!this.isSelecting) return
    e.target.style.outline = '2px solid #667eea'
  },

  unhighlightElement(e) {
    if (!this.isSelecting) return
    e.target.style.outline = ''
  },

  selectElement(e) {
    if (!this.isSelecting) return
    e.preventDefault()
    e.stopPropagation()

    const el = e.target
    el.style.outline = '3px solid #764ba2'

    this.selectedElements.push({
      tag: el.tagName.toLowerCase(),
      css: this.getCSSSelector(el),
      xpath: this.getXPath(el),
      text: el.textContent?.trim().slice(0, 100)
    })

    el.removeAttribute('style')
    this.showResults('已选择元素', this.selectedElements)
  },

  getCSSSelector(el) {
    const path = []
    while (el && el !== document.body) {
      let selector = el.tagName.toLowerCase()
      if (el.id) {
        selector = `#${el.id}`
        path.unshift(selector)
        break
      }
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).slice(0, 2).join('.')
        if (classes) selector += `.${classes}`
      }
      path.unshift(selector)
      el = el.parentElement
    }
    return path.join(' > ')
  },

  getXPath(el) {
    if (el.id) return `//*[@id="${el.id}"]`
    if (el === document.body) return '/html/body'

    let ix = 0
    const siblings = el.parentNode ? el.parentNode.childNodes : []
    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i] === el) {
        const parentPath = this.getXPath(el.parentNode)
        return `${parentPath}/${el.tagName.toLowerCase()}[${ix + 1}]`
      }
      if (siblings[i].nodeType === 1 && siblings[i].tagName === el.tagName) {
        ix++
      }
    }
    return ''
  },

  showResults(title, data) {
    let resultsDiv = document.getElementById('vsp-results')
    if (!resultsDiv) {
      resultsDiv = document.createElement('div')
      resultsDiv.id = 'vsp-results'
      this.panel.querySelector('.vsp-content').appendChild(resultsDiv)
    }

    resultsDiv.innerHTML = `
      <div class="vsp-results-header">
        <h4>${title}</h4>
        <span class="vsp-count">${Array.isArray(data) ? data.length : 1} 条</span>
      </div>
      <pre>${JSON.stringify(data, null, 2).slice(0, 2000)}</pre>
    `
  },

  exportData() {
    const format = document.getElementById('vsp-export-format').value
    const resultsEl = document.querySelector('#vsp-results pre')
    if (!resultsEl) {
      alert('没有可导出的数据')
      return
    }

    try {
      const data = JSON.parse(resultsEl.textContent || '[]')
      let content, mimeType, filename

      if (format === 'json') {
        content = JSON.stringify(data, null, 2)
        mimeType = 'application/json'
        filename = 'visual-spider-export.json'
      } else if (format === 'csv') {
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
          const headers = Object.keys(data[0])
          const rows = [headers.join(',')]
          data.forEach(row => {
            rows.push(headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
          })
          content = rows.join('\n')
        } else {
          content = data.join('\n')
        }
        mimeType = 'text/csv'
        filename = 'visual-spider-export.csv'
      } else {
        content = `<table>${resultsEl.innerHTML}</table>`
        mimeType = 'text/html'
        filename = 'visual-spider-export.html'
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  VisualSpiderExtension.init()
})
