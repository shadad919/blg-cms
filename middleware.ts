import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { NextRequest, NextResponse } from 'next/server'

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  // Handle /login and /dashboard redirects to default locale
  const { pathname } = request.nextUrl
  
  if (pathname === '/login' || pathname === '/dashboard' || pathname === '/posts' || pathname === '/settings') {
    const locale = routing.defaultLocale
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url))
  }
  
  return intlMiddleware(request)
}

export const config = {
  matcher: ['/', '/(de|en|ar)/:path*', '/login', '/dashboard', '/posts', '/settings'],
}
