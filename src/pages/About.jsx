import { Link } from 'react-router-dom'
import { CHAINS, CONFIDENCE } from '../data/chains'
import { SectionTitle } from '../components/ui'

/**
 * Methodology and every source in the catalog, in one place.
 *
 * A site that publishes "here is what X used" owes the reader a page that says exactly how
 * confident it is and where each claim came from. Most sites in this space do not have one.
 */

export default function About() {
  const counts = { documented: 0, reported: 0, reconstructed: 0 }
  for (const c of CHAINS) {
    for (const s of [...c.tracking, ...c.chain]) {
      if (counts[s.confidence] != null) counts[s.confidence]++
    }
  }
  const total = counts.documented + counts.reported + counts.reconstructed

  // Sources are per-chain and repeat across entries; de-duplicate by URL for the index.
  const sources = new Map()
  for (const c of CHAINS) {
    for (const s of c.sources) {
      const entry = sources.get(s.url) || { ...s, chains: [] }
      entry.chains.push(c.name)
      sources.set(s.url, entry)
    }
  }
  const byPublication = [...sources.values()].sort(
    (a, b) => a.publication.localeCompare(b.publication) || a.title.localeCompare(b.title))

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">How this is sourced</h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-fog">
          Search for any artist's vocal chain and you will find a dozen confident lists with no
          citation, most of them selling a preset pack. The chains here are assembled from
          published interviews with the people who did the work, and every stage is labelled with
          how well it is sourced. Where nobody has published anything, the entry says so instead
          of filling the gap.
        </p>
      </header>

      <section>
        <SectionTitle sub={`${total} stages across ${CHAINS.length} chains.`}>The three levels</SectionTitle>
        <ul className="card divide-y divide-edge">
          {Object.entries(CONFIDENCE).map(([k, c]) => (
            <li key={k} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
              <span className={`chip border ${
                c.tone === 'good' ? 'border-signal/30 bg-signal/12 text-signal'
                  : c.tone === 'warn' ? 'border-amber/30 bg-amber/12 text-amber'
                    : 'border-unver/35 bg-unver/12 text-unver'}`}>
                {c.label}
              </span>
              <span className="min-w-0 flex-1 text-sm text-fog">{c.blurb}</span>
              <span className="num text-sm text-paper">{counts[k]}</span>
              <span className="num w-12 text-right text-xs text-mute">
                {total ? Math.round((counts[k] / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fog">
          Settings carry the same distinction one level down. A stage marked{' '}
          <span className="font-medium text-signal">From the source</span> quotes values the
          engineer gave. A stage marked{' '}
          <span className="font-medium text-unver">Our starting point</span> is our suggestion for
          getting in the neighbourhood — useful, but not a claim about anyone's session. Most
          engineers do not publish knob positions, so most settings here are ours.
        </p>
      </section>

      <section>
        <SectionTitle sub="Assume every number is a starting point unless it says otherwise.">
          What this can't tell you
        </SectionTitle>
        <ul className="card divide-y divide-edge text-sm leading-relaxed text-fog">
          <li className="px-4 py-3">
            <span className="font-semibold text-paper">Chains change every session.</span> An engineer's
            template is a default, not a law. The chain that made one record is not necessarily the
            one that made the next.
          </li>
          <li className="px-4 py-3">
            <span className="font-semibold text-paper">The room and the singer dominate.</span> Most of
            what you are hearing is a great performance captured well. No plugin order recovers a
            take that was not there.
          </li>
          <li className="px-4 py-3">
            <span className="font-semibold text-paper">Plugin models are not the hardware.</span> A
            Fairchild model gets you close to a Fairchild. It does not get you the specific unit,
            forty years old and drifting, that was in that rack that day.
          </li>
          <li className="px-4 py-3">
            <span className="font-semibold text-paper">Interviews simplify.</span> An engineer listing
            six plugins in a magazine is describing a session with sixty. Absence from this page is
            not evidence of absence from the record.
          </li>
        </ul>
      </section>

      <section>
        <SectionTitle sub="Every source in the catalog. Go and read them — this site is a summary of other people's work.">
          Sources ({byPublication.length})
        </SectionTitle>
        <ul className="card divide-y divide-edge">
          {byPublication.map(s => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer"
                className="pressable block px-4 py-3 hover:bg-raised/60">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium text-paper">{s.title}</span>
                  <span className="text-xs italic text-mute">{s.publication}</span>
                  <span aria-hidden="true" className="ml-auto text-xs text-mute">↗</span>
                </span>
                <span className="mt-0.5 block text-xs text-mute">{s.chains.join(', ')}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>Corrections</SectionTitle>
        <p className="max-w-2xl text-sm leading-relaxed text-fog">
          If you engineered one of these records and something here is wrong, it is wrong — the
          catalog lives in{' '}
          <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-xs text-paper">src/data/chains.js</code>{' '}
          and every entry is a plain object with a sources array. A correction with a citation
          beats anything on this page.
        </p>
      </section>

      <section className="rounded-card border border-edge bg-panel p-4">
        <p className="text-xs leading-relaxed text-mute">
          Not affiliated with, endorsed by, or connected to any artist, engineer, studio or plugin
          manufacturer named here. All trademarks belong to their owners. Product names are used
          to identify equipment described in published interviews. Prices are approximate list
          prices in USD and go out of date quickly. Nothing on this site is for sale.
        </p>
      </section>

      <p className="text-center text-sm">
        <Link to="/" className="text-fog hover:text-paper">← Back to the chains</Link>
      </p>
    </div>
  )
}
