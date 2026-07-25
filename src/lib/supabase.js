import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://uajheoltstvftdmnigaw.supabase.co',
  'sb_publishable_tW2mUsRFGSogR6LshkLzNw_TIy292yE'
)

export function fmt(n) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function dayChange(ticks) {
  if (!ticks || ticks.length === 0) return { pct: 0, latest: null }
  const latest = Number(ticks[ticks.length - 1].price)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todays = ticks.filter(t => new Date(t.ts) >= today)
  const open = todays.length ? Number(todays[0].price) : Number(ticks[0].price)
  const pct = open ? ((latest - open) / open) * 100 : 0
  return { pct, latest, open }
}
