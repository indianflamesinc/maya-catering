import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#05091A',
        royal: '#0A1530',
        'royal-mid': '#0F1E40',
        gold: '#C9A84C',
        'gold-hi': '#E2C87A',
        'gold-pale': '#F3E4B5',
        cream: '#F6EDD8',
        parchment: '#F2E8CC',
      },
      fontFamily: {
        jost: ['var(--font-jost)', 'sans-serif'],
        italiana: ['var(--font-italiana)', 'serif'],
        cormorant: ['var(--font-cormorant)', 'serif'],
        cinzel: ['var(--font-cinzel)', 'serif'],
      },
      boxShadow: {
        gold: '0 0 36px rgba(201,168,76,0.3)',
      },
    },
  },
  plugins: [],
}
export default config
