import { useSyncExternalStore, useCallback } from 'react'
import { subscribe, getRack, setRack, toggleOwned, getDaw, setDaw } from './store'

/**
 * React binding for the localStorage preferences.
 *
 * useSyncExternalStore rather than useState + useEffect, because the rack is edited from
 * several places at once — the rack page, the plugin index, and the "I own this" control
 * on a chain stage — and every one of them has to re-render when any other changes it.
 *
 * getRack() parses JSON on every call and would return a fresh array each time, which
 * useSyncExternalStore treats as a change and loops on forever. The cache below hands back
 * the same reference until an actual write happens.
 */

let rackCache = null
let dawCache = null
subscribe(() => { rackCache = null; dawCache = null })

function rackSnapshot() {
  if (rackCache === null) rackCache = getRack()
  return rackCache
}

function dawSnapshot() {
  if (dawCache === null) dawCache = getDaw()
  return dawCache
}

// The server snapshot never changes, so it can be a module-level constant.
const EMPTY = []

export function useRack() {
  const rack = useSyncExternalStore(subscribe, rackSnapshot, () => EMPTY)
  const toggle = useCallback(id => toggleOwned(id), [])
  const replace = useCallback(ids => setRack(ids), [])
  return { rack, toggle, setRack: replace }
}

export function useDaw() {
  const daw = useSyncExternalStore(subscribe, dawSnapshot, () => '')
  return { daw, setDaw }
}
