import { describe, it, expect } from 'vitest'
import { resolveStage, chainCoverage, nextBestBuys, rackValue } from './build'
import { CHAIN_BY_SLUG, CHAINS } from '../data/chains'
import { PLUGINS } from '../data/plugins'

/**
 * The substitution logic is the one place in this app where being wrong is expensive:
 * it tells people what to put on a track and what to spend money on.
 */

describe('resolveStage', () => {
  const eqStage = { job: 'eq', plugin: 'fabfilter-pro-q', confidence: 'documented' }

  it('prefers the exact plugin when it is owned', () => {
    const r = resolveStage(eqStage, ['fabfilter-pro-q'], 'logic')
    expect(r.status).toBe('owned')
    expect(r.pluginId).toBe('fabfilter-pro-q')
  })

  it('falls back to an owned substitute before a free one', () => {
    // Q10 is listed as a budget alternative to Pro-Q, so owning it should win over TDR Nova.
    const r = resolveStage(eqStage, ['waves-req'], 'logic')
    expect(r.status).toBe('substitute')
    expect(r.pluginId).toBe('waves-req')
  })

  it('offers a free plugin when nothing is owned', () => {
    const r = resolveStage(eqStage, [], 'logic')
    expect(r.status).toBe('free')
    expect(PLUGINS[r.pluginId].tier).toBe('free')
  })

  it('names the stock plugin for the chosen DAW when there is no free route', () => {
    // Mod Delay III ships with Pro Tools and has no free alternatives listed.
    const stage = { job: 'delay', plugin: 'avid-mod-delay', confidence: 'documented' }
    const r = resolveStage(stage, [], 'ableton')
    expect(r.status).toBe('stock')
    expect(r.label).toBe('Echo / Delay')
  })

  it('asks for a DAW rather than guessing when none is set', () => {
    const stage = { job: 'delay', plugin: 'avid-mod-delay', confidence: 'documented' }
    const r = resolveStage(stage, [], '')
    expect(r.status).toBe('stock')
    expect(r.sub).toMatch(/Pick a DAW/)
  })

  it('resolves hardware through an owned emulation', () => {
    const stage = { job: 'comp', plugin: 'urei-1176', confidence: 'documented' }
    const r = resolveStage(stage, ['waves-cla-76'], 'logic')
    expect(r.status).toBe('emulation')
    expect(r.pluginId).toBe('waves-cla-76')
    expect(r.sub).toMatch(/1176/)
  })

  it('never claims hardware itself is owned, even if it is in the rack', () => {
    // Nothing in the UI can put hardware in a rack, but a hand-edited localStorage could.
    const stage = { job: 'comp', plugin: 'fairchild-660', confidence: 'documented' }
    const r = resolveStage(stage, ['fairchild-660'], 'logic')
    expect(r.status).not.toBe('owned')
  })

  it('reaches a free plugin through a hardware emulation chain', () => {
    // Fairchild → PuigChild (paid model) → MJUC jr. (that model's free alternative).
    const stage = { job: 'comp', plugin: 'fairchild-660', confidence: 'documented' }
    const r = resolveStage(stage, [], 'logic')
    expect(r.status).toBe('free')
    expect(PLUGINS[r.pluginId].tier).toBe('free')
  })

  it('refuses to substitute for a microphone', () => {
    const stage = { job: 'mic', plugin: 'sony-c800g', confidence: 'documented' }
    const r = resolveStage(stage, ['fabfilter-pro-q'], 'logic')
    expect(r.status).toBe('capture')
    expect(r.sub).toMatch(/No plugin substitutes/)
  })

  it('treats an interface as a capture device too', () => {
    const stage = { job: 'preamp', plugin: 'apollo-twin', confidence: 'documented' }
    expect(resolveStage(stage, [], 'logic').status).toBe('capture')
  })

  it('treats a stage with no plugin as a technique', () => {
    const r = resolveStage({ job: 'width', plugin: null, confidence: 'reported' }, [], 'logic')
    expect(r.status).toBe('technique')
  })

  it('does not throw on an unknown plugin id', () => {
    const r = resolveStage({ job: 'eq', plugin: 'does-not-exist' }, [], 'logic')
    expect(r.status).toBe('unavailable')
  })

  it('resolves every stage in the catalog to something buildable', () => {
    for (const chain of CHAINS) {
      for (const stage of chain.chain) {
        const r = resolveStage(stage, [], 'logic')
        expect(r.status, `${chain.name}/${stage.title}`).not.toBe('unavailable')
      }
    }
  })
})

describe('chainCoverage', () => {
  const chain = CHAIN_BY_SLUG['drake']

  it('counts an empty rack as covered but not owned', () => {
    const cov = chainCoverage(chain, [], 'logic')
    expect(cov.total).toBe(chain.chain.length)
    expect(cov.covered).toBe(cov.total)
    expect(cov.fromRack).toBe(0)
    expect(cov.ratio).toBe(0)
  })

  it('counts stages the rack actually covers', () => {
    const cov = chainCoverage(chain, ['waves-q10', 'waves-rvox'], 'logic')
    expect(cov.fromRack).toBeGreaterThanOrEqual(2)
    expect(cov.ratio).toBeGreaterThan(0)
  })

  it('never exceeds the stage count', () => {
    const everything = Object.keys(PLUGINS)
    for (const c of CHAINS) {
      const cov = chainCoverage(c, everything, 'logic')
      expect(cov.fromRack, c.name).toBeLessThanOrEqual(cov.total)
      expect(cov.ratio, c.name).toBeLessThanOrEqual(1)
    }
  })
})

describe('nextBestBuys', () => {
  it('ranks by how many stages a plugin would cover', () => {
    const buys = nextBestBuys([])
    expect(buys.length).toBeGreaterThan(0)
    for (let i = 1; i < buys.length; i++) {
      expect(buys[i - 1].stages).toBeGreaterThanOrEqual(buys[i].stages)
    }
  })

  it('never recommends hardware', () => {
    for (const b of nextBestBuys([], 50)) {
      expect(PLUGINS[b.id].tier, b.id).not.toBe('hardware')
    }
  })

  it('never recommends something already owned', () => {
    const first = nextBestBuys([])[0].id
    const after = nextBestBuys([first], 50)
    expect(after.map(b => b.id)).not.toContain(first)
  })

  it('stops recommending a job the rack already covers', () => {
    // Owning the free EQ should knock the paid EQs it substitutes for off the list.
    const buys = nextBestBuys(['tdr-nova'], 50).map(b => b.id)
    expect(buys).not.toContain('fabfilter-pro-q')
  })

  it('runs out when everything acquirable is owned', () => {
    const all = Object.keys(PLUGINS).filter(id => PLUGINS[id].tier !== 'hardware')
    expect(nextBestBuys(all)).toHaveLength(0)
  })

  it('honours the limit', () => {
    expect(nextBestBuys([], 3)).toHaveLength(3)
  })
})

describe('rackValue', () => {
  it('sums list prices and ignores unknown ids', () => {
    const value = rackValue(['fabfilter-pro-q', 'tdr-nova', 'nonsense'])
    expect(value).toBe(PLUGINS['fabfilter-pro-q'].price)
  })

  it('is zero for the all-free rack', () => {
    const free = Object.keys(PLUGINS).filter(id => PLUGINS[id].tier === 'free')
    expect(rackValue(free)).toBe(0)
  })
})
