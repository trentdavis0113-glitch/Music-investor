/**
 * Recipe export.
 *
 * The point of this app is that you go and use it in a DAW, which means the useful output
 * is text you can paste into a session note or print. Markdown, because it reads fine as
 * plain text and renders if pasted somewhere that understands it.
 *
 * The export always carries the confidence markers and the sources. A recipe sheet that
 * drops the sourcing is exactly the kind of unattributed "artist vocal chain" list this
 * catalog exists to be better than.
 */

import { PLUGINS } from '../data/plugins'
import { CONFIDENCE } from '../data/chains'
import { resolveStage } from './build'

function label(id) {
  const p = PLUGINS[id]
  return p ? `${p.maker} ${p.name}` : id
}

/**
 * @param chain   a chain from data/chains
 * @param opts    { rack, daw, substitute } — when substitute is true, each stage also
 *                shows what the reader can use instead of the original.
 */
export function toMarkdown(chain, { rack = [], daw = '', substitute = false } = {}) {
  const L = []

  L.push(`# ${chain.name} — vocal chain`)
  L.push('')
  L.push(`*${chain.tagline}*`)
  L.push('')
  L.push(`**Era:** ${chain.era}`)
  L.push(`**DAW / format:** ${chain.daw}`)
  L.push(`**Credits:** ${chain.credits.map(c => `${c.name} (${c.role})`).join(', ')}`)
  L.push(`**Records:** ${chain.records.join(', ')}`)
  L.push('')
  L.push(chain.sound)
  L.push('')

  const tracking = chain.tracking.filter(t => t.plugin)
  if (tracking.length) {
    L.push('## Recording chain')
    L.push('')
    for (const t of tracking) {
      L.push(`- **${label(t.plugin)}** — ${CONFIDENCE[t.confidence]?.label || t.confidence}${t.note ? `. ${t.note}` : ''}`)
    }
    L.push('')
  }

  L.push('## Signal chain')
  L.push('')
  chain.chain.forEach((stage, i) => {
    L.push(`### ${i + 1}. ${stage.title}`)
    L.push('')
    L.push(`- **Original:** ${stage.plugin ? label(stage.plugin) : 'technique, no plugin'}`)
    L.push(`- **Confidence:** ${CONFIDENCE[stage.confidence]?.label || stage.confidence}`)

    if (substitute) {
      const r = resolveStage(stage, rack, daw)
      if (r.status !== 'technique') {
        L.push(`- **You can use:** ${r.label} — ${r.sub}`)
      }
    }

    L.push('')
    L.push(stage.doing)
    L.push('')

    if (stage.settings?.length) {
      const origin = stage.settingsOrigin === 'engineer'
        ? 'From the source'
        : 'Starting point (ours, not the engineer\'s)'
      L.push(`**Settings — ${origin}:**`)
      L.push('')
      for (const s of stage.settings) L.push(`- ${s}`)
      L.push('')
    }
  })

  if (chain.moves?.length) {
    L.push('## If you only do three things')
    L.push('')
    chain.moves.forEach((m, i) => L.push(`${i + 1}. ${m}`))
    L.push('')
  }

  if (chain.caveat) {
    L.push('## Caveat')
    L.push('')
    L.push(chain.caveat)
    L.push('')
  }

  L.push('## Sources')
  L.push('')
  for (const s of chain.sources) {
    L.push(`- ${s.title} — *${s.publication}* — ${s.url}`)
  }
  L.push('')
  L.push('---')
  L.push('')
  L.push('Not affiliated with or endorsed by any artist, engineer or manufacturer.')

  return L.join('\n')
}

/** Copy to clipboard, returning false rather than throwing when the API is unavailable. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Trigger a download without a server round-trip. */
export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
