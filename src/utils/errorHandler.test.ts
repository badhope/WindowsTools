import { describe, it, expect, beforeEach } from 'vitest'
import { logger, handleError, validateUrl, validateSelector, validateFieldConfig, ERROR_CODES, ERROR_MESSAGES } from '@/utils/errorHandler'

describe('errorHandler', () => {
  beforeEach(() => {
    logger.clearLogs()
  })

  describe('ERROR_CODES', () => {
    it('should have all required error codes', () => {
      expect(ERROR_CODES.NETWORK_ERROR).toBe('E001')
      expect(ERROR_CODES.PARSE_ERROR).toBe('E002')
      expect(ERROR_CODES.SELECTOR_ERROR).toBe('E003')
      expect(ERROR_CODES.EXPORT_ERROR).toBe('E004')
      expect(ERROR_CODES.STORAGE_ERROR).toBe('E005')
      expect(ERROR_CODES.VALIDATION_ERROR).toBe('E006')
      expect(ERROR_CODES.TIMEOUT_ERROR).toBe('E007')
      expect(ERROR_CODES.AUTH_ERROR).toBe('E008')
      expect(ERROR_CODES.RATE_LIMIT_ERROR).toBe('E009')
      expect(ERROR_CODES.UNKNOWN_ERROR).toBe('E999')
    })
  })

  describe('ERROR_MESSAGES', () => {
    it('should have messages for all error codes', () => {
      Object.keys(ERROR_CODES).forEach(code => {
        expect(ERROR_MESSAGES[code]).toBeDefined()
        expect(ERROR_MESSAGES[code].code).toBe(ERROR_CODES[code as keyof typeof ERROR_CODES])
      })
    })

    it('should have valid severity levels', () => {
      Object.values(ERROR_MESSAGES).forEach(info => {
        expect(['low', 'medium', 'high', 'critical']).toContain(info.severity)
      })
    })
  })

  describe('logger', () => {
    it('should log debug messages', () => {
      const id = logger.debug('Test', 'Debug message')
      expect(id).toBeTruthy()
      const logs = logger.getLogs({ category: 'Test' })
      expect(logs[0].message).toBe('Debug message')
      expect(logs[0].level).toBe('debug')
    })

    it('should log info messages', () => {
      const id = logger.info('Test', 'Info message')
      expect(id).toBeTruthy()
      const logs = logger.getLogs({ category: 'Test' })
      expect(logs[0].message).toBe('Info message')
      expect(logs[0].level).toBe('info')
    })

    it('should log warn messages', () => {
      const id = logger.warn('Test', 'Warning message')
      expect(id).toBeTruthy()
      const logs = logger.getLogs({ category: 'Test' })
      expect(logs[0].message).toBe('Warning message')
      expect(logs[0].level).toBe('warn')
    })

    it('should log error messages with stack trace', () => {
      const id = logger.error('Test', 'Error message')
      expect(id).toBeTruthy()
      const logs = logger.getLogs({ category: 'Test' })
      expect(logs[0].message).toBe('Error message')
      expect(logs[0].level).toBe('error')
      expect(logs[0].stack).toBeDefined()
    })

    it('should log critical messages', () => {
      const id = logger.critical('Test', 'Critical message')
      expect(id).toBeTruthy()
      const logs = logger.getLogs({ category: 'Test' })
      expect(logs[0].level).toBe('critical')
    })

    it('should filter logs by level', () => {
      logger.debug('Test', 'Debug')
      logger.info('Test', 'Info')
      logger.warn('Test', 'Warn')
      logger.error('Test', 'Error')

      const errorLogs = logger.getLogs({ level: 'error' })
      expect(errorLogs.every(log => log.level === 'error' || log.level === 'critical')).toBe(true)
    })

    it('should get log statistics', () => {
      logger.debug('Test', 'Debug')
      logger.info('Test', 'Info')
      logger.info('Test', 'Info2')
      logger.warn('Test', 'Warn')
      logger.error('Test', 'Error')

      const stats = logger.getStats()
      expect(stats.debug).toBe(1)
      expect(stats.info).toBe(2)
      expect(stats.warn).toBe(1)
      expect(stats.error).toBe(1)
    })

    it('should export logs as JSON', () => {
      logger.info('Test', 'Test message')
      const exported = logger.exportLogs()
      expect(() => JSON.parse(exported)).not.toThrow()
    })

    it('should clear all logs', () => {
      logger.info('Test', 'Test message')
      logger.clearLogs()
      expect(logger.getLogs().length).toBe(0)
    })
  })

  describe('handleError', () => {
    it('should handle string errors', () => {
      const result = handleError('Network request failed', ERROR_CODES.NETWORK_ERROR)
      expect(result.code).toBe(ERROR_CODES.NETWORK_ERROR)
    })

    it('should handle Error objects', () => {
      const error = new Error('Timeout error occurred')
      const result = handleError(error, ERROR_CODES.TIMEOUT_ERROR)
      expect(result.code).toBe(ERROR_CODES.TIMEOUT_ERROR)
      expect(result.message).toBe('Timeout error occurred')
    })

    it('should handle object errors', () => {
      const error = { message: 'Custom error', code: 'E001' }
      const result = handleError(error, ERROR_CODES.UNKNOWN_ERROR)
      expect(result.message).toBe('Custom error')
    })

    it('should handle unknown errors with default code', () => {
      const result = handleError('Unknown error', ERROR_CODES.UNKNOWN_ERROR)
      expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR)
    })
  })

  describe('validateUrl', () => {
    it('should validate correct HTTP URL', () => {
      const result = validateUrl('http://example.com')
      expect(result.valid).toBe(true)
    })

    it('should validate correct HTTPS URL', () => {
      const result = validateUrl('https://example.com')
      expect(result.valid).toBe(true)
    })

    it('should validate URLs with paths', () => {
      const result = validateUrl('https://example.com/path/to/page')
      expect(result.valid).toBe(true)
    })

    it('should validate URLs with query params', () => {
      const result = validateUrl('https://example.com?foo=bar')
      expect(result.valid).toBe(true)
    })

    it('should reject empty URL', () => {
      const result = validateUrl('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('URL不能为空')
    })

    it('should reject FTP URL', () => {
      const result = validateUrl('ftp://example.com')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('仅支持HTTP和HTTPS协议')
    })

    it('should reject invalid URL format', () => {
      const result = validateUrl('not-a-url')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('无效的URL格式')
    })
  })

  describe('validateSelector', () => {
    it('should validate CSS selector', () => {
      const result = validateSelector('.class-name', 'css')
      expect(result.valid).toBe(true)
    })

    it('should validate ID selector', () => {
      const result = validateSelector('#element-id', 'css')
      expect(result.valid).toBe(true)
    })

    it('should validate tag selector', () => {
      const result = validateSelector('div', 'css')
      expect(result.valid).toBe(true)
    })

    it('should validate XPath selector starting with //', () => {
      const result = validateSelector('//div[@class="test"]', 'xpath')
      expect(result.valid).toBe(true)
    })

    it('should validate XPath selector starting with /', () => {
      const result = validateSelector('/html/body/div', 'xpath')
      expect(result.valid).toBe(true)
    })

    it('should reject empty selector', () => {
      const result = validateSelector('', 'css')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('选择器不能为空')
    })

    it('should reject invalid XPath without leading slash', () => {
      const result = validateSelector('div[@class="test"]', 'xpath')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('XPath选择器必须以/或//开头')
    })
  })

  describe('validateFieldConfig', () => {
    it('should validate correct field config', () => {
      const result = validateFieldConfig({
        name: 'title',
        selector: 'h1',
        selectorType: 'css'
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject empty field name', () => {
      const result = validateFieldConfig({
        name: '',
        selector: 'h1',
        selectorType: 'css'
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('字段名称不能为空')
    })

    it('should reject empty selector', () => {
      const result = validateFieldConfig({
        name: 'title',
        selector: '',
        selectorType: 'css'
      })
      expect(result.valid).toBe(false)
    })
  })
})
