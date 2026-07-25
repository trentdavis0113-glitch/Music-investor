import { createClient } from '@supabase/supabase-js'

// Single source of truth for project credentials. Previously Auth.jsx carried its own
// hardcoded legacy JWT while this file used the newer publishable key, so rotating one
// silently broke signup while the rest of the app kept working.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://uajheoltstvftdmnigaw.supabase.co'
export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_tW2mUsRFGSogR6LshkLzNw_TIy292yE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

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

/**
 * Call a Supabase Edge Function with a hard timeout and bounded retries.
 *
 * A bare fetch() has no timeout, so a hung request left the signup button stuck on
 * "Working…" forever. Retries cover transient 5xx/429/network blips only — 4xx responses
 * are terminal and return immediately so we never double-submit a signup.
 */
export async function callFunction(name, body, { timeoutMs = 15000, retries = 2 } = {}) {
  let lastErr = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })

      let out = null
      try { out = await res.json() } catch { /* tolerate a non-JSON body */ }

      if (res.ok) return { data: out, error: null }

      const err = {
        message: out?.error || `Request failed (${res.status}).`,
        code: out?.code || null,
        status: res.status,
      }
      // Client errors are terminal: retrying a 400/409 just wastes the user's time.
      if (res.status < 500 && res.status !== 429) return { data: null, error: err }
      lastErr = err
    } catch (e) {
      lastErr = e?.name === 'AbortError'
        ? { message: 'That took too long. Check your connection and try again.', code: 'timeout' }
        : { message: 'Network error. Check your connection and try again.', code: 'network' }
    } finally {
      clearTimeout(timer)
    }

    if (attempt < retries) {
      await new Promise(r => setTimeout(r, 400 * 2 ** attempt))
    }
  }

  return { data: null, error: lastErr }
}
