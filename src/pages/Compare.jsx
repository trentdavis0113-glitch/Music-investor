import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CHAINS, CHAIN_BY_SLUG, CONFIDENCE } from '../data/chains'
import { PLUGINS, CATEGORIES } from '../data/plugins'
import { ConfidenceBadge, SectionTitle } from '../components/ui'

/**
 * Two chains side by side, aligned by job rather than by position.
 *
 * Aligning by index would be misleading — one chain's stage 3 is a de-esser and another's
 * is saturation. Grouping by the job each stage does is what makes the comparison say
 * anything: you can see at a glance that one engineer uses four compression stages and
 * another uses one, and that neither of them de-esses where you assumed.
 */

const JOB_ORDER = ['pitch', 'eq', 'deesser', 'channelstrip', 'preamp', 'comp', 'saturation', 'lofi', 'width', 'harmony', 'modulation', 'delay', 'reverb', 'limiter']

function jobsOf(chain) {
  const map = new Map()
  for (const stage of chain.chain) {
    const list = map.get(stage.job) || []
    list.push(stage)
    map.set(stage.job, list)
  }
  return map
}

export default function Compare() {
  const [params, setParams] = useSearchParams()
  const a = params.get('a') || CHAINS[0].slug
  const b = params.get('b') || CHAINS[1].slug

  const left = CHAIN_BY_SLUG[a] || CHAINS[0]
  const right = CHAIN_BY_SLUG[b] || CHAINS[1]

  const jobs = useMemo(() => {
    const la = jobsOf(left)
    const lb = jobsOf(right)
    const all = [...new Set([...la.keys(), ...lb.keys()])]
    all.sort((x, y) => {
      const ix = JOB_ORDER.indexOf(x), iy = JOB_ORDER.indexOf(y)
      return (ix === -1 ? 99 : ix) - (iy === -1 ? 99 : iy)
    })
    return all.map(job => ({ job, a: la.get(job) || [], b: lb.get(job) || [] }))
  }, [left, right])

  function pick(side, slug) {
    setParams({ a: side === 'a' ? slug : a, b: side === 'b' ? slug : b }, { replace: true })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Compare</h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-fog">
          Two chains, aligned by what each stage does rather than by its position. The useful
          reading is usually the gaps: which jobs one engineer does several times and the other
          skips entirely.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {[['a', left], ['b', right]].map(([side, chain]) => (
          <div key={side} className="card p-3">
            <select
              value={chain.slug}
              onChange={e => pick(side, e.target.value)}
              aria-label={side === 'a' ? 'First chain' : 'Second chain'}
              className="w-full rounded-lg border border-edge bg-ink px-2.5 py-2 text-sm font-semibold text-paper outline-none focus:border-edge2">
              {CHAINS.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <p className="mt-2 text-xs text-fog">{chain.tagline}</p>
            <p className="mt-1 text-xs text-mute">{chain.credits.map(c => c.name).join(' · ')}</p>
            <Link to={`/chain/${chain.slug}`} className="mt-2 inline-block text-xs text-amber hover:underline">
              Full chain →
            </Link>
          </div>
        ))}
      </div>

      {left.slug === right.slug ? (
        <p className="card px-4 py-8 text-center text-sm text-fog">Pick two different chains.</p>
      ) : (
        <section>
          <SectionTitle>Stage by stage</SectionTitle>
          <div className="card divide-y divide-edge">
            {jobs.map(({ job, a: sa, b: sb }) => (
              <div key={job} className="grid gap-3 px-4 py-3 sm:grid-cols-[7rem_1fr_1fr]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
                  {CATEGORIES[job] || job}
                </p>
                <Side stages={sa} />
                <Side stages={sb} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        {[left, right].map((chain, i) => (
          <div key={i} className="card p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-mute">
              {chain.name} — how well sourced
            </p>
            <SourcingBar chain={chain} />
            <p className="mt-3 text-xs leading-relaxed text-fog">{chain.caveat}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

function Side({ stages }) {
  if (!stages.length) return <p className="text-sm text-mute">—</p>
  return (
    <ul className="space-y-1.5">
      {stages.map((s, i) => (
        <li key={i} className="text-sm">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-paper">{s.title}</span>
            <ConfidenceBadge level={s.confidence} showLabel={false} />
          </span>
          <span className="block text-xs text-fog">
            {s.plugin ? `${PLUGINS[s.plugin]?.maker} ${PLUGINS[s.plugin]?.name}` : 'technique'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function SourcingBar({ chain }) {
  const all = [...chain.tracking, ...chain.chain].filter(s => s.confidence)
  const counts = { documented: 0, reported: 0, reconstructed: 0 }
  for (const s of all) if (counts[s.confidence] != null) counts[s.confidence]++
  const total = all.length || 1
  const colors = { documented: 'bg-signal', reported: 'bg-amber', reconstructed: 'bg-unver' }

  return (
    <>
      <div className="flex h-2 overflow-hidden rounded-full bg-edge" aria-hidden="true">
        {Object.entries(counts).map(([k, n]) => n > 0 && (
          <div key={k} className={colors[k]} style={{ width: `${(n / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(counts).map(([k, n]) => (
          <li key={k} className="num text-[11px] text-fog">
            <span className={k === 'documented' ? 'text-signal' : k === 'reported' ? 'text-amber' : 'text-unver'}>●</span>{' '}
            {n} {CONFIDENCE[k].label.toLowerCase()}
          </li>
        ))}
      </ul>
    </>
  )
}
