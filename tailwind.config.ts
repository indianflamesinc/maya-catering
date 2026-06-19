import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // FIX-096 (Jun 19 2026): White theme.
        // IMPORTANT: 'ink' is used TWO different ways in this codebase:
        //   - bg-ink (28 instances): page/section background -> needs to be the new white
        //   - text-ink (28 instances): dark text on gold/amber BUTTON backgrounds -> needs to STAY DARK
        // These conflict once we go light-themed, so 'ink' stays dark (serves text-ink),
        // and a NEW token 'paper' is introduced for the white page background.
        // All 28 bg-ink instances were mechanically replaced with bg-paper (FIX-096) —
        // see CHANGELOG for the exact find/replace and verification count.
        ink: '#1A1A1A',           // STAYS DARK — used for text-ink (text on gold buttons)
        paper: '#FFFFFF',         // NEW — replaces bg-ink as the page background
        royal: '#FAF7EF',         // was #0A1530 (card bg) -> soft warm white
        'royal-mid': '#F3ECDA',   // was #0F1E40 (header/section bg) -> warm parchment tone
        gold: '#B8923A',          // was #C9A84C -> darkened for AA contrast on white (4.5:1+ at full opacity)
        'gold-hi': '#9C7A2E',     // was #E2C87A (hover/emphasis) -> darker still for hover states
        'gold-pale': '#D9BC74',   // was #F3E4B5 -> mid-tone, used sparingly for soft accents
        cream: '#1A1A1A',         // was #F6EDD8 (light text) -> near-black primary text
        parchment: '#F2E8CC',     // unchanged — already a light tone, still useful as-is
      },
      fontFamily: {
        jost: ['var(--font-jost)', 'sans-serif'],
        italiana: ['var(--font-italiana)', 'serif'],
        cormorant: ['var(--font-cormorant)', 'serif'],
        cinzel: ['var(--font-cinzel)', 'serif'],
      },
      boxShadow: {
        // FIX-096: glow effect toned down for white bg — a strong gold halo that read as
        // dramatic against dark navy looks like a muddy blur against white. Reduced
        // opacity and updated hex to match the new gold.
        gold: '0 0 24px rgba(184,146,58,0.18)',
      },
    },
  },
  plugins: [],
}
export default config
