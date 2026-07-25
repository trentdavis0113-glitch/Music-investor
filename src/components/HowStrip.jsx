import { useState } from 'react'
import { Link } from 'react-router-dom'

const CARDS = [
  { n: '01', t: 'Get $10,000', d: 'Sign up and get simulated cash. No real money, ever. Everyone starts equal.' },
  { n: '02', t: 'Buy artists like stocks', d: 'Think an artist is about to blow up? Buy shares instantly at market price.' },
  { n: '03', t: 'Prices move on real momentum', d: 'Monthly listener counts set fair value. Trader demand pushes price around it. Mondays reprice everyone, like earnings.' },
  { n: '04', t: 'Buy the gap', d: 'Price under the purple fair value line = the market is sleeping on them. Prices drift back toward fair value. The gap is your edge.' },
]

export default function HowStrip() {
  const [open, setOpen] = useState(() => localStorage.getItem('howstrip') !== 'closed')

  function toggle() {
    const next = !open
    setOpen(next)
    localStorage.setItem('howstrip', next ? 'open' : 'closed')
  }

  return (
    <section className="rounded-xl border border-edge bg-panel">
      <button onClick={toggle} className="flex w-full items-center justify-between px-4 py-3">
        <span className="font-display text-sm font-bold uppercase tracking-widest text-fog">
          How this works
        </span>
        <span className="text-fog">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="border-t border-edge p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CARDS.map(c => (
              <div key={c.n} className="flex gap-3">
                <span className="num shrink-0 text-sm text-stage">{c.n}</span>
                <div>
                  <p className="text-sm font-semibold">{c.t}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-fog">{c.d}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-fog">
            Seasons run ~90 days, then the leaderboard crowns a winner and everyone resets to $10,000.
            All trading uses simulated currency with no cash value. Full breakdown:{' '}
            <Link to="/how-it-works" className="text-stage underline underline-offset-4">how it works</Link>.
          </p>
        </div>
      )}
    </section>
  )
}
