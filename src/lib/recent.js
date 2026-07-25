const KEY = 'greenroom_recent_artists'
const MAX = 8

/** Artists this person actually looked at, newest first. */
export function getRecent() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(raw) ? raw.slice(0, MAX) : []
  } catch {
    return []
  }
}

export function pushRecent(artist) {
  if (!artist?.id) return
  try {
    const entry = { id: artist.id, name: artist.name, symbol: artist.symbol }
    const next = [entry, ...getRecent().filter(a => a.id !== artist.id)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* private mode / quota — recents are a convenience, never a requirement */
  }
}
