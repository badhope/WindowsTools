import nlp from 'compromise'

export interface ExtractedEntity {
  text: string
  type: 'person' | 'place' | 'organization' | 'date' | 'money' | 'phone' | 'email' | 'url'
  start: number
  end: number
}

export interface TextSummary {
  title: string
  sentences: string[]
  keywords: string[]
  topics: string[]
  statistics: {
    words: number
    sentences: number
    paragraphs: number
  }
}

export function extractEntities(text: string): ExtractedEntity[] {
  const doc = nlp(text)
  const entities: ExtractedEntity[] = []

  try {
    const people = doc.people().out('array')
    if (Array.isArray(people)) {
      people.forEach((person: unknown) => {
        const personStr = String(person)
        entities.push({
          text: personStr,
          type: 'person',
          start: text.indexOf(personStr),
          end: text.indexOf(personStr) + personStr.length
        })
      })
    }
  } catch {}

  try {
    const places = doc.places().out('array')
    if (Array.isArray(places)) {
      places.forEach((place: unknown) => {
        const placeStr = String(place)
        entities.push({
          text: placeStr,
          type: 'place',
          start: text.indexOf(placeStr),
          end: text.indexOf(placeStr) + placeStr.length
        })
      })
    }
  } catch {}

  try {
    const orgs = doc.organizations().out('array')
    if (Array.isArray(orgs)) {
      orgs.forEach((org: unknown) => {
        const orgStr = String(org)
        entities.push({
          text: orgStr,
          type: 'organization',
          start: text.indexOf(orgStr),
          end: text.indexOf(orgStr) + orgStr.length
        })
      })
    }
  } catch {}

  try {
    const dates = doc.match('#Date').out('array')
    if (Array.isArray(dates)) {
      dates.forEach((date: unknown) => {
        const dateStr = String(date)
        entities.push({
          text: dateStr,
          type: 'date',
          start: text.indexOf(dateStr),
          end: text.indexOf(dateStr) + dateStr.length
        })
      })
    }
  } catch {}

  const moneyRegex = /[¥$€£]?\s*\d+(?:,\d{3})*(?:\.\d{2})?|[零一二三四五六七八九十百千万亿]+(?:元|块|美元|人民币)?/g
  let match
  while ((match = moneyRegex.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'money',
      start: match.index,
      end: match.index + match[0].length
    })
  }

  const phoneRegex = /1[3-9]\d{9}|(?:\+?86)?[\s-]?\(?\d{3,4}\)?[\s-]?\d{7,8}/g
  while ((match = phoneRegex.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'phone',
      start: match.index,
      end: match.index + match[0].length
    })
  }

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  while ((match = emailRegex.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'email',
      start: match.index,
      end: match.index + match[0].length
    })
  }

  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g
  while ((match = urlRegex.exec(text)) !== null) {
    entities.push({
      text: match[0],
      type: 'url',
      start: match.index,
      end: match.index + match[0].length
    })
  }

  return entities
}

export function extractKeywords(text: string, maxKeywords = 10): string[] {
  const doc = nlp(text)
  const terms = doc.terms().out('array') as string[]

  const stopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'of', 'in', 'to', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
    'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not', 'only', 'own', 'same', 'than',
    'this', 'that', 'these', 'those', 'it', 'its'
  ])

  const wordCount: Record<string, number> = {}
  terms.forEach(word => {
    const normalized = word.toLowerCase().replace(/[^\w]/g, '')
    if (normalized.length > 2 && !stopWords.has(normalized)) {
      wordCount[normalized] = (wordCount[normalized] || 0) + 1
    }
  })

  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word)
}

export function summarizeText(text: string, maxSentences = 5): TextSummary {
  const doc = nlp(text)

  const sentences = doc.sentences().out('array')
  const sentenceArray = Array.isArray(sentences) ? sentences as string[] : []
  const topics = doc.topics().out('array')
  const topicArray = Array.isArray(topics) ? topics as string[] : []
  const keywords = extractKeywords(text, 10)

  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim())

  const terms = doc.terms().out('array')
  const termArray = Array.isArray(terms) ? terms : []

  const title = sentenceArray[0]?.slice(0, 100) || ''

  return {
    title,
    sentences: sentenceArray.slice(0, maxSentences),
    keywords,
    topics: topicArray,
    statistics: {
      words: termArray.length,
      sentences: sentenceArray.length,
      paragraphs: paragraphs.length
    }
  }
}

export function sentimentAnalysis(text: string): { score: number; label: 'positive' | 'negative' | 'neutral' } {
  const doc = nlp(text)

  const positiveWords = ['好', '棒', '优秀', '喜欢', '赞', '美', '妙', '完美', '棒极了', '太好了',
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'awesome', 'perfect']
  const negativeWords = ['差', '坏', '糟', '烂', '垃圾', '讨厌', '丑', '可恶', '可怕', '失望',
    'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointing', 'poor', 'sad', 'angry']

  const terms = doc.terms().out('array')
  const termArray = Array.isArray(terms) ? terms : []
  let score = 0

  termArray.forEach((word: unknown) => {
    const lower = String(word).toLowerCase()
    if (positiveWords.some(pw => lower.includes(pw))) score += 1
    if (negativeWords.some(nw => lower.includes(nw))) score -= 1
  })

  const normalized = Math.max(-1, Math.min(1, score / Math.max(termArray.length, 1)))

  let label: 'positive' | 'negative' | 'neutral'
  if (normalized > 0.1) label = 'positive'
  else if (normalized < -0.1) label = 'negative'
  else label = 'neutral'

  return { score: normalized, label }
}

export function detectLanguage(text: string): 'zh' | 'en' | 'mixed' {
  const chineseRegex = /[\u4e00-\u9fa5]/g
  const englishRegex = /[a-zA-Z]/g

  const chineseCount = (text.match(chineseRegex) || []).length
  const englishCount = (text.match(englishRegex) || []).length

  if (chineseCount > englishCount * 2) return 'zh'
  if (englishCount > chineseCount * 2) return 'en'
  return 'mixed'
}

export function extractByRegex(text: string, pattern: string, groupIndex = 0): string[] {
  const regex = new RegExp(pattern, 'g')
  const matches: string[] = []
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match[groupIndex] !== undefined) {
      matches.push(match[groupIndex])
    }
  }

  return matches
}
