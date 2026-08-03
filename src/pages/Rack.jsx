import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PLUGINS, CATEGORIES, ACQUIRABLE_IDS } from '../data/plugins'
import { CHAINS } from '../data/chains'
import { chainCoverage, nextBestBuys, rackValue } from '../lib/build'
import { useRack, useDaw } from '../lib/usePrefs'
import { TierBadge, Price, DawPicker, SectionTitle, CoverageBar, Empty } from '../components/ui'

/**
 * What you own, and what it unlocks.
 *
 * The "buy next" list ranks by how many stages a plugin would cover that nothing already
 * in the rack covers — so it stops recommending compressors once you own one, which is
 * the opposite of how gear recommendations usually work.
 */

/** One-click starting points, so a new visitor isn't ticking eighty boxes by hand. */
const PRESETS = [
  {
    id: 'nothing',
    label: 'Nothing yet',
    note: 'Stock DAW plugins only. The site will route every stage through free tools and what you already have.',
    ids: [],
  },
  {
    id: 'free',
    label: 'The free rack',
    note: 'Every free plugin in the catalog. Costs nothing and covers most of every chain here.',
    ids: ACQUIRABLE_IDS.filter(id => PLUGINS[id].tier === 'free'),
  },
  {
    id: 'waves',
    label: 'A Waves bundle',
    note: 'The Waves plugins that appear in these chains — roughly what a Horizon or Mercury owner has.',
    ids: ACQUIRABLE_IDS.filter(id => PLUGINS[id].maker === 'Waves'),
  },
  {
    id: 'modern',
    label: 'The modern starter kit',
    note: 'FabFilter, Soundtoys and Valhalla — what most people building a chain from scratch this decade actually buy.',
    ids: ACQUIRABLE_IDS.filter(id =>
      ['FabFilter', 'Soundtoys', 'Valhalla DSP'].includes(PLUGINS[id].maker)),
  },
]

export default function Rack() {
  const { rack, toggle, setRack } = useRack()
  const { daw } = useDaw()

  const owned = useMemo(
    () => rack.filter(id => PLUGINS[id]).sort((a, b) =>
      (CATEGORIES[PLUGINS[a].category] || '').localeCompare(CATEGORIES[PLUGINS[b].category] || '') ||
      PLUGINS[a].name.localeCompare(PLUGINS[b].name)),
    [rack])

  const buys = useMemo(() => nextBestBuys(rack), [rack])

  const coverage = useMemo(
    () => CHAINS
      .map(c => ({ chain: c, cov: chainCoverage(c, rack, daw) }))
      .sort((a, b) => b.cov.ratio - a.cov.ratio),
    [rack, daw])

  const spent = rackValue(rack)

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">My rack</h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-fog">
          Mark what you own and every chain on the site rewrites itself around it. Stored in this
          browser only — there is no account, and nothing leaves your device.
        </p>
      </header>

      <section className="card flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="num text-2xl font-bold text-paper">{owned.length}</p>
          <p className="text-xs text-mute">plugins owned</p>
        </div>
        <div>
          <p className="num text-2xl font-bold text-paper">${spent.toLocaleString()}</p>
          <p className="text-xs text-mute">at list price</p>
        </div>
        <div>
          <p className="num text-2xl font-bold text-paper">
            {coverage.filter(c => c.cov.ratio >= 0.5).length}/{CHAINS.length}
          </p>
          <p className="text-xs text-mute">chains at least half covered</p>
        </div>
        <DawPicker />
      </section>

      <section>
        <SectionTitle sub="Pick the closest and adjust — faster than ticking boxes one at a time.">
          Start from a preset
        </SectionTitle>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PRESETS.map(p => (
            <li key={p.id}>
              <button
                onClick={() => setRack(p.ids)}
                className="card pressable h-full w-full p-3 text-left hover:border-edge2">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-paper">{p.label}</span>
                  <span className="num text-xs text-mute">{p.ids.length}</span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-fog">{p.note}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-mute">
          A preset replaces your rack rather than adding to it.
        </p>
      </section>

      {buys.length > 0 && (
        <section>
          <SectionTitle sub="Ranked by stages it would cover that nothing you own already covers. It stops suggesting compressors once you have one.">
            What to get next
          </SectionTitle>
          <ol className="card divide-y divide-edge">
            {buys.map((b, i) => {
              const p = PLUGINS[b.id]
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <span className="num w-5 shrink-0 text-sm font-bold text-amber">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <Link to={`/plugins?item=${encodeURIComponent(b.id)}`}
                      className="font-semibold text-paper underline decoration-edge2 underline-offset-4 hover:decoration-amber">
                      <span className="text-fog">{p.maker}</span> {p.name}
                    </Link>
                    <span className="ml-2"><TierBadge tier={p.tier} /></span>
                    <span className="mt-0.5 block text-xs text-mute">
                      {b.stages} {b.stages === 1 ? 'stage' : 'stages'} across {b.artists.slice(0, 3).join(', ')}
                      {b.artists.length > 3 && ` +${b.artists.length - 3}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Price value={p.price} />
                    <button onClick={() => toggle(b.id)}
                      className="chip pressable border border-edge bg-raised text-mute hover:border-edge2 hover:text-fog">
                      + own it
                    </button>
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <section>
        <SectionTitle sub="Ordered by how much of each chain your own plugins cover.">
          What your rack unlocks
        </SectionTitle>
        <ul className="card divide-y divide-edge">
          {coverage.map(({ chain, cov }) => (
            <li key={chain.slug}>
              <Link to={`/chain/${chain.slug}`}
                className="pressable flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-raised/60">
                <span className="min-w-0">
                  <span className="block font-medium text-paper">{chain.name}</span>
                  <span className="block text-xs text-mute">{chain.credits[0]?.name}</span>
                </span>
                <CoverageBar covered={cov.fromRack} total={cov.total} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle sub={owned.length ? 'Tap to remove.' : undefined}>In your rack</SectionTitle>
        {owned.length === 0 ? (
          <Empty>
            Nothing yet. Pick a preset above, or add things from the{' '}
            <Link to="/plugins" className="underline underline-offset-4 hover:text-paper">plugin index</Link>.
          </Empty>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2">
              {owned.map(id => {
                const p = PLUGINS[id]
                return (
                  <li key={id}>
                    <button onClick={() => toggle(id)}
                      className="chip pressable border border-signal/30 bg-signal/10 text-signal hover:border-clip/50 hover:bg-clip/10 hover:text-clip"
                      aria-label={`Remove ${p.name} from my rack`}>
                      {p.maker} {p.name} <span aria-hidden="true">×</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <button onClick={() => setRack([])} className="btn mt-4 text-xs">Clear the rack</button>
          </>
        )}
      </section>
    </div>
  )
}
