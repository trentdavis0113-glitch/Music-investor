/**
 * Local preferences: which plugins you own, and which DAW you use.
 *
 * There is no account and no server. Everything here is localStorage, which means it is
 * per-device and survives nothing but this browser — an acceptable trade for an app that
 * otherwise needs no backend at all.
 *
 * Reads are defensive because localStorage can throw (Safari private mode, disabled
 * storage) and can contain anything a previous version or a curious user put there.
 */

const RACK_KEY = 'sc.rack.v1'
const DAW_KEY = 'sc.daw.v1'

const listeners = new Set()

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable or full. The app keeps working with in-memory state for the
    // session; silently losing a preference beats a crash on a page the user asked for.
  }
  for (const fn of listeners) fn()
}

/** Subscribe to any preference change. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// ------------------------------------------------------------------ rack

/** The set of plugin ids the user has marked as owned. Always an array of strings. */
export function getRack() {
  const v = read(RACK_KEY, [])
  return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []
}

export function setRack(ids) {
  write(RACK_KEY, [...new Set(ids)])
}

export function toggleOwned(id) {
  const rack = getRack()
  setRack(rack.includes(id) ? rack.filter(x => x !== id) : [...rack, id])
}

export function ownsAll(ids) {
  const rack = new Set(getRack())
  return ids.every(id => rack.has(id))
}

// ------------------------------------------------------------------ daw

/** '' means "no DAW chosen", which the UI treats as "show me all of them". */
export function getDaw() {
  const v = read(DAW_KEY, '')
  return typeof v === 'string' ? v : ''
}

export function setDaw(daw) {
  write(DAW_KEY, daw)
}
