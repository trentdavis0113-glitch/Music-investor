import { useState } from 'react'
import { PLUGINS, CATEGORIES } from '../data/plugins'
import { resolveStage } from '../lib/build'
import { useRack, useDaw } from '../lib/usePrefs'
import { ConfidenceBadge, PluginPill } from './ui'

/**
 * One link in the signal chain.
 *
 * Two things are always visible without expanding: what the plugin was, and how well
 * sourced that claim is. Everything else — the reasoning, the settings, the substitute
 * you can actually use — opens on demand, because a nine-stage chain fully expanded is
 * unreadable.
 */

const STATUS = {
  owned: { label: 'You own this', cls: 'text-signal' },
  emulation: { label: 'You own a model of this', cls: 'text-signal' },
  substitute: { label: 'You own a substitute', cls: 'text-signal' },
  free: { label: 'Free option', cls: 'text-free' },
  stock: { label: 'Already in your DAW', cls: 'text-stock' },
  technique: { label: 'No plugin needed', cls: 'text-fog' },
  capture: { label: 'Use whatever you have', cls: 'text-fog' },
  unavailable: { label: 'No substitute', cls: 'text-mute' },
}

export default function StageCard({ stage, index, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const { rack } = useRack()
  const { daw } = useDaw()

  const plugin = stage.plugin ? PLUGINS[stage.plugin] : null
  const resolved = resolveStage(stage, rack, daw)
  const status = STATUS[resolved.status] || STATUS.unavailable

  // The substitute line is only interesting when it differs from the original.
  const showSub = resolved.status !== 'technique' && resolved.pluginId !== stage.plugin
  // The stock name is worth showing next to a free or owned pick too — "no download
  // needed" is a real advantage — but not when it *is* the pick, or it reads twice.
  const showStock = Boolean(resolved.stock) && resolved.status !== 'stock'

  const bodyId = `stage-${index}-body`

  return (
    <div className="relative pl-11">
      {/* Node on the flow line. */}
      <span
        aria-hidden="true"
        className="absolute left-3 top-4 grid h-[15px] w-[15px] place-items-center rounded-full border border-edge2 bg-panel">
        <span className="h-[5px] w-[5px] rounded-full bg-amber" />
      </span>

      <div className="card mb-2 overflow-hidden">
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="pressable flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-raised/60">
          <span className="num mt-0.5 text-[11px] text-mute">{String(index + 1).padStart(2, '0')}</span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-paper">{stage.title}</span>
              <ConfidenceBadge level={stage.confidence} showLabel={false} />
            </span>
            <span className="mt-0.5 block text-sm text-fog">
              {plugin ? `${plugin.maker} ${plugin.name}` : 'Technique — no plugin'}
              {plugin && (
                <span className="text-mute"> · {CATEGORIES[plugin.category] || plugin.category}</span>
              )}
            </span>
            <span className={`mt-1 block text-[11px] font-medium ${status.cls}`}>
              {status.label}
              {showSub && <span className="text-fog"> — {resolved.label}</span>}
              {showStock && <span className="text-stock"> · or {resolved.stock}</span>}
            </span>
          </span>

          <span aria-hidden="true" className={`mt-1 text-mute transition-transform duration-fast ${open ? 'rotate-90' : ''}`}>
            ›
          </span>
        </button>

        {open && (
          <div id={bodyId} className="space-y-4 border-t border-edge px-4 py-4">
            <p className="text-sm leading-relaxed text-fog">{stage.doing}</p>

            {stage.plugin && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-mute">
                  What they used
                </p>
                <PluginPill id={stage.plugin} showOwn />
                {plugin?.note && <p className="mt-1.5 text-xs leading-relaxed text-mute">{plugin.note}</p>}
              </div>
            )}

            {showSub && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-mute">
                  What you can use
                </p>
                {resolved.pluginId
                  ? <PluginPill id={resolved.pluginId} showOwn />
                  : <span className="font-semibold text-paper">{resolved.label}</span>}
                <p className="mt-1.5 text-xs text-fog">{resolved.sub}</p>
                {showStock && (
                  <p className="mt-1 text-xs text-stock">
                    Or use <span className="font-semibold">{resolved.stock}</span> — already
                    installed, nothing to download.
                  </p>
                )}
              </div>
            )}

            {stage.settings?.length > 0 && (
              <div>
                <p className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-mute">
                  Settings
                  <span
                    className={`chip border normal-case tracking-normal ${
                      stage.settingsOrigin === 'engineer'
                        ? 'border-signal/30 bg-signal/12 text-signal'
                        : 'border-unver/35 bg-unver/12 text-unver'
                    }`}
                    title={
                      stage.settingsOrigin === 'engineer'
                        ? 'These values come from the cited source.'
                        : 'These values are ours — a place to start, not a claim about anyone’s session.'
                    }>
                    {stage.settingsOrigin === 'engineer' ? 'From the source' : 'Our starting point'}
                  </span>
                </p>
                <ul className="space-y-1">
                  {stage.settings.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-fog">
                      <span aria-hidden="true" className="text-mute">–</span>
                      <span className="num text-[13px]">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
