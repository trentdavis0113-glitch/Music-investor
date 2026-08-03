import { Link } from 'react-router-dom'
import { PLUGINS, DAWS } from '../data/plugins'
import { CONFIDENCE } from '../data/chains'
import { useRack, useDaw } from '../lib/usePrefs'

/**
 * The small shared pieces. Kept together because each is a dozen lines and they are only
 * meaningful next to each other — a plugin is always shown with its tier, a claim is
 * always shown with its confidence.
 */

const TIER = {
  stock: { label: 'Stock', cls: 'bg-stock/15 text-stock border-stock/30' },
  free: { label: 'Free', cls: 'bg-free/15 text-free border-free/30' },
  paid: { label: 'Paid', cls: 'bg-paid/15 text-paid border-paid/30' },
  hardware: { label: 'Hardware', cls: 'bg-iron/15 text-iron border-iron/30' },
}

const TONE = {
  good: 'bg-signal/12 text-signal border-signal/30',
  warn: 'bg-amber/12 text-amber border-amber/30',
  bad: 'bg-unver/12 text-unver border-unver/35',
}

/**
 * The badge that makes this catalog different from every unattributed "artist vocal
 * chain" list online. Always rendered next to the claim it qualifies.
 */
export function ConfidenceBadge({ level, showLabel = true }) {
  const c = CONFIDENCE[level]
  if (!c) return null
  return (
    <span
      title={c.blurb}
      className={`chip border ${TONE[c.tone]}`}>
      <span aria-hidden="true" className="text-[9px]">●</span>
      {showLabel ? c.label : c.short}
    </span>
  )
}

export function TierBadge({ tier }) {
  const t = TIER[tier]
  if (!t) return null
  return <span className={`chip border ${t.cls}`}>{t.label}</span>
}

export function Price({ value }) {
  if (value == null) return null
  if (value === 0) return <span className="num text-xs text-free">free</span>
  return <span className="num text-xs text-fog">${value.toLocaleString()}</span>
}

/** A plugin reference, linked into the plugin index, with its tier always visible. */
export function PluginPill({ id, showOwn = false }) {
  const p = PLUGINS[id]
  const { rack, toggle } = useRack()
  if (!p) return <span className="text-clip">Unknown: {id}</span>

  const owned = rack.includes(id)
  const ownable = p.tier !== 'hardware'

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Link
        to={`/plugins?item=${encodeURIComponent(id)}`}
        className="pressable font-semibold text-paper underline decoration-edge2 underline-offset-4 hover:decoration-amber">
        <span className="text-fog">{p.maker}</span> {p.name}
      </Link>
      <TierBadge tier={p.tier} />
      {showOwn && ownable && (
        <button
          onClick={() => toggle(id)}
          aria-pressed={owned}
          className={`chip pressable border ${
            owned
              ? 'border-signal/40 bg-signal/15 text-signal'
              : 'border-edge bg-raised text-mute hover:border-edge2 hover:text-fog'
          }`}>
          {owned ? '✓ Owned' : '+ I own this'}
        </button>
      )}
    </span>
  )
}

/**
 * Choosing a DAW rewrites every "you already own something for this" line on the site,
 * so it is worth surfacing prominently rather than burying in a settings page.
 */
export function DawPicker({ compact = false }) {
  const { daw, setDaw } = useDaw()
  return (
    <label className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
      <span className="whitespace-nowrap text-fog">My DAW</span>
      <select
        value={daw}
        onChange={e => setDaw(e.target.value)}
        className="rounded-lg border border-edge bg-ink px-2.5 py-1.5 text-sm text-paper outline-none focus:border-edge2">
        <option value="">Not set</option>
        {Object.entries(DAWS).map(([id, name]) => (
          <option key={id} value={id}>{name}</option>
        ))}
      </select>
    </label>
  )
}

export function SectionTitle({ children, sub }) {
  return (
    <div className="mb-3">
      <h2 className="font-display text-lg font-extrabold tracking-tight">{children}</h2>
      {sub && <p className="mt-0.5 text-sm text-fog">{sub}</p>}
    </div>
  )
}

export function Empty({ children }) {
  return (
    <div className="card px-4 py-10 text-center text-sm text-fog">{children}</div>
  )
}

/** Coverage read-out. Deliberately a bar and a fraction — a percentage alone hides "of what". */
export function CoverageBar({ covered, total, label = 'from your rack' }) {
  const pct = total ? Math.round((covered / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-edge" aria-hidden="true">
        <div
          className={`h-full rounded-full ${pct >= 75 ? 'bg-signal' : pct >= 35 ? 'bg-amber' : 'bg-unver'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="num text-[11px] text-fog">
        {covered}/{total} <span className="text-mute">{label}</span>
      </span>
    </div>
  )
}
