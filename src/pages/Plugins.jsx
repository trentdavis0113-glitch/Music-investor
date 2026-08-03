import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PLUGINS, CATEGORIES, STOCK_BY_JOB, DAWS, substitutesFor } from '../data/plugins'
import { pluginUsage } from '../data/chains'
import { useRack, useDaw } from '../lib/usePrefs'
import { ConfidenceBadge, TierBadge, Price, DawPicker, Empty } from '../components/ui'

/**
 * The plugin index, sorted by how often each item appears across the catalog.
 *
 * This ordering is the point of the page. Someone deciding what to spend money on is
 * better served by "this shows up in eleven stages across seven records" than by any
 * amount of marketing copy, and the long tail below the top ten is a useful argument
 * against buying most of it.
 */

const TIERS = { all: 'All', paid: 'Paid', free: 'Free', hardware: 'Hardware' }

export default function Plugins() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('all')
  const [cat, setCat] = useState('')
  const { rack, toggle } = useRack()
  const { daw } = useDaw()

  const selected = params.get('item')
  const usage = useMemo(() => pluginUsage(), [])

  // Deep links land on a specific plugin; scroll it into view rather than leaving the
  // reader to find a highlighted row somewhere down a list of eighty.
  useEffect(() => {
    if (!selected) return
    document.getElementById(`plugin-${selected}`)?.scrollIntoView({ block: 'center' })
  }, [selected])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return Object.entries(PLUGINS)
      .map(([id, p]) => ({ id, p, uses: usage.get(id) || [] }))
      .filter(({ id, p }) => {
        if (tier !== 'all' && p.tier !== tier) return false
        if (cat && p.category !== cat) return false
        if (!needle) return true
        return (
          p.name.toLowerCase().includes(needle) ||
          p.maker.toLowerCase().includes(needle) ||
          id.includes(needle)
        )
      })
      .sort((a, b) => b.uses.length - a.uses.length || a.p.name.localeCompare(b.p.name))
  }, [q, tier, cat, usage])

  const usedCats = useMemo(
    () => [...new Set(Object.values(PLUGINS).map(p => p.category))].sort((a, b) =>
      (CATEGORIES[a] || a).localeCompare(CATEGORIES[b] || b)),
    [])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Plugin index</h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-fog">
          Every piece of gear referenced in the catalog, ordered by how many stages it appears in.
          The top of this list is a far better guide to what is worth owning than any review is —
          and the length of the tail below it is a decent argument for buying almost none of it.
        </p>
      </header>

      <section className="card space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Plugin or maker…"
            aria-label="Filter plugins"
            className="field min-w-[10rem] flex-1"
          />
          <select value={tier} onChange={e => setTier(e.target.value)} aria-label="Filter by tier"
            className="rounded-lg border border-edge bg-ink px-2.5 py-2 text-sm outline-none focus:border-edge2">
            {Object.entries(TIERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Filter by job"
            className="rounded-lg border border-edge bg-ink px-2.5 py-2 text-sm outline-none focus:border-edge2">
            <option value="">Any job</option>
            {usedCats.map(c => <option key={c} value={c}>{CATEGORIES[c] || c}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
          <DawPicker compact />
          <p className="text-xs text-mute">{rows.length} of {Object.keys(PLUGINS).length} shown</p>
        </div>
      </section>

      {rows.length === 0 ? (
        <Empty>No gear matches that.</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ id, p, uses }) => (
            <PluginRow
              key={id} id={id} p={p} uses={uses} daw={daw}
              owned={rack.includes(id)}
              onToggle={() => toggle(id)}
              open={selected === id}
              onOpen={() => setParams(selected === id ? {} : { item: id }, { replace: true })}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function PluginRow({ id, p, uses, daw, owned, onToggle, open, onOpen }) {
  const subs = substitutesFor(id)
  const stock = STOCK_BY_JOB[p.category]

  return (
    <li id={`plugin-${id}`} className={`card overflow-hidden ${open ? 'border-edge2' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onOpen}
          aria-expanded={open}
          className="pressable min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-paper">
              <span className="text-fog">{p.maker}</span> {p.name}
            </span>
            <TierBadge tier={p.tier} />
            {owned && <span className="chip border border-signal/40 bg-signal/15 text-signal">✓ Owned</span>}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-mute">
            <span>{CATEGORIES[p.category] || p.category}</span>
            <span aria-hidden="true">·</span>
            <Price value={p.price} />
            <span aria-hidden="true">·</span>
            <span className={uses.length >= 4 ? 'text-amber' : ''}>
              {uses.length} {uses.length === 1 ? 'stage' : 'stages'}
            </span>
          </span>
        </button>

        {p.tier !== 'hardware' && (
          <button
            onClick={onToggle}
            aria-pressed={owned}
            aria-label={owned ? `Remove ${p.name} from my rack` : `Add ${p.name} to my rack`}
            className={`chip pressable shrink-0 border ${
              owned
                ? 'border-signal/40 bg-signal/15 text-signal'
                : 'border-edge bg-raised text-mute hover:border-edge2 hover:text-fog'}`}>
            {owned ? '✓' : '+ I own this'}
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-4 border-t border-edge px-4 py-4">
          {p.note && <p className="text-sm leading-relaxed text-fog">{p.note}</p>}

          {uses.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-mute">Used on</p>
              <ul className="space-y-1">
                {uses.map((u, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                    <Link to={`/chain/${u.slug}`} className="font-medium text-paper underline decoration-edge2 underline-offset-4 hover:decoration-amber">
                      {u.artist}
                    </Link>
                    <span className="text-fog">{u.title}</span>
                    {u.where === 'tracking' && <span className="chip bg-raised text-mute">recording</span>}
                    <ConfidenceBadge level={u.confidence} showLabel={false} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.emulations?.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-mute">
                Plugins that model it
              </p>
              <p className="text-sm text-fog">
                {p.emulations.map(e => PLUGINS[e] ? `${PLUGINS[e].maker} ${PLUGINS[e].name}` : e).join(' · ')}
              </p>
            </div>
          )}

          {subs.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-mute">
                Instead of this
              </p>
              <ul className="space-y-1">
                {subs.map(s => (
                  <li key={s} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-paper">{PLUGINS[s].maker} {PLUGINS[s].name}</span>
                    <TierBadge tier={PLUGINS[s].tier} />
                    {/* The Free badge already says it; a "free" price next to it reads twice. */}
                    {PLUGINS[s].tier !== 'free' && <Price value={PLUGINS[s].price} />}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stock && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-mute">
                What your DAW already has for this job
              </p>
              <ul className="grid gap-1 text-sm sm:grid-cols-2">
                {Object.entries(DAWS).map(([k, name]) => (
                  <li key={k} className={daw === k ? 'text-paper' : 'text-mute'}>
                    <span className="text-fog">{name}:</span> {stock[k] || '—'}
                    {daw === k && <span className="ml-1 text-stock">← yours</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
