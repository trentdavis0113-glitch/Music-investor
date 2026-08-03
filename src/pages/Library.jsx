import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CHAINS, ALL_GENRES, CONFIDENCE } from '../data/chains'
import { chainCoverage } from '../lib/build'
import { useRack, useDaw } from '../lib/usePrefs'
import { DawPicker, CoverageBar, Empty } from '../components/ui'

/**
 * The catalog. Sorting defaults to "documented first" rather than alphabetical, because
 * the best-sourced entries are the ones worth reading, and burying them under whoever
 * happens to start with an A would undercut the point of the confidence system.
 */

const SORTS = {
  sourcing: 'Best sourced',
  buildable: 'Buildable with my rack',
  name: 'A–Z',
  era: 'Oldest first',
}

/** Share of a chain's stages that are documented — the sorting key for "best sourced". */
function docRatio(chain) {
  const all = [...chain.tracking, ...chain.chain]
  const doc = all.filter(s => s.confidence === 'documented').length
  return all.length ? doc / all.length : 0
}

function startYear(chain) {
  const m = chain.era.match(/\d{4}/)
  return m ? Number(m[0]) : 9999
}

export default function Library() {
  const [q, setQ] = useState('')
  const [genre, setGenre] = useState('')
  const [sort, setSort] = useState('sourcing')
  const { rack } = useRack()
  const { daw } = useDaw()

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()

    const filtered = CHAINS.filter(c => {
      if (genre && !c.genres.includes(genre)) return false
      if (!needle) return true
      return (
        c.name.toLowerCase().includes(needle) ||
        c.tagline.toLowerCase().includes(needle) ||
        c.credits.some(cr => cr.name.toLowerCase().includes(needle)) ||
        c.records.some(r => r.toLowerCase().includes(needle)) ||
        c.genres.some(g => g.includes(needle))
      )
    })

    const withCoverage = filtered.map(c => ({ chain: c, cov: chainCoverage(c, rack, daw) }))

    const cmp = {
      sourcing: (a, b) => docRatio(b.chain) - docRatio(a.chain) || a.chain.name.localeCompare(b.chain.name),
      buildable: (a, b) => b.cov.ratio - a.cov.ratio || a.chain.name.localeCompare(b.chain.name),
      name: (a, b) => a.chain.name.localeCompare(b.chain.name),
      era: (a, b) => startYear(a.chain) - startYear(b.chain),
    }[sort]

    return withCoverage.sort(cmp)
  }, [q, genre, sort, rack, daw])

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          What the engineer actually put on the vocal.
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-fog">
          {CHAINS.length} vocal chains, stage by stage, from the people who recorded and mixed them.
          Every claim carries a sourcing level and a link to where it came from — so you can tell
          the difference between what an engineer said in an interview and what somebody guessed
          by ear. Tell it what you own and it will rebuild any chain out of your plugins, free ones,
          or whatever your DAW already ships.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          {Object.entries(CONFIDENCE).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1.5 text-xs text-mute">
              <span aria-hidden="true" className={
                c.tone === 'good' ? 'text-signal' : c.tone === 'warn' ? 'text-amber' : 'text-unver'
              }>●</span>
              <span className="font-medium text-fog">{c.label}</span>
              <span className="hidden sm:inline">— {c.blurb}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="card space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Artist, engineer or record…"
            aria-label="Filter chains"
            className="field min-w-[12rem] flex-1"
          />
          <select
            value={genre}
            onChange={e => setGenre(e.target.value)}
            aria-label="Filter by genre"
            className="rounded-lg border border-edge bg-ink px-2.5 py-2 text-sm text-paper outline-none focus:border-edge2">
            <option value="">All genres</option>
            {ALL_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            aria-label="Sort"
            className="rounded-lg border border-edge bg-ink px-2.5 py-2 text-sm text-paper outline-none focus:border-edge2">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
          <DawPicker compact />
          <p className="text-xs text-mute">
            {rack.length
              ? <><span className="text-fog">{rack.length}</span> plugins in your rack · <Link to="/rack" className="underline decoration-edge2 underline-offset-4 hover:text-paper">edit</Link></>
              : <Link to="/rack" className="underline decoration-edge2 underline-offset-4 hover:text-paper">Tell it what plugins you own →</Link>}
          </p>
        </div>
      </section>

      {rows.length === 0 ? (
        <Empty>Nothing matches that. <button onClick={() => { setQ(''); setGenre('') }} className="underline underline-offset-4 hover:text-paper">Clear the filters</button>.</Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ chain, cov }) => (
            <li key={chain.slug}>
              <Link
                to={`/chain/${chain.slug}`}
                className="card pressable flex h-full flex-col gap-3 p-4 hover:border-edge2">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-xl font-extrabold tracking-tight">{chain.name}</h2>
                    <span className="num shrink-0 pt-1 text-[11px] text-mute">{chain.era}</span>
                  </div>
                  <p className="mt-1 text-sm leading-snug text-fog">{chain.tagline}</p>
                </div>

                <p className="text-xs text-mute">
                  {chain.credits.map(c => c.name).join(' · ')}
                </p>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-edge pt-3">
                  <span className="flex flex-wrap gap-1">
                    {chain.genres.map(g => (
                      <span key={g} className="chip bg-raised text-mute">{g}</span>
                    ))}
                  </span>
                  <CoverageBar covered={cov.fromRack} total={cov.total} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="pt-2 text-center text-xs text-mute">
        Want two side by side? <Link to="/compare" className="underline decoration-edge2 underline-offset-4 hover:text-paper">Compare chains →</Link>
      </p>
    </div>
  )
}
