import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import ThemeProvider from '@/components/ThemeProvider'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var d = document.documentElement;
    var s = localStorage.getItem('settings-storage');
    var theme = 'system';
    var primaryColor = '#0D9488';
    if (s) {
      var j = JSON.parse(s);
      if (j && j.state) {
        if (j.state.theme) theme = j.state.theme;
        if (j.state.primaryColor) primaryColor = j.state.primaryColor;
      }
    }
    var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    d.classList.add(isDark ? 'dark' : 'light');
    d.style.setProperty('--color-primary', primaryColor);
    var num = parseInt(primaryColor.slice(1), 16);
    var r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
    var lightR = Math.min(255, Math.round(r * 1.15)), lightG = Math.min(255, Math.round(g * 1.15)), lightB = Math.min(255, Math.round(b * 1.15));
    var darkR = Math.round(r * 0.92), darkG = Math.round(g * 0.92), darkB = Math.round(b * 0.92);
    d.style.setProperty('--color-primary-light', '#' + (0x1000000 + lightR * 0x10000 + lightG * 0x100 + lightB).toString(16).slice(1));
    d.style.setProperty('--color-primary-dark', '#' + (0x1000000 + darkR * 0x10000 + darkG * 0x100 + darkB).toString(16).slice(1));
  } catch (e) {}
})();
            `.trim(),
          }}
        />
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
