export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12131C',        // page
        panel: '#1B1D29',      // surface
        raised: '#22243247',   // surface above surface — kept translucent so it layers
        edge: '#2A2D3E',       // hairline
        edge2: '#343850',      // hairline, emphasised
        fog: '#9A9DB3',        // secondary text — 6.3:1 on panel, 6.9:1 on ink
        mute: '#6E7288',       // tertiary text, non-essential only
        paper: '#EDEEF5',      // primary text
        gain: '#3DDC97',
        loss: '#FF6B6B',
        stage: '#8B7CF6',
        gold: '#F5C044',
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
        e1: '0 1px 2px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04)',
        e2: '0 4px 16px -4px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05)',
        e3: '0 18px 48px -12px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06)',
        glow: '0 0 0 1px rgba(139,124,246,.4), 0 8px 32px -8px rgba(139,124,246,.35)',
      },
      transitionTimingFunction: {
        // Crisp decelerate. Premium motion is fast and confident, not slow and floaty.
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
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        flashUp: { '0%,100%': { background: 'transparent' }, '30%': { background: 'rgba(61,220,151,.12)' } },
        flashDown: { '0%,100%': { background: 'transparent' }, '30%': { background: 'rgba(255,107,107,.12)' } },
      },
      animation: {
        rise: 'rise .26s cubic-bezier(.16,1,.3,1) both',
        scaleIn: 'scaleIn .18s cubic-bezier(.16,1,.3,1) both',
        veilIn: 'veilIn .18s ease-out both',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        flashUp: 'flashUp 1.1s ease-out',
        flashDown: 'flashDown 1.1s ease-out',
      },
    },
  },
  plugins: [],
}
