import { describe, it, expect } from 'vitest'
import {
  applyRegex,
  trimWhitespace,
  removeHtmlTags,
  normalizeLineBreaks,
  removeEmoji,
  extractNumbers,
  extractChinese,
  extractEnglish,
  removeUrls,
  removeEmails,
  removeDuplicates,
  convertCase
} from '@/utils/dataClean'

describe('dataClean', () => {
  describe('applyRegex', () => {
    it('should replace text using regex', () => {
      const result = applyRegex('hello world', 'world', 'there')
      expect(result).toBe('hello there')
    })

    it('should replace all occurrences', () => {
      const result = applyRegex('aaa bbb aaa', 'aaa', 'ccc')
      expect(result).toBe('ccc bbb ccc')
    })

    it('should return original text if pattern is invalid', () => {
      const result = applyRegex('hello', '[invalid', 'world')
      expect(result).toBe('hello')
    })
  })

  describe('trimWhitespace', () => {
    it('should trim leading and trailing whitespace', () => {
      const result = trimWhitespace('  hello  ')
      expect(result).toBe('hello')
    })

    it('should collapse multiple spaces', () => {
      const result = trimWhitespace('hello    world')
      expect(result).toBe('hello world')
    })

    it('should handle tabs and newlines', () => {
      const result = trimWhitespace('hello\t\nworld')
      expect(result).toBe('hello world')
    })
  })

  describe('removeHtmlTags', () => {
    it('should remove simple HTML tags', () => {
      const result = removeHtmlTags('<p>Hello World</p>')
      expect(result).toBe('Hello World')
    })

    it('should remove nested tags', () => {
      const result = removeHtmlTags('<div><p>Text</p></div>')
      expect(result).toBe('Text')
    })

    it('should handle self-closing tags', () => {
      const result = removeHtmlTags('Line 1<br/>Line 2')
      expect(result).toBe('Line 1Line 2')
    })
  })

  describe('normalizeLineBreaks', () => {
    it('should normalize CRLF to LF', () => {
      const result = normalizeLineBreaks('Line1\r\nLine2\r\nLine3')
      expect(result).toBe('Line1\nLine2\nLine3')
    })

    it('should normalize CR to LF', () => {
      const result = normalizeLineBreaks('Line1\rLine2\rLine3')
      expect(result).toBe('Line1\nLine2\nLine3')
    })
  })

  describe('removeEmoji', () => {
    it('should remove emoji characters', () => {
      const result = removeEmoji('Hello 👋 World 🌍')
      expect(result).toBe('Hello  World ')
    })

    it('should handle complex emoji', () => {
      const result = removeEmoji('Test 🎉🎊')
      expect(result).toBe('Test ')
    })
  })

  describe('extractNumbers', () => {
    it('should extract numbers from text', () => {
      const result = extractNumbers('abc123def456')
      expect(result).toBe('123456')
    })

    it('should preserve decimal and negative', () => {
      const result = extractNumbers('-$100.50')
      expect(result).toBe('-100.50')
    })
  })

  describe('extractChinese', () => {
    it('should extract Chinese characters', () => {
      const result = extractChinese('Hello你好World世界')
      expect(result).toBe('你好世界')
    })
  })

  describe('extractEnglish', () => {
    it('should extract English letters', () => {
      const result = extractEnglish('你好Hello世界World')
      expect(result).toBe('HelloWorld')
    })
  })

  describe('removeUrls', () => {
    it('should remove HTTP URLs', () => {
      const result = removeUrls('Visit https://example.com for info')
      expect(result).toBe('Visit  for info')
    })

    it('should remove HTTPS URLs', () => {
      const result = removeUrls('Check http://test.com now')
      expect(result).toBe('Check  now')
    })
  })

  describe('removeEmails', () => {
    it('should remove email addresses', () => {
      const result = removeEmails('Contact test@example.com please')
      expect(result).toBe('Contact  please')
    })
  })

  describe('removeDuplicates', () => {
    it('should remove duplicate strings', () => {
      const result = removeDuplicates('', ['a', 'b', 'a', 'c', 'b'])
      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('should preserve order of first occurrence', () => {
      const result = removeDuplicates('', ['c', 'a', 'b', 'a', 'c'])
      expect(result).toEqual(['c', 'a', 'b'])
    })
  })

  describe('convertCase', () => {
    it('should convert to uppercase', () => {
      const result = convertCase('hello world', 'upper')
      expect(result).toBe('HELLO WORLD')
    })

    it('should convert to lowercase', () => {
      const result = convertCase('HELLO WORLD', 'lower')
      expect(result).toBe('hello world')
    })

    it('should convert to title case', () => {
      const result = convertCase('hello world', 'title')
      expect(result).toBe('Hello World')
    })

    it('should convert to camel case', () => {
      const result = convertCase('hello_world', 'camel')
      expect(result).toBe('HelloWorld')
    })

    it('should convert to snake case', () => {
      const result = convertCase('helloWorld', 'snake')
      expect(result).toBe('hello_world')
    })
  })
})
