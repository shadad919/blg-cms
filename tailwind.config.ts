import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A8A',
          light: '#3B5BA8',
          dark: '#1E40AF',
        },
        background: '#F5F7FA',
        text: '#1F2937',
        success: '#16A34A',
        warning: '#F59E0B',
        critical: '#DC2626',
      },
    },
  },
  plugins: [],
}
export default config
