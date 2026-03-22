export interface CleanRule {
  id: string
  name: string
  type: 'regex' | 'replace' | 'trim' | 'case' | 'remove'
  pattern?: string
  replacement?: string
  enabled: boolean
}

export interface FieldMapping {
  source: string
  target: string
  rules: CleanRule[]
}

export function applyRegex(text: string, pattern: string, replacement = ''): string {
  try {
    const regex = new RegExp(pattern, 'g')
    return text.replace(regex, replacement)
  } catch {
    return text
  }
}

export function trimWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function removeHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

export function normalizeLineBreaks(text: string): string {
  return text.replace(/[\r\n]+/g, '\n')
}

export function removeEmoji(text: string): string {
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
}

export function extractNumbers(text: string): string {
  return text.replace(/[^0-9.-]/g, '')
}

export function extractChinese(text: string): string {
  return text.replace(/[^\u4e00-\u9fa5]/g, '')
}

export function extractEnglish(text: string): string {
  return text.replace(/[^a-zA-Z]/g, '')
}

export function removeUrls(text: string): string {
  return text.replace(/https?:\/\/[^\s]+/g, '')
}

export function removeEmails(text: string): string {
  return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
}

export function removeDuplicates(_text: string, allTexts: string[]): string[] {
  return [...new Set(allTexts)]
}

export function convertCase(text: string, caseType: string): string {
  switch (caseType) {
    case 'upper':
      return text.toUpperCase()
    case 'lower':
      return text.toLowerCase()
    case 'title':
      return text.replace(/\b\w/g, c => c.toUpperCase())
    case 'camel':
      return text.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    case 'snake':
      return text.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().replace(/[\s]+/g, '_')
    default:
      return text
  }
}

export function applyCleanRules(text: string, rules: CleanRule[]): string {
  let result = text

  for (const rule of rules) {
    if (!rule.enabled) continue

    switch (rule.type) {
      case 'regex':
        if (rule.pattern) {
          result = applyRegex(result, rule.pattern, rule.replacement || '')
        }
        break
      case 'replace':
        result = result.split(rule.pattern || '').join(rule.replacement || '')
        break
      case 'trim':
        result = trimWhitespace(result)
        break
      case 'case':
        break
      case 'remove':
        if (rule.pattern) {
          result = result.split(rule.pattern).join('')
        }
        break
    }
  }

  return result
}

export function cleanData(data: Record<string, any>[], mappings: FieldMapping[]): Record<string, any>[] {
  return data.map(row => {
    const cleaned: Record<string, any> = {}

    for (const mapping of mappings) {
      const sourceValue = row[mapping.source]

      if (sourceValue === undefined || sourceValue === null) {
        cleaned[mapping.target] = ''
        continue
      }

      const text = String(sourceValue)
      cleaned[mapping.target] = applyCleanRules(text, mapping.rules)
    }

    return cleaned
  })
}

export function deduplicateData(data: Record<string, any>[], keyField: string): Record<string, any>[] {
  const seen = new Set()
  return data.filter(row => {
    const key = row[keyField]
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function fillMissingValues(
  data: Record<string, any>[],
  fillStrategy: 'empty' | 'null' | 'custom' | 'forward',
  customValue?: string
): Record<string, any>[] {
  return data.map((row, index) => {
    const filled = { ...row }

    for (const key of Object.keys(filled)) {
      const value = filled[key]
      const isEmpty = value === '' || value === null || value === undefined

      if (isEmpty) {
        switch (fillStrategy) {
          case 'empty':
            filled[key] = ''
            break
          case 'null':
            filled[key] = null
            break
          case 'custom':
            filled[key] = customValue || ''
            break
          case 'forward':
            if (index > 0) {
              filled[key] = data[index - 1][key]
            }
            break
        }
      }
    }

    return filled
  })
}

export function detectFieldType(values: any[]): 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url' {
  const sample = values.filter(v => v !== null && v !== undefined && v !== '').slice(0, 10)

  if (sample.length === 0) return 'string'

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const urlRegex = /^https?:\/\/.+/i
  const dateRegex = /^\d{4}[-/]\d{2}[-/]\d{2}/
  const numberRegex = /^-?\d+(\.\d+)?$/

  const allEmail = sample.every(v => emailRegex.test(String(v)))
  if (allEmail) return 'email'

  const allUrl = sample.every(v => urlRegex.test(String(v)))
  if (allUrl) return 'url'

  const allDate = sample.every(v => dateRegex.test(String(v)))
  if (allDate) return 'date'

  const allNumber = sample.every(v => numberRegex.test(String(v)))
  if (allNumber) return 'number'

  return 'string'
}

export function validateData(
  data: Record<string, any>[],
  validations: Record<string, { type: string; pattern?: string; min?: number; max?: number; required?: boolean }>
): { valid: boolean; errors: { row: number; field: string; message: string }[] } {
  const errors: { row: number; field: string; message: string }[] = []

  data.forEach((row, index) => {
    for (const [field, rules] of Object.entries(validations)) {
      const value = row[field]

      if (rules.required && (value === null || value === undefined || value === '')) {
        errors.push({ row: index + 1, field, message: '此字段为必填项' })
        continue
      }

      if (value === null || value === undefined || value === '') continue

      const strValue = String(value)

      switch (rules.type) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
            errors.push({ row: index + 1, field, message: '邮箱格式无效' })
          }
          break
        case 'url':
          if (!/^https?:\/\/.+/i.test(strValue)) {
            errors.push({ row: index + 1, field, message: 'URL格式无效' })
          }
          break
        case 'number':
          if (!/^-?\d+(\.\d+)?$/.test(strValue)) {
            errors.push({ row: index + 1, field, message: '必须为数字' })
          } else {
            const num = parseFloat(strValue)
            if (rules.min !== undefined && num < rules.min) {
              errors.push({ row: index + 1, field, message: `数值不能小于 ${rules.min}` })
            }
            if (rules.max !== undefined && num > rules.max) {
              errors.push({ row: index + 1, field, message: `数值不能大于 ${rules.max}` })
            }
          }
          break
        case 'pattern':
          if (rules.pattern && !new RegExp(rules.pattern).test(strValue)) {
            errors.push({ row: index + 1, field, message: `格式不符合要求` })
          }
          break
      }
    }
  })

  return { valid: errors.length === 0, errors }
}

export function splitByDelimiter(text: string, delimiter: string | RegExp): string[] {
  if (typeof delimiter === 'string') {
    return text.split(delimiter).map(s => s.trim()).filter(s => s)
  }
  return text.split(delimiter).map(s => s.trim()).filter(s => s)
}

export function mergeFields(texts: string[], separator = ' '): string {
  return texts.filter(t => t).join(separator)
}

export function extractByRegex(text: string, pattern: string, groupIndex = 0): string[] {
  try {
    const regex = new RegExp(pattern, 'g')
    const matches: string[] = []
    let match

    while ((match = regex.exec(text)) !== null) {
      matches.push(match[groupIndex] || match[0])
    }

    return matches
  } catch {
    return []
  }
}

export function convertToTable(
  data: Record<string, any>[],
  columns: { key: string; header: string }[]
): { headers: string[]; rows: string[][] } {
  const headers = columns.map(c => c.header)
  const rows = data.map(item =>
    columns.map(c => {
      const value = item[c.key]
      return value === null || value === undefined ? '' : String(value)
    })
  )

  return { headers, rows }
}
