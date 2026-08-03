/**
 * "Can I actually build this?"
 *
 * The catalog lists what engineers used. Almost nobody reading it owns a Fairchild, and
 * plenty of people own nothing at all. This module resolves every stage of a chain into
 * something the reader can actually put on a track, in this order of preference:
 *
 *   1. the exact plugin, if they own it
 *   2. a plugin they own that models or substitutes for it
 *   3. a free plugin that does the job
 *   4. whatever their DAW already ships for that job
 *
 * Hardware is never "ownable" here. A Fairchild 660 resolves through its emulations, which
 * is the only honest way to present it to someone with a laptop.
 */

import { PLUGINS, STOCK_BY_JOB, substitutesFor, ACQUIRABLE_IDS } from '../data/plugins'
import { CHAINS } from '../data/chains'

/**
 * How a single stage resolves for a given rack and DAW.
 *
 * `stock` is reported alongside whatever wins, not only when it wins. A free plugin beats
 * a stock one on quality and so takes precedence, but "you already have something for
 * this, no download needed" is worth knowing either way — and without carrying it through
 * separately, choosing a DAW would visibly change almost nothing.
 *
 * @returns {{status: string, pluginId: string|null, label: string, sub: string, stock: string|null}}
 *   status is one of:
 *   technique | capture | owned | emulation | substitute | free | stock | unavailable
 */
export function resolveStage(stage, rack, daw) {
  const owned = new Set(rack)

  if (!stage.plugin) {
    return { status: 'technique', pluginId: null, label: 'No plugin needed', sub: 'This stage is a technique, not a purchase.', stock: null }
  }

  const plugin = PLUGINS[stage.plugin]
  if (!plugin) {
    return { status: 'unavailable', pluginId: stage.plugin, label: stage.plugin, sub: 'Unknown item.', stock: null }
  }

  // Microphones and interfaces have no software equivalent, and saying otherwise would be
  // the one lie this catalog can't afford. Use what you have.
  if (plugin.capture) {
    return {
      status: 'capture',
      pluginId: stage.plugin,
      label: `${plugin.maker} ${plugin.name}`,
      sub: 'No plugin substitutes for this. Use whatever you have — it matters less than the performance.',
      stock: null,
    }
  }

  const byDaw = STOCK_BY_JOB[plugin.category]
  const stock = daw && byDaw?.[daw] ? byDaw[daw] : null
  const done = (status, pluginId, label, sub) => ({ status, pluginId, label, sub, stock })

  // Hardware can't be owned, but its emulations can.
  if (plugin.tier === 'hardware') {
    const emu = (plugin.emulations || []).find(id => owned.has(id))
    if (emu) return done('emulation', emu, pluginLabel(emu), `Models the ${plugin.name}. You own this.`)
  } else if (owned.has(stage.plugin)) {
    return done('owned', stage.plugin, pluginLabel(stage.plugin), 'In your rack.')
  }

  // Anything they own that stands in for it.
  const sub = substitutesFor(stage.plugin).find(id => owned.has(id))
  if (sub) {
    return done('substitute', sub, pluginLabel(sub), `Stands in for the ${plugin.name}. You own this.`)
  }

  // A free plugin that does the job. Preferred over stock: free plugins in this catalog
  // are generally better than the stock equivalent, and the stock name is reported anyway.
  const free = substitutesFor(stage.plugin).find(id => PLUGINS[id]?.tier === 'free')
  if (free) {
    return done('free', free, pluginLabel(free), `Free. Covers the same job as the ${plugin.name}.`)
  }

  // Otherwise, whatever their DAW ships.
  if (byDaw) {
    if (stock) return done('stock', null, stock, 'Already installed — it came with your DAW.')
    if (!daw) return done('stock', null, `Your DAW's stock ${plugin.category}`, 'Pick a DAW above to see the exact name.')
  }

  return done('unavailable', stage.plugin, plugin.name, 'No free or stock substitute for this one.')
}

function pluginLabel(id) {
  const p = PLUGINS[id]
  return p ? `${p.maker} ${p.name}` : id
}

/** Statuses that mean "the reader can do this stage right now, with what they have". */
const COVERED = new Set(['technique', 'capture', 'owned', 'emulation', 'substitute', 'free', 'stock'])
const FROM_RACK = new Set(['owned', 'emulation', 'substitute'])

/**
 * Coverage for a whole chain. `rackStages` counts only stages the reader's own plugins
 * cover — free and stock substitutes are buildable but they aren't "you already own it",
 * and conflating the two would make the rack feature meaningless.
 */
export function chainCoverage(chain, rack, daw) {
  const stages = chain.chain
  let covered = 0
  let fromRack = 0
  for (const stage of stages) {
    const r = resolveStage(stage, rack, daw)
    if (COVERED.has(r.status)) covered++
    if (FROM_RACK.has(r.status)) fromRack++
  }
  return {
    total: stages.length,
    covered,
    fromRack,
    // A chain with no plugin stages at all would divide by zero.
    ratio: stages.length ? fromRack / stages.length : 0,
  }
}

/**
 * What to buy next: the plugin not already owned that appears in the most stages across
 * the whole catalog. Hardware is excluded, since "buy a Fairchild" is not advice.
 */
export function nextBestBuys(rack, limit = 6) {
  const owned = new Set(rack)
  const counts = new Map()

  for (const chain of CHAINS) {
    for (const stage of [...chain.tracking, ...chain.chain]) {
      if (!stage.plugin) continue
      const plugin = PLUGINS[stage.plugin]
      if (!plugin) continue

      // A hardware stage is really a vote for its emulations.
      const candidates = plugin.tier === 'hardware' ? (plugin.emulations || []) : [stage.plugin]
      for (const id of candidates) {
        if (!ACQUIRABLE_IDS.includes(id) || owned.has(id)) continue
        // Already covered by something in the rack? Then it isn't the next thing to buy.
        if (substitutesFor(id).some(s => owned.has(s))) continue
        const entry = counts.get(id) || { id, stages: 0, artists: new Set() }
        entry.stages++
        entry.artists.add(chain.name)
        counts.set(id, entry)
      }
    }
  }

  return [...counts.values()]
    .map(e => ({ ...e, artists: [...e.artists] }))
    .sort((a, b) =>
      b.stages - a.stages ||
      (PLUGINS[a.id].price || 0) - (PLUGINS[b.id].price || 0) ||
      a.id.localeCompare(b.id))
    .slice(0, limit)
}

/** Total list price of everything in the rack, for the "what have I spent" line. */
export function rackValue(rack) {
  return rack.reduce((sum, id) => sum + (PLUGINS[id]?.price || 0), 0)
}
