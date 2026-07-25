import { fmt } from '../lib/supabase'

/**
 * A gain/loss figure that does not rely on colour alone (WCAG 1.4.1).
 *
 * Every delta carries a sign and a direction glyph, and announces itself in words to a
 * screen reader, so the information survives colour blindness, greyscale printing and
 * audio output alike.
 */
export default function Delta({
  value,            // signed number
  percent = false,  // render as % rather than currency
  size = 'sm',
  showGlyph = true,
  className = '',
}) {
  if (value == null || Number.isNaN(Number(value))) {
    return <span className={`num text-mute ${className}`} aria-label="not available">—</span>
  }

  const n = Number(value)
  const up = n > 0
  const flat = n === 0
  const tone = flat ? 'text-fog' : up ? 'text-gain' : 'text-loss'
  const glyph = flat ? '→' : up ? '▲' : '▼'
  const sign = up ? '+' : n < 0 ? '−' : ''
  const abs = Math.abs(n)
  const body = percent ? `${abs.toFixed(2)}%` : `$${fmt(abs)}`

  const sizes = { xs: 'text-[11px]', sm: 'text-sm', lg: 'text-lg', xl: 'text-2xl' }
  const spoken = flat ? 'unchanged' : `${up ? 'up' : 'down'} ${body.replace('$', '')}${percent ? '' : ' dollars'}`

  return (
    <span className={`num inline-flex items-baseline gap-1 ${tone} ${sizes[size] || sizes.sm} ${className}`}>
      {showGlyph && <span aria-hidden="true" className="text-[0.8em]">{glyph}</span>}
      <span aria-hidden="true">{sign}{body}</span>
      <span className="sr-only">{spoken}</span>
    </span>
  )
}
