import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BLG Admin Dashboard',
  description: 'Admin dashboard for managing posts',
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
