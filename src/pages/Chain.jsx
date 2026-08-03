import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CHAIN_BY_SLUG, CHAINS } from '../data/chains'
import { chainCoverage } from '../lib/build'
import { toMarkdown, copyText, downloadText } from '../lib/recipe'
import { useRack, useDaw } from '../lib/usePrefs'
import StageCard from '../components/StageCard'
import { ConfidenceBadge, PluginPill, DawPicker, CoverageBar, SectionTitle } from '../components/ui'
import NotFound from './NotFound'

export default function Chain() {
  const { slug } = useParams()
  const chain = CHAIN_BY_SLUG[slug]
  const { rack } = useRack()
  const { daw } = useDaw()
  const [expandAll, setExpandAll] = useState(false)
  const [copied, setCopied] = useState(null)

  // A copy confirmation that never clears is just a label. Clear it on its own.
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(null), 2500)
    return () => clearTimeout(t)
  }, [copied])

  useEffect(() => { setExpandAll(false) }, [slug])

  if (!chain) return <NotFound what="chain" />

  const cov = chainCoverage(chain, rack, daw)
  const tracking = chain.tracking.filter(t => t.plugin)
  const trackingNotes = chain.tracking.filter(t => !t.plugin)

  const idx = CHAINS.findIndex(c => c.slug === slug)
  const next = CHAINS[(idx + 1) % CHAINS.length]

  async function onCopy() {
    const md = toMarkdown(chain, { rack, daw, substitute: true })
    setCopied(await copyText(md) ? 'ok' : 'fail')
  }

  function onDownload() {
    downloadText(`${chain.slug}-vocal-chain.md`, toMarkdown(chain, { rack, daw, substitute: true }))
  }

  return (
    <article className="space-y-8">
      <Link to="/" className="inline-block text-sm text-fog hover:text-paper">← All chains</Link>

      <header className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {chain.name}
          </h1>
          <p className="mt-1.5 text-lg leading-snug text-amber">{chain.tagline}</p>
        </div>

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="shrink-0 text-mute">Engineered by</dt>
            <dd className="text-fog">{chain.credits.map(c => `${c.name} (${c.role})`).join(', ')}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-mute">Era</dt>
            <dd className="text-fog">{chain.era}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-mute">Records</dt>
            <dd className="text-fog">{chain.records.join(', ')}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-mute">Format</dt>
            <dd className="text-fog">{chain.daw}</dd>
          </div>
        </dl>

        <p className="max-w-2xl text-[15px] leading-relaxed text-fog">{chain.sound}</p>
      </header>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-3">
        <DawPicker compact />
        <CoverageBar covered={cov.fromRack} total={cov.total} />
        <div className="flex flex-wrap gap-2">
          <button onClick={onCopy} className="btn text-xs">
            {copied === 'ok' ? '✓ Copied' : copied === 'fail' ? 'Copy blocked' : 'Copy recipe'}
          </button>
          <button onClick={onDownload} className="btn text-xs">Download .md</button>
        </div>
      </section>

      {tracking.length > 0 && (
        <section>
          <SectionTitle sub="What the voice went through before it reached a DAW.">
            Recording chain
          </SectionTitle>
          <ul className="card divide-y divide-edge">
            {tracking.map((t, i) => (
              <li key={i} className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-4 py-3">
                <span className="num w-16 shrink-0 text-[11px] uppercase tracking-wider text-mute">{t.job}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <PluginPill id={t.plugin} showOwn />
                    <ConfidenceBadge level={t.confidence} showLabel={false} />
                  </span>
                  {t.note && <span className="mt-1 block text-sm text-fog">{t.note}</span>}
                </span>
              </li>
            ))}
          </ul>
          {trackingNotes.map((t, i) => (
            <p key={i} className="mt-2 text-sm text-mute">{t.note}</p>
          ))}
        </section>
      )}

      {tracking.length === 0 && trackingNotes.length > 0 && (
        <section>
          <SectionTitle>Recording chain</SectionTitle>
          {trackingNotes.map((t, i) => (
            <p key={i} className="card px-4 py-3 text-sm text-fog">{t.note}</p>
          ))}
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <SectionTitle sub="In order. Tap a stage for the reasoning, the settings, and what you can use instead.">
            Signal chain
          </SectionTitle>
          <button onClick={() => setExpandAll(v => !v)} className="btn mb-3 text-xs">
            {expandAll ? 'Collapse all' : 'Expand all'}
          </button>
        </div>

        <div className="relative">
          <span className="flowline" aria-hidden="true" />
          {chain.chain.map((stage, i) => (
            // Keyed by expandAll so toggling it resets every card's own open state.
            <StageCard key={`${i}-${expandAll}`} stage={stage} index={i} defaultOpen={expandAll} />
          ))}
        </div>
      </section>

      {chain.moves?.length > 0 && (
        <section>
          <SectionTitle sub="If you take nothing else from this page.">If you only do three things</SectionTitle>
          <ol className="card divide-y divide-edge">
            {chain.moves.map((m, i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
                <span className="num shrink-0 text-sm font-bold text-amber">{i + 1}</span>
                <span className="text-sm leading-relaxed text-fog">{m}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {chain.caveat && (
        <section className="rounded-card border border-unver/30 bg-unver/[0.07] px-4 py-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-unver">What we don't know</p>
          <p className="text-sm leading-relaxed text-fog">{chain.caveat}</p>
        </section>
      )}

      <section>
        <SectionTitle sub="Go and read them. This page is a summary of other people's work.">Sources</SectionTitle>
        <ul className="card divide-y divide-edge">
          {chain.sources.map((s, i) => (
            <li key={i}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="pressable flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-3 hover:bg-raised/60">
                <span className="text-sm font-medium text-paper">{s.title}</span>
                <span className="text-xs italic text-mute">{s.publication}</span>
                <span aria-hidden="true" className="ml-auto text-xs text-mute">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <nav className="flex items-center justify-between border-t border-edge pt-4 text-sm">
        <Link to="/compare" className="text-fog hover:text-paper">Compare with another chain</Link>
        <Link to={`/chain/${next.slug}`} className="text-fog hover:text-paper">{next.name} →</Link>
      </nav>
    </article>
  )
}
