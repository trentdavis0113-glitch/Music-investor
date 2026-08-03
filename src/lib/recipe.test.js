import { describe, it, expect } from 'vitest'
import { toMarkdown } from './recipe'
import { CHAINS, CHAIN_BY_SLUG } from '../data/chains'

/**
 * The export is what leaves the site and ends up pasted into a session note, so it has to
 * carry the sourcing with it. A recipe sheet stripped of its citations is exactly the kind
 * of unattributed chain list this catalog exists to be better than.
 */

describe('toMarkdown', () => {
  const chain = CHAIN_BY_SLUG['adele']
  const md = toMarkdown(chain)

  it('leads with the artist', () => {
    expect(md.startsWith(`# ${chain.name} — vocal chain`)).toBe(true)
  })

  it('includes every stage, in order', () => {
    chain.chain.forEach((stage, i) => {
      expect(md).toContain(`### ${i + 1}. ${stage.title}`)
    })
  })

  it('carries the confidence level of every stage', () => {
    expect(md).toContain('**Confidence:** Documented')
  })

  it('marks our settings as ours', () => {
    expect(md).toMatch(/Starting point \(ours, not the engineer's\)/)
  })

  it('marks engineer-stated settings differently', () => {
    // Adele's de-ess stage has settingsOrigin: 'engineer'.
    expect(md).toContain('**Settings — From the source:**')
  })

  it('includes every source URL', () => {
    for (const s of chain.sources) expect(md).toContain(s.url)
  })

  it('carries the caveat', () => {
    expect(md).toContain(chain.caveat)
  })

  it('states the lack of affiliation', () => {
    expect(md).toMatch(/Not affiliated/)
  })

  it('omits the substitution line unless asked', () => {
    expect(md).not.toContain('**You can use:**')
  })

  it('adds substitutions when asked', () => {
    const withSubs = toMarkdown(chain, { rack: ['waves-cla-76'], daw: 'logic', substitute: true })
    expect(withSubs).toContain('**You can use:**')
    expect(withSubs).toContain('Waves CLA-76')
  })

  it('produces a non-trivial sheet for every chain in the catalog', () => {
    for (const c of CHAINS) {
      const out = toMarkdown(c, { rack: [], daw: 'ableton', substitute: true })
      expect(out.length, c.name).toBeGreaterThan(600)
      expect(out, c.name).toContain('## Sources')
      expect(out, c.name).toContain('## Signal chain')
      // A missing plugin id would render as "undefined undefined" in the export.
      expect(out, c.name).not.toContain('undefined')
    }
  })
})
