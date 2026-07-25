/**
 * Trader avatar with a deterministic monogram fallback.
 *
 * Only OAuth signups arrive with a picture, so a leaderboard that showed images for some
 * people and nothing for others would read as broken. Everyone gets a mark; the colour is
 * derived from the username so it is stable across sessions and devices.
 */
const TINTS = [
  'bg-stage/25 text-stage',
  'bg-gain/20 text-gain',
  'bg-loss/20 text-loss',
  'bg-[#F5C044]/20 text-[#F5C044]',
  'bg-[#5BA8C8]/20 text-[#5BA8C8]',
  'bg-[#C88A5B]/20 text-[#C88A5B]',
]

function tintFor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return TINTS[h % TINTS.length]
}

export default function Avatar({ username = '', url, size = 32, className = '' }) {
  const initials = username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??'
  const dim = { width: size, height: size }

  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        style={dim}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      style={{ ...dim, fontSize: Math.max(10, Math.round(size * 0.36)) }}
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-bold ${tintFor(username)} ${className}`}>
      {initials}
    </span>
  )
}
