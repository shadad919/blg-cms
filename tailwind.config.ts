import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
        },
        background: '#F5F7FA',
        text: '#1F2937',
        success: '#16A34A',
        warning: '#F59E0B',
        critical: '#DC2626',
      },
      backgroundColor: {
        'dark-page': '#0d0d0f',
      },
    },
  },
  plugins: [],
}
export default config
