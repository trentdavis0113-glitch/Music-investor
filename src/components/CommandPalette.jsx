import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarket } from '../lib/market'
import { fmt } from '../lib/supabase'
import { getRecent } from '../lib/recent'

/**
 * Universal search and quick actions.
 *
 * Opens on Cmd/Ctrl+K or "/" from anywhere. Artist search runs against the shared market
 * store already in memory, so results are instant and cost no network. The body only
 * mounts while open, so the store is not subscribed — and therefore not polling — when
 * the palette is closed.
 *
 * Implements the ARIA combobox-with-listbox pattern: the input keeps focus and owns
 * aria-activedescendant while the list is navigated, which is what screen readers expect
 * and what lets a keyboard user type and steer at the same time.
 */

const ACTIONS = [
  { id: 'act-market', label: 'Market', hint: 'All artists', to: '/', keywords: 'home browse artists' },
  { id: 'act-portfolio', label: 'Portfolio', hint: 'Your positions', to: '/portfolio', keywords: 'holdings cash positions me' },
  { id: 'act-leaderboard', label: 'Leaderboard', hint: 'Season ranks', to: '/leaderboard', keywords: 'ranks rankings top traders' },
  { id: 'act-how', label: 'How it works', hint: 'Rules & pricing', to: '/how-it-works', keywords: 'help rules explain fair value' },
  { id: 'act-artists', label: 'For artists', hint: 'Claim your profile', to: '/for-artists', keywords: 'claim musician verify' },
  { id: 'act-terms', label: 'Terms & privacy', hint: 'What we store', to: '/terms', keywords: 'legal privacy simulated' },
]

function score(needle, hay) {
  if (!hay) return -1
  const h = hay.toLowerCase()
  const i = h.indexOf(needle)
  if (i === -1) return -1
  return i === 0 ? 2 : 1 // prefix beats substring
}

export default function CommandPalette({ open, onClose }) {
  if (!open) return null
  return <Palette onClose={onClose} />
}

function Palette({ onClose }) {
  const { rows } = useMarket()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const restoreTo = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    restoreTo.current = document.activeElement
    inputRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      // Send focus back where it came from, or the palette leaves the user stranded.
      if (restoreTo.current instanceof HTMLElement) restoreTo.current.focus()
    }
  }, [])

  const recent = useMemo(() => getRecent(), [])

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^\$/, '')

    if (!needle) {
      const rec = recent.map(r => ({
        kind: 'artist', id: `r-${r.id}`, to: `/artist/${r.id}`,
        label: r.name, hint: `$${r.symbol}`, group: 'Recently viewed',
      }))
      const acts = ACTIONS.map(a => ({ kind: 'action', ...a, group: 'Go to' }))
      // Without recents (a first visit) lead with the biggest movers, so the palette
      // teaches what the product is about instead of showing an empty box.
      const movers = (rows || [])
        .slice()
        .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
        .slice(0, 5)
        .map(a => ({
          kind: 'artist', id: `m-${a.id}`, to: `/artist/${a.id}`,
          label: a.name, hint: `$${a.symbol}`, pct: a.pct, price: a.latest,
          group: "Today's movers",
        }))
      return rec.length ? [...rec, ...acts] : [...movers, ...acts]
    }

    const artists = (rows || [])
      .map(a => {
        const s = Math.max(score(needle, a.name), score(needle, a.symbol), score(needle, a.genre))
        return s < 0 ? null : { s, a }
      })
      .filter(Boolean)
      .sort((x, y) => y.s - x.s || Math.abs(y.a.pct) - Math.abs(x.a.pct))
      .slice(0, 8)
      .map(({ a }) => ({
        kind: 'artist', id: `a-${a.id}`, to: `/artist/${a.id}`,
        label: a.name, hint: `$${a.symbol}`, pct: a.pct, price: a.latest, group: 'Artists',
      }))

    const acts = ACTIONS
      .filter(a => score(needle, a.label) >= 0 || score(needle, a.keywords) >= 0)
      .map(a => ({ kind: 'action', ...a, group: 'Go to' }))

    return [...artists, ...acts]
  }, [q, rows, recent])

  useEffect(() => { setActive(0) }, [q])

  const choose = useCallback(item => {
    if (!item) return
    onClose()
    navigate(item.to)
  }, [navigate, onClose])

  function onKeyDown(e) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, items.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); return }
    if (e.key === 'Home') { e.preventDefault(); setActive(0); return }
    if (e.key === 'End') { e.preventDefault(); setActive(items.length - 1); return }
    if (e.key === 'Enter') { e.preventDefault(); choose(items[active]) }
  }

  // Keep the highlighted row in view when steering with the keyboard.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  let lastGroup = null

  return (
    <div
      className="animate-veilIn fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        role="dialog" aria-modal="true" aria-label="Search and commands"
        className="animate-scaleIn mx-auto mt-[12vh] w-[min(94vw,40rem)] overflow-hidden rounded-sheet border border-edge2 bg-panel shadow-e3">
        <div className="flex items-center gap-3 border-b border-edge px-4">
          <span aria-hidden="true" className="text-fog">⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={items[active]?.id}
            aria-autocomplete="list"
            aria-label="Search artists or jump to a page"
            placeholder="Search artists, or jump to…"
            className="w-full bg-transparent py-4 text-[15px] outline-none placeholder:text-mute"
          />
          <kbd className="hidden shrink-0 rounded border border-edge px-1.5 py-0.5 text-[10px] text-mute sm:block">
            ESC
          </kbd>
        </div>

        <div id="cmdk-list" role="listbox" aria-label="Results" ref={listRef}
          className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-fog">
              Nothing matches “{q}”.
            </p>
          )}

          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null
            lastGroup = item.group
            const isActive = i === active
            return (
              <div key={item.id}>
                {header && (
                  <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-mute">
                    {header}
                  </p>
                )}
                <div
                  id={item.id}
                  role="option"
                  aria-selected={isActive}
                  data-active={isActive}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(item)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${
                    isActive ? 'bg-stage/15 text-paper' : 'text-fog'}`}>
                  <span aria-hidden="true"
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs ${
                      item.kind === 'artist' ? 'bg-stage/20 text-stage' : 'bg-edge text-fog'}`}>
                    {item.kind === 'artist' ? '♪' : '→'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-paper">
                    {item.label}
                  </span>
                  {item.pct != null && (
                    <span className={`num text-xs ${item.pct >= 0 ? 'text-gain' : 'text-loss'}`}>
                      {item.pct >= 0 ? '+' : ''}{item.pct.toFixed(2)}%
                    </span>
                  )}
                  {item.price != null && (
                    <span className="num text-xs text-fog">${fmt(item.price)}</span>
                  )}
                  {item.pct == null && item.hint && (
                    <span className="truncate text-xs text-mute">{item.hint}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="hidden items-center gap-4 border-t border-edge px-4 py-2 text-[11px] text-mute sm:flex">
          <span><kbd className="rounded border border-edge px-1">↑</kbd><kbd className="ml-0.5 rounded border border-edge px-1">↓</kbd> navigate</span>
          <span><kbd className="rounded border border-edge px-1">↵</kbd> open</span>
          <span><kbd className="rounded border border-edge px-1">esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
