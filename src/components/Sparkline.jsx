export default function Sparkline({ points, up }) {
  if (!points || points.length < 2) return <div className="h-8 w-24" />
  const w = 96, h = 32, pad = 2
  const min = Math.min(...points), max = Math.max(...points)
  const range = max - min || 1
  const step = (w - pad * 2) / (points.length - 1)
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(pad + i * step).toFixed(1)},${(h - pad - ((p - min) / range) * (h - pad * 2)).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={h} className="shrink-0">
      <path d={d} fill="none" stroke={up ? '#3DDC97' : '#FF6B6B'} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
