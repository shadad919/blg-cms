import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  locales: ['en', 'de', 'ar'],
  defaultLocale: 'ar',
})

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)
