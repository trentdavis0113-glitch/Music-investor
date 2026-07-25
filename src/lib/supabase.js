import { createClient } from '@supabase/supabase-js'

// Single source of truth for project credentials. Previously Auth.jsx carried its own
// hardcoded legacy JWT while this file used the newer publishable key, so rotating one
// silently broke signup while the rest of the app kept working.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://uajheoltstvftdmnigaw.supabase.co'
export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_tW2mUsRFGSogR6LshkLzNw_TIy292yE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/**
 * Format a number to two decimal places.
 *
 * Returns an em dash rather than a figure when the value is absent. It used to run
 * `Number(n)`, which turns null and undefined into 0 — so an artist with no recorded
 * price rendered as a confident "$0.00" everywhere it appeared, including the ticker.
 * Missing data now looks missing.
 */
export function fmt(n) {
  const v = Number(n)
  if (n == null || n === '' || !Number.isFinite(v)) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** `fmt` with the currency symbol attached, so an unknown amount reads "—" and not "$—". */
export function money(n) {
  const s = fmt(n)
  return s === '—' ? s : `$${s}`
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
 * "Working…" forever. Retries cover transient 5xx/429/connection blips only — 4xx
 * responses are terminal and return immediately.
 *
 * retryOnTimeout defaults to false because these calls are not idempotent: a request
 * that timed out may already have been processed server-side, and retrying it would
 * submit twice. A connection that never opened is safe to retry; a silent timeout is not.
 *
 * The key goes on `apikey`, never `Authorization: Bearer`. Publishable (sb_publishable_*)
 * keys are not JWTs, and Supabase's gateway rejects them as "Invalid JWT" if bearer-sent.
 */
export async function callFunction(
  name,
  body,
  { timeoutMs = 15000, retries = 2, retryOnTimeout = false } = {},
) {
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
      const timedOut = e?.name === 'AbortError'
      lastErr = timedOut
        ? { message: 'That took too long. Check your connection and try again.', code: 'timeout' }
        : { message: 'Network error. Check your connection and try again.', code: 'network' }
      // The server may already have processed a timed-out request — don't send it twice.
      if (timedOut && !retryOnTimeout) return { data: null, error: lastErr }
    } finally {
      clearTimeout(timer)
    }

    if (attempt < retries) {
      await new Promise(r => setTimeout(r, 400 * 2 ** attempt))
    }
  }

  return { data: null, error: lastErr }
}
