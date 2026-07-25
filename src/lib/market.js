import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'

/**
 * Shared market data store.
 *
 * Market.jsx and Ticker.jsx previously ran independent 60s polls, each pulling raw
 * price_ticks (516 kB and 258 kB respectively) and aggregating in JavaScript — ~774 kB
 * per minute per user, for overlapping data. Both now read this single store, which
 * calls the server-aggregated market_overview() RPC once and shares the result.
 *
 * Three further wins on top of the smaller payload:
 *  - one request per interval instead of two
 *  - polling stops entirely while the tab is hidden, so a backgrounded phone burns
 *    neither battery nor mobile data
 *  - stale-while-revalidate: a refresh never blanks the UI, it swaps in place
 */

const POLL_MS = 60_000
const STALE_MS = 30_000

let snapshot = { rows: null, error: null, loadedAt: 0, loading: false }
const listeners = new Set()
let timer = null
let inflight = null

function set(patch) {
  snapshot = { ...snapshot, ...patch }
  listeners.forEach(l => l())
}

export function refreshMarket() {
  if (inflight) return inflight
  set({ loading: true })
  inflight = supabase
    .rpc('market_overview')
    .then(({ data, error }) => {
      if (error) set({ error: error.message || 'Request failed.', loading: false })
      // Keep the previous rows visible on failure rather than tearing the page down.
      else set({ rows: data || [], error: null, loadedAt: Date.now(), loading: false })
    })
    .catch(e => set({ error: String(e?.message || e), loading: false }))
    .finally(() => { inflight = null })
  return inflight
}

function onVisibility() {
  // Coming back to a tab that has been away a while should feel instant, not stale.
  if (document.visibilityState === 'visible' && Date.now() - snapshot.loadedAt > STALE_MS) {
    refreshMarket()
  }
}

function start() {
  refreshMarket()
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') refreshMarket()
  }, POLL_MS)
  document.addEventListener('visibilitychange', onVisibility)
}

function stop() {
  clearInterval(timer)
  timer = null
  document.removeEventListener('visibilitychange', onVisibility)
}

function subscribe(cb) {
  listeners.add(cb)
  if (listeners.size === 1) start()
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0) stop()
  }
}

const getSnapshot = () => snapshot

export function useMarket() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
