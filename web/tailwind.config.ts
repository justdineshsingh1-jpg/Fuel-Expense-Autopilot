import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1565C0',
          dark: '#0D47A1',
          light: '#42A5F5',
        },
        accent: {
          DEFAULT: '#FF6F00',
          dark: '#E65100',
          light: '#FF8F00',
        },
        status: {
          draft: '#9CA3AF',
          pending: '#F59E0B',
          approved: '#10B981',
          rejected: '#EF4444',
          flagged: '#F97316',
        }
      },
    },
  },
  plugins: [],
}
export default config
