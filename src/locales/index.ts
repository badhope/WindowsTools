import { createI18n } from 'vue-i18n'
import en from './en.json'
import zhCN from './zh-CN.json'

export type MessageSchema = typeof en

const savedLocale = localStorage.getItem('visual-spider-locale') || 'en'

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: {
    'en': en,
    'zh-CN': zhCN
  }
})

export function setLocale(locale: 'en' | 'zh-CN'): void {
  (i18n.global as any).locale.value = locale
  localStorage.setItem('visual-spider-locale', locale)
  document.documentElement.setAttribute('lang', locale)
}

export function getLocale(): 'en' | 'zh-CN' {
  return (i18n.global as any).locale.value as 'en' | 'zh-CN'
}

export function toggleLocale(): void {
  const current = getLocale()
  const newLocale = current === 'en' ? 'zh-CN' : 'en'
  setLocale(newLocale)
}

export default i18n
