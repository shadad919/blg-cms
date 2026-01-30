import { format, type Locale } from 'date-fns'
import {ar} from 'date-fns/locale/ar'
import {de} from 'date-fns/locale/de'
import {enUS} from 'date-fns/locale/en-US'

const localeMap: Record<string, Locale> = {
  ar,
  de,
  en: enUS,
}

/** Map next-intl locale (e.g. 'ar', 'en', 'de') to date-fns Locale */
export function getDateFnsLocale(locale: string): Locale {
  return localeMap[locale] ?? enUS
}

/** Format a date using the app locale (month/day names etc. in that language) */
export function formatLocaleDate(
  date: Date | string | number,
  formatStr: string,
  locale: string
): string {
  const d = typeof date === 'object' && 'getTime' in date ? date : new Date(date)
  return format(d, formatStr, { locale: getDateFnsLocale(locale) })
}
