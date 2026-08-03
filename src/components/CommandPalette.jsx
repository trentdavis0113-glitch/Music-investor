import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CHAINS } from '../data/chains'
import { PLUGINS } from '../data/plugins'

/**
 * Universal search. Opens on Cmd/Ctrl+K or "/" from anywhere.
 *
 * The whole catalog is already in memory — it is a static import — so search is a filter
 * over an array and costs nothing. Engineers are searchable as well as artists, because
 * "what does Tom Elmhirst do" is at least as common a question as "what does Adele sound
 * like", and the credits are where the answer lives.
 *
 * Implements the ARIA combobox-with-listbox pattern: the input keeps focus and owns
 * aria-activedescendant while the list is navigated, which is what lets a keyboard user
 * type and steer at the same time.
 */

const ACTIONS = [
  { id: 'act-chains', label: 'All chains', hint: 'Browse the catalog', to: '/', keywords: 'home library artists browse' },
  { id: 'act-plugins', label: 'Plugin index', hint: 'What shows up most', to: '/plugins', keywords: 'gear tools waves uad soundtoys' },
  { id: 'act-rack', label: 'My rack', hint: 'What you own', to: '/rack', keywords: 'inventory own buy owned' },
  { id: 'act-compare', label: 'Compare chains', hint: 'Two side by side', to: '/compare', keywords: 'versus diff side' },
  { id: 'act-learn', label: 'Learn', hint: 'Stage order & glossary', to: '/learn', keywords: 'glossary terms help order eq compression' },
  { id: 'act-about', label: 'About & sources', hint: 'How this is sourced', to: '/about', keywords: 'sources methodology confidence legal' },
]

function score(needle, hay) {
  if (!hay) return -1
  const i = String(hay).toLowerCase().indexOf(needle)
  if (i === -1) return -1
  return i === 0 ? 2 : 1 // prefix beats substring
}

export default function CommandPalette({ open, onClose }) {
  if (!open) return null
  return <Palette onClose={onClose} />
}

function Palette({ onClose }) {
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

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase()

    if (!needle) {
      return [
        ...CHAINS.slice(0, 5).map(c => ({
          kind: 'chain', id: `c-${c.slug}`, to: `/chain/${c.slug}`,
          label: c.name, hint: c.credits[0]?.name, group: 'Chains',
        })),
        ...ACTIONS.map(a => ({ kind: 'action', ...a, group: 'Go to' })),
      ]
    }

    const chains = CHAINS
      .map(c => {
        const s = Math.max(
          score(needle, c.name),
          score(needle, c.tagline),
          ...c.genres.map(g => score(needle, g)),
          ...c.credits.map(cr => score(needle, cr.name)),
          ...c.records.map(r => score(needle, r)),
        )
        return s < 0 ? null : { s, c }
      })
      .filter(Boolean)
      .sort((x, y) => y.s - x.s || x.c.name.localeCompare(y.c.name))
      .slice(0, 6)
      .map(({ c }) => ({
        kind: 'chain', id: `c-${c.slug}`, to: `/chain/${c.slug}`,
        label: c.name, hint: c.credits[0]?.name, group: 'Chains',
      }))

    const plugins = Object.entries(PLUGINS)
      .map(([id, p]) => {
        const s = Math.max(score(needle, p.name), score(needle, p.maker))
        return s < 0 ? null : { s, id, p }
      })
      .filter(Boolean)
      .sort((x, y) => y.s - x.s || x.p.name.localeCompare(y.p.name))
      .slice(0, 6)
      .map(({ id, p }) => ({
        kind: 'plugin', id: `p-${id}`, to: `/plugins?item=${encodeURIComponent(id)}`,
        label: `${p.maker} ${p.name}`, hint: p.tier, group: 'Plugins',
      }))

    const acts = ACTIONS
      .filter(a => score(needle, a.label) >= 0 || score(needle, a.keywords) >= 0)
      .map(a => ({ kind: 'action', ...a, group: 'Go to' }))

    return [...chains, ...plugins, ...acts]
  }, [q])

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
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  let lastGroup = null
  const icon = { chain: '♪', plugin: '▤', action: '→' }

  return (
    <div
      className="animate-veilIn fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        role="dialog" aria-modal="true" aria-label="Search"
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
            aria-label="Search artists, engineers and plugins"
            placeholder="Artist, engineer, record or plugin…"
            className="w-full bg-transparent py-4 text-[15px] outline-none placeholder:text-mute"
          />
          <kbd className="hidden shrink-0 rounded border border-edge px-1.5 py-0.5 text-[10px] text-mute sm:block">ESC</kbd>
        </div>

        <div id="cmdk-list" role="listbox" aria-label="Results" ref={listRef}
          className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-fog">Nothing matches “{q}”.</p>
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
                    isActive ? 'bg-amber/15 text-paper' : 'text-fog'}`}>
                  <span aria-hidden="true"
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs ${
                      item.kind === 'action' ? 'bg-edge text-fog' : 'bg-amber/20 text-amber'}`}>
                    {icon[item.kind]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-paper">{item.label}</span>
                  {item.hint && <span className="truncate text-xs text-mute">{item.hint}</span>}
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
