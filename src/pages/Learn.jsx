import { Link } from 'react-router-dom'
import { STAGES, EXCEPTIONS, TERMS } from '../data/glossary'
import { CHAIN_BY_SLUG } from '../data/chains'
import { SectionTitle } from '../components/ui'

/**
 * The part the plugin lists never explain: what order, and why.
 *
 * Every stage links out to the chains that demonstrate it, and the exceptions section
 * exists so the default order doesn't read as a rule — three of the best records in the
 * catalog break it deliberately.
 */

export default function Learn() {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Order matters more than gear.
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-fog">
          You can build a professional vocal chain out of free plugins. You cannot build one out
          of the right plugins in the wrong order. This is the default order, why each stage sits
          where it does, and the places where the records in this catalog break it on purpose.
        </p>
      </header>

      <section>
        <SectionTitle sub="Top to bottom. Not every chain needs every stage.">The default order</SectionTitle>
        <div className="relative">
          <span className="flowline" aria-hidden="true" />
          <ol>
            {STAGES.map((s, i) => (
              <li key={s.id} className="relative pl-11">
                <span
                  aria-hidden="true"
                  className="absolute left-3 top-5 grid h-[15px] w-[15px] place-items-center rounded-full border border-edge2 bg-panel">
                  <span className="h-[5px] w-[5px] rounded-full bg-amber" />
                </span>
                <div className="card mb-2 space-y-3 p-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="num text-[11px] text-mute">{String(i + 1).padStart(2, '0')}</span>
                    <h2 className="font-display text-lg font-extrabold tracking-tight">{s.name}</h2>
                    <span className="text-xs text-mute">{s.where}</span>
                  </div>

                  <p className="text-sm font-medium text-paper">{s.what}</p>
                  <p className="text-sm leading-relaxed text-fog">{s.why}</p>

                  <p className="rounded-lg border border-clip/25 bg-clip/[0.07] px-3 py-2 text-sm leading-relaxed text-fog">
                    <span className="font-semibold text-clip">Common mistake: </span>{s.mistake}
                  </p>

                  {s.seeAlso?.length > 0 && (
                    <p className="flex flex-wrap items-center gap-2 text-xs text-mute">
                      Hear it on:
                      {s.seeAlso.map(slug => CHAIN_BY_SLUG[slug] && (
                        <Link key={slug} to={`/chain/${slug}`}
                          className="chip border border-edge bg-raised text-fog hover:border-edge2 hover:text-paper">
                          {CHAIN_BY_SLUG[slug].name}
                        </Link>
                      ))}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section>
        <SectionTitle sub="Every one of these is a deliberate choice by someone who knew the default.">
          Where the good records break it
        </SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2">
          {EXCEPTIONS.map((e, i) => (
            <li key={i} className="card space-y-2 p-4">
              <h3 className="font-display text-base font-extrabold tracking-tight">{e.title}</h3>
              <p className="text-xs text-amber">{e.who}</p>
              <p className="text-sm leading-relaxed text-fog">{e.what}</p>
              <p className="text-sm leading-relaxed text-fog">
                <span className="font-semibold text-paper">Why it works: </span>{e.effect}
              </p>
              <Link to={`/chain/${e.slug}`} className="inline-block text-xs text-amber hover:underline">
                Full chain →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle sub="The words the interviews assume you already know.">Glossary</SectionTitle>
        <dl className="card divide-y divide-edge">
          {TERMS.map(t => (
            <div key={t.term} className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <dt className="font-semibold text-paper">{t.term}</dt>
              <dd className="text-sm leading-relaxed text-fog">{t.def}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
