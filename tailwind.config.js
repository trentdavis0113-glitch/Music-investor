export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0C0D11',        // page
        panel: '#14161C',      // surface
        raised: '#1B1E26',     // surface above surface
        edge: '#242833',       // hairline
        edge2: '#333949',      // hairline, emphasised
        fog: '#9BA2B2',        // secondary text — 6.6:1 on panel
        mute: '#6C7385',       // tertiary text, non-essential only
        paper: '#ECEEF3',      // primary text

        // Signal-flow semantics. Amber is the brand: VU needles, tape, console lamps.
        amber: '#F5A524',
        signal: '#4ADE80',     // documented, owned, present
        unver: '#8B93A7',      // reconstructed — deliberately neutral, not alarming
        clip: '#F87171',       // genuinely wrong

        // Cost tiers, used consistently everywhere a plugin is named.
        stock: '#60A5FA',
        free: '#4ADE80',
        paid: '#F5A524',
        iron: '#A78BFA',       // hardware
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '14px',
        sheet: '20px',
      },
      boxShadow: {
        // Dark UI reads depth from a light top edge as much as from shadow, so each level
        // pairs an inset highlight with the drop.
        e1: '0 1px 2px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.04)',
        e2: '0 4px 16px -4px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.05)',
        e3: '0 18px 48px -12px rgba(0,0,0,.75), inset 0 1px 0 rgba(255,255,255,.06)',
        glow: '0 0 0 1px rgba(245,165,36,.4), 0 8px 32px -8px rgba(245,165,36,.3)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(.16,1,.3,1)',
        spring: 'cubic-bezier(.34,1.4,.64,1)',
      },
      transitionDuration: {
        instant: '120ms',
        fast: '180ms',
        base: '260ms',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(.97)' },
          to: { opacity: '1', transform: 'none' },
        },
        veilIn: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        rise: 'rise .26s cubic-bezier(.16,1,.3,1) both',
        scaleIn: 'scaleIn .18s cubic-bezier(.16,1,.3,1) both',
        veilIn: 'veilIn .18s ease-out both',
      },
    },
  },
  plugins: [],
}
