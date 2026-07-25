import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PulseBar() {
  const [now, setNow] = useState(Date.now())
  const [seasonEnd, setSeasonEnd] = useState(null)

  useEffect(() => {
    supabase.from('seasons').select('ends_at')
      .lte('starts_at', new Date().toISOString())
      .gte('ends_at', new Date().toISOString())
      .order('starts_at', { ascending: false }).limit(1)
      .then(({ data }) => setSeasonEnd(data?.[0]?.ends_at || null))
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const next = new Date(now)
  next.setMinutes(Math.ceil((next.getMinutes() + 0.001) / 15) * 15, 0, 0)
  const secs = Math.max(0, Math.floor((next.getTime() - now) / 1000))
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')
  const daysLeft = seasonEnd ? Math.max(0, Math.ceil((new Date(seasonEnd) - now) / 86400_000)) : null

  return (
    <div className="flex items-center justify-between rounded-xl border border-edge bg-panel px-4 py-2 text-xs">
      <span className="flex items-center gap-2 text-fog">
        <span className="relative flex h-2 w-2">
          <span className="absolute h-full w-full animate-ping rounded-full bg-gain opacity-60" />
          <span className="h-2 w-2 rounded-full bg-gain" />
        </span>
        Market live
      </span>
      <span className="num text-fog">Next reprice <span className="text-paper">{mm}:{ss}</span></span>
      {daysLeft != null && (
        <span className="num text-fog"><span className="text-paper">{daysLeft}d</span> left in season</span>
      )}
    </div>
  )
}
