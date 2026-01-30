import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'بلٌغ dashboard',
  description: 'Admin dashboard for managing reports',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
