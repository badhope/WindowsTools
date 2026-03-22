export interface SelectorCandidate {
  xpath: string
  css: string
  element: Element
  score: number
  tagName: string
  textPreview: string
}

export function getElementXPath(element: Element): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`
  }

  if (element === document.body) {
    return '/html/body'
  }

  let ix = 0
  const siblings = element.parentNode ? element.parentNode.childNodes : []
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i] as Element
    if (sibling === element) {
      const parentPath = getElementXPath(element.parentNode as Element)
      const tagName = element.tagName.toLowerCase()
      return `${parentPath}/${tagName}[${ix + 1}]`
    }
    if (sibling.nodeType === 1 && (sibling as Element).tagName === element.tagName) {
      ix++
    }
  }
  return ''
}

export function getElementCSS(element: Element): string {
  const path: string[] = []
  let current: Element | null = element

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()

    if (current.id) {
      selector = `#${CSS.escape(current.id)}`
      path.unshift(selector)
      break
    }

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c)
      if (classes.length > 0) {
        const classSelector = classes.map(c => `.${CSS.escape(c)}`).join('')
        const sameClassSiblings = (current.parentNode?.querySelectorAll(`${current.tagName.toLowerCase()}${classSelector}`) || []).length
        if (sameClassSiblings === 1) {
          selector = `${current.tagName.toLowerCase()}${classSelector}`
        } else {
          const ix = Array.from(current.parentNode?.children || []).filter(
            el => el.tagName === current?.tagName && el.className === current.className
          ).indexOf(current)
          selector = `${current.tagName.toLowerCase()}${classSelector}:nth-of-type(${ix + 1})`
        }
      }
    }

    path.unshift(selector)
    current = current.parentElement
  }

  return path.join(' > ')
}

export function xpathToCss(xpath: string): string {
  const result = xpath
    .replace(/\[(\d+)\]/g, ':nth-of-type($1)')
    .replace(/\/\//g, ' ')
    .replace(/\//g, ' > ')
    .replace(/@/g, '')
    .replace(/\[(\w+)=["']([^"']+)["']\]/g, '[$1="$2"]')
    .replace(/\[(\w+)\]/g, '[$1]')
    .replace(/::/g, ':')
    .trim()

  return result
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

export function evaluateXPath(xpath: string, context = document): Element[] {
  const result: Element[] = []
  const snapshot = document.evaluate(xpath, context, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)

  for (let i = 0; i < snapshot.snapshotLength; i++) {
    const node = snapshot.snapshotItem(i)
    if (node && node.nodeType === Node.ELEMENT_NODE) {
      result.push(node as Element)
    }
  }

  return result
}

export function evaluateCSS(css: string, context = document): Element[] {
  try {
    return Array.from(context.querySelectorAll(css))
  } catch {
    return []
  }
}

export function findSelectorCandidates(root: Element | Document = document): SelectorCandidate[] {
  const candidates: SelectorCandidate[] = []
  const elements = root.querySelectorAll('a, button, h1, h2, h3, h4, h5, h6, p, span, div, li, td, th')

  const seenSelectors = new Set<string>()

  elements.forEach(el => {
    const xpath = getElementXPath(el)
    const css = getElementCSS(el)

    if (seenSelectors.has(css)) return
    seenSelectors.add(css)

    const text = el.textContent?.trim() || ''
    const tagName = el.tagName.toLowerCase()

    let score = 1
    if (el.id) score += 5
    if (el.className && typeof el.className === 'string' && el.className.includes('title')) score += 3
    if (el.className && typeof el.className === 'string' && el.className.includes('item')) score += 2
    if (el.hasAttribute('data-id')) score += 2
    if (el.hasAttribute('data-v-*')) score += 1

    if (text.length > 0 && text.length < 200) {
      score += 2
    }

    candidates.push({
      xpath,
      css,
      element: el,
      score,
      tagName,
      textPreview: text.slice(0, 50)
    })
  })

  return candidates.sort((a, b) => b.score - a.score)
}

export function highlightElement(element: HTMLElement): () => void {
  const originalOutline = element.style.outline
  const originalTransition = element.style.transition

  element.style.outline = '3px solid #667eea'
  element.style.transition = 'outline 0.2s'

  const removeHighlight = () => {
    element.style.outline = originalOutline
    element.style.transition = originalTransition
  }

  setTimeout(removeHighlight, 2000)

  return removeHighlight
}

export function createSelectorTester(): {
  testXPath: (xpath: string) => Element[]
  testCSS: (css: string) => Element[]
  highlightAll: (elements: Element[]) => () => void
  clearHighlights: () => void
} {
  const highlights: (() => void)[] = []

  function testXPath(xpath: string): Element[] {
    clearHighlights()
    const elements = evaluateXPath(xpath)
    elements.forEach(el => highlights.push(highlightElement(el as HTMLElement)))
    return elements
  }

  function testCSS(css: string): Element[] {
    clearHighlights()
    const elements = evaluateCSS(css)
    elements.forEach(el => highlights.push(highlightElement(el as HTMLElement)))
    return elements
  }

  function highlightAll(elements: Element[]): () => void {
    const removeFuncs = elements.map(el => highlightElement(el as HTMLElement))
    highlights.push(...removeFuncs)
    return () => removeFuncs.forEach(fn => fn())
  }

  function clearHighlights() {
    highlights.forEach(fn => fn())
    highlights.length = 0
  }

  return { testXPath, testCSS, highlightAll, clearHighlights }
}

export function extractTableData(table: Element): { headers: string[]; rows: string[][] } {
  const headers: string[] = []
  const rows: string[][] = []

  const headerCells = table.querySelectorAll('th')
  headerCells.forEach(cell => {
    headers.push(cell.textContent?.trim() || '')
  })

  const bodyRows = table.querySelectorAll('tr')
  bodyRows.forEach(row => {
    const rowData: string[] = []
    const cells = row.querySelectorAll('td')
    if (cells.length > 0 || headers.length === 0) {
      cells.forEach(cell => {
        rowData.push(cell.textContent?.trim() || '')
      })
      if (rowData.length > 0) {
        rows.push(rowData)
      }
    }
  })

  return { headers, rows }
}

export function extractListItems(container: Element): string[] {
  const items: string[] = []
  const listItems = container.querySelectorAll('li')

  listItems.forEach(item => {
    const text = item.textContent?.trim() || ''
    if (text) items.push(text)
  })

  return items
}

export function extractJsonLd(element: Element): any[] {
  const scripts = element.querySelectorAll('script[type="application/ld+json"]')
  const results: any[] = []

  scripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent || '')
      results.push(data)
    } catch {}
  })

  return results
}

export function getMetaTags(element: Document | Element = document): Record<string, string> {
  const metas: Record<string, string> = {}
  const metaElements = element.querySelectorAll('meta')

  metaElements.forEach(meta => {
    const name = meta.getAttribute('name') || meta.getAttribute('property') || ''
    const content = meta.getAttribute('content') || ''
    if (name && content) {
      metas[name] = content
    }
  })

  return metas
}
