import { useEffect, useState } from 'react'
import { supabase, fmt, dayChange } from '../lib/supabase'

export default function Ticker() {
  const [items, setItems] = useState([])

  useEffect(() => {
    async function load() {
      const { data: artists } = await supabase.from('artists').select('id,name,symbol').eq('is_active', true)
      if (!artists) return
      const since = new Date(); since.setDate(since.getDate() - 1)
      const { data: ticks } = await supabase
        .from('price_ticks')
        .select('artist_id,price,ts')
        .gte('ts', since.toISOString())
        .order('ts', { ascending: true })
      const byArtist = {}
      for (const t of ticks || []) (byArtist[t.artist_id] ||= []).push(t)
      setItems(artists.map(a => {
        const { pct, latest } = dayChange(byArtist[a.id])
        return { ...a, pct, latest }
      }).filter(i => i.latest != null))
    }
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  if (!items.length) return null
  const row = items.concat(items) // duplicate for seamless loop

  return (
    <div className="overflow-hidden border-b border-edge bg-panel/60">
      <div className="marquee-track flex w-max gap-8 px-4 py-1.5">
        {row.map((i, idx) => (
          <span key={idx} className="num flex items-center gap-2 text-xs whitespace-nowrap">
            <span className="text-fog">${i.symbol}</span>
            <span>${fmt(i.latest)}</span>
            <span className={i.pct >= 0 ? 'text-gain' : 'text-loss'}>
              {i.pct >= 0 ? '▲' : '▼'} {Math.abs(i.pct).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
