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
        gold: '#8A6A1F',          // FIX-097 (Jun 19 2026): darkened again from #B8923A (2.91:1) to
                                   // #8A6A1F (5.05:1) — gold is used standalone as category pill labels,
                                   // section headings, etc. on white, not just inside colored badges,
                                   // so it needs real AA text contrast, not just "acceptable for small caps"
        'gold-hi': '#6B4F0E',     // darkened from #9C7A2E (4.01:1) to #6B4F0E (7.64:1) for hover states
        'gold-pale': '#C9A050',   // mid-tone accent, lightened slightly to stay distinct from the new darker gold
        cream: '#1A1A1A',         // was #F6EDD8 (light text) -> near-black primary text
        parchment: '#F2E8CC',     // unchanged — already a light tone, still useful as-is

        // ─────────────────────────────────────────────────────────────────────
        // FIX-097 (Jun 19 2026): SEMANTIC TOKEN LAYER — added on request.
        // These are NEW aliases on top of the raw palette above. Nothing existing
        // was renamed or removed — old classes (bg-royal, text-gold, text-cream
        // etc.) keep working exactly as before. These new names exist so that
        // FUTURE color tweaks can target one semantic role (e.g. "all page titles")
        // instead of auditing every raw-color call site across 22 files.
        //
        // Not yet applied anywhere — page.tsx files still use the raw names.
        // Rolling these into actual markup is a separate, deliberate next step
        // so each section can be swapped over and visually checked, not blanket
        // find-replaced.
        // ─────────────────────────────────────────────────────────────────────
        'text-title':    '#1A1A1A',  // page/section titles (font-italiana headings)
        'text-label':    '#8A6A1F',  // eyebrows, category pills, field labels (font-cinzel uppercase)
        'text-body':     '#1A1A1A',  // primary readable text
        'text-muted':    '#5C5C5C',  // secondary/de-emphasized text (replaces low-opacity text-cream/40-60)
        'text-hint':     '#8A8A8A',  // tertiary hint text, placeholders (replaces text-cream/20-30 — now a real color, not a transparency hack, so it can never dip below readable)
        'surface-page':  '#FFFFFF',  // = paper
        'surface-card':  '#FAF7EF',  // = royal
        'surface-panel': '#F3ECDA',  // = royal-mid
        'accent':        '#8A6A1F',  // = gold
        'accent-hover':  '#6B4F0E',  // = gold-hi
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
