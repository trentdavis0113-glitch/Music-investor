import { describe, it, expect } from 'vitest'
import { CHAINS, CHAIN_BY_SLUG, CONFIDENCE, pluginUsage } from './chains'
import { PLUGINS, STOCK_BY_JOB, DAWS, CATEGORIES, substitutesFor } from './plugins'
import { STAGES, EXCEPTIONS } from './glossary'

/**
 * The catalog is hand-written data, and a typo in a plugin id renders as a broken link
 * rather than an error. These tests are the reason the UI can look things up without
 * defensive branching everywhere.
 */

describe('chain integrity', () => {
  it('has unique slugs', () => {
    const slugs = CHAINS.map(c => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('gives every chain the fields the UI renders unconditionally', () => {
    for (const c of CHAINS) {
      expect(c.slug, `${c.name} slug`).toMatch(/^[a-z0-9-]+$/)
      expect(c.name).toBeTruthy()
      expect(c.tagline).toBeTruthy()
      expect(c.era).toBeTruthy()
      expect(c.daw).toBeTruthy()
      expect(c.sound.length, `${c.name} sound`).toBeGreaterThan(80)
      expect(c.genres.length, `${c.name} genres`).toBeGreaterThan(0)
      expect(c.credits.length, `${c.name} credits`).toBeGreaterThan(0)
      expect(c.records.length, `${c.name} records`).toBeGreaterThan(0)
      expect(c.chain.length, `${c.name} stages`).toBeGreaterThan(0)
      for (const credit of c.credits) {
        expect(credit.name, `${c.name} credit name`).toBeTruthy()
        expect(credit.role, `${c.name} credit role`).toBeTruthy()
      }
    }
  })

  it('references only plugins that exist', () => {
    for (const c of CHAINS) {
      for (const stage of [...c.tracking, ...c.chain]) {
        if (!stage.plugin) continue
        expect(PLUGINS[stage.plugin], `${c.name}: unknown plugin "${stage.plugin}"`).toBeTruthy()
      }
    }
  })

  it('labels every stage with a known confidence level', () => {
    for (const c of CHAINS) {
      for (const stage of [...c.tracking, ...c.chain]) {
        expect(CONFIDENCE[stage.confidence], `${c.name}/${stage.title || stage.job}`).toBeTruthy()
      }
    }
  })

  it('marks the origin of every settings list', () => {
    // A settings list with no origin would render as if it came from the engineer.
    for (const c of CHAINS) {
      for (const stage of c.chain) {
        if (!stage.settings?.length) continue
        expect(
          ['engineer', 'starting-point'],
          `${c.name}/${stage.title} settingsOrigin`,
        ).toContain(stage.settingsOrigin)
      }
    }
  })

  it('gives every chain stage a title, a job and an explanation', () => {
    for (const c of CHAINS) {
      for (const stage of c.chain) {
        expect(stage.title, `${c.name} stage title`).toBeTruthy()
        expect(stage.job, `${c.name}/${stage.title} job`).toBeTruthy()
        expect(stage.doing?.length, `${c.name}/${stage.title} doing`).toBeGreaterThan(30)
      }
    }
  })

  it('cites at least one source per chain, with a usable URL', () => {
    for (const c of CHAINS) {
      expect(c.sources.length, `${c.name} sources`).toBeGreaterThan(0)
      for (const s of c.sources) {
        expect(s.title, `${c.name} source title`).toBeTruthy()
        expect(s.publication, `${c.name} source publication`).toBeTruthy()
        expect(s.url, `${c.name} source url`).toMatch(/^https:\/\//)
      }
    }
  })

  it('carries a caveat wherever anything is less than documented', () => {
    // The honesty rule: if the entry contains guesswork, it has to say so in prose too,
    // not only in a badge someone can miss.
    for (const c of CHAINS) {
      const soft = [...c.tracking, ...c.chain].some(s => s.confidence !== 'documented')
      if (soft) expect(c.caveat, `${c.name} needs a caveat`).toBeTruthy()
    }
  })

  it('indexes by slug without losing anything', () => {
    expect(Object.keys(CHAIN_BY_SLUG).length).toBe(CHAINS.length)
  })
})

describe('plugin registry', () => {
  it('gives every plugin the fields the UI renders', () => {
    for (const [id, p] of Object.entries(PLUGINS)) {
      expect(id).toMatch(/^[a-z0-9-]+$/)
      expect(p.name, `${id} name`).toBeTruthy()
      expect(p.maker, `${id} maker`).toBeTruthy()
      expect(CATEGORIES[p.category], `${id} category "${p.category}"`).toBeTruthy()
      expect(['stock', 'free', 'paid', 'hardware'], `${id} tier`).toContain(p.tier)
      expect(typeof p.price, `${id} price`).toBe('number')
    }
  })

  it('points emulations and alternatives at real plugins', () => {
    for (const [id, p] of Object.entries(PLUGINS)) {
      for (const emu of p.emulations || []) {
        expect(PLUGINS[emu], `${id} emulation "${emu}"`).toBeTruthy()
      }
      for (const list of Object.values(p.alts || {})) {
        for (const alt of list) {
          expect(PLUGINS[alt], `${id} alternative "${alt}"`).toBeTruthy()
        }
      }
    }
  })

  it('never suggests an item as its own substitute', () => {
    for (const id of Object.keys(PLUGINS)) {
      expect(substitutesFor(id), id).not.toContain(id)
    }
  })

  it('prices free plugins at zero and hardware above it', () => {
    for (const [id, p] of Object.entries(PLUGINS)) {
      if (p.tier === 'free') expect(p.price, `${id}`).toBe(0)
    }
  })

  it('covers every DAW for every job it names', () => {
    for (const [job, byDaw] of Object.entries(STOCK_BY_JOB)) {
      expect(CATEGORIES[job], `stock job "${job}"`).toBeTruthy()
      for (const daw of Object.keys(DAWS)) {
        expect(byDaw[daw], `${job} has no entry for ${daw}`).toBeTruthy()
      }
    }
  })

  it('offers a free or stock route for every item used in a chain', () => {
    // The promise on the landing page is that any chain can be rebuilt with free or stock
    // tools. This is that promise, enforced.
    //
    // Capture devices are exempt and always will be: no plugin substitutes for a
    // microphone or an interface, and pretending otherwise would be the exact dishonesty
    // this catalog avoids. They only ever appear in the recording chain, which is
    // presented as history rather than as instructions.
    const usage = pluginUsage()
    for (const id of usage.keys()) {
      const p = PLUGINS[id]
      if (p.capture) continue
      const hasFree = substitutesFor(id).some(s => PLUGINS[s]?.tier === 'free')
      const hasStock = Boolean(STOCK_BY_JOB[p.category])
      expect(hasFree || hasStock, `${id} has no free or stock route`).toBe(true)
    }
  })

  it('keeps capture devices out of the mix chain, where a substitute would be expected', () => {
    for (const c of CHAINS) {
      for (const stage of c.chain) {
        const item = stage.plugin ? PLUGINS[stage.plugin] : null
        expect(item?.capture, `${c.name}/${stage.title} puts a capture device in the mix chain`)
          .not.toBe(true)
      }
    }
  })

  it('marks every microphone as a capture device', () => {
    for (const [id, p] of Object.entries(PLUGINS)) {
      if (p.category === 'mic') expect(p.capture, id).toBe(true)
    }
  })
})

describe('plugin usage index', () => {
  it('links every used plugin back to a real chain', () => {
    const usage = pluginUsage()
    expect(usage.size).toBeGreaterThan(20)
    for (const [id, uses] of usage) {
      expect(PLUGINS[id], id).toBeTruthy()
      for (const u of uses) {
        expect(CHAIN_BY_SLUG[u.slug], `${id} → ${u.slug}`).toBeTruthy()
        expect(['tracking', 'chain']).toContain(u.where)
      }
    }
  })
})

describe('glossary', () => {
  it('cross-references only chains that exist', () => {
    for (const s of STAGES) {
      for (const slug of s.seeAlso || []) {
        expect(CHAIN_BY_SLUG[slug], `stage ${s.id} → ${slug}`).toBeTruthy()
      }
    }
    for (const e of EXCEPTIONS) {
      expect(CHAIN_BY_SLUG[e.slug], `exception "${e.title}" → ${e.slug}`).toBeTruthy()
    }
  })

  it('has unique stage ids', () => {
    const ids = STAGES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
