import { Link } from 'react-router-dom'

/** Row-shaped placeholder that matches the real list, so layout doesn't jump on load. */
export function SkeletonRows({ rows = 6 }) {
  return (
    <div className="divide-y divide-edge rounded-xl border border-edge bg-panel" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="shimmer h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="shimmer h-3 w-1/3 rounded" />
            <div className="shimmer h-2.5 w-1/5 rounded" />
          </div>
          <div className="w-24 space-y-1.5">
            <div className="shimmer ml-auto h-3 w-16 rounded" />
            <div className="shimmer ml-auto h-2.5 w-10 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonBlock({ className = 'h-40' }) {
  return <div className={`shimmer rounded-xl ${className}`} aria-hidden="true" />
}

/** Turns transport-level noise into something a trader can act on. */
export function humanize(msg) {
  if (typeof msg !== 'string') return msg
  if (/failed to fetch|networkerror|load failed|err_(internet|tunnel|connection)/i.test(msg))
    return "You appear to be offline. Check your connection."
  if (/timeout|aborted/i.test(msg)) return 'The request timed out.'
  if (/jwt|token is expired|invalid claim/i.test(msg)) return 'Your session expired — sign in again.'
  if (/no active season/i.test(msg)) return 'The season is being set up. Check back shortly.'
  return msg
}

/**
 * Replaces the old pattern of leaving a page on "Loading…" forever when a fetch failed.
 * Always gives the user a way to act.
 */
export function ErrorState({ message = "That didn't load.", onRetry, children }) {
  const detail = humanize(children)
  return (
    <div className="rounded-xl border border-loss/40 bg-loss/10 px-4 py-6 text-center" role="alert">
      <p className="text-sm font-medium text-loss">{message}</p>
      {detail && <p className="mt-1 text-xs text-fog">{detail}</p>}
      {onRetry && (
        <button onClick={onRetry}
          className="mt-3 rounded-lg border border-loss/40 px-4 py-2 text-sm font-semibold text-loss hover:bg-loss/10">
          Try again
        </button>
      )}
    </div>
  )
}

export function SignedOut({ what = 'this page' }) {
  return (
    <p className="text-fog">
      <Link to="/auth" className="text-stage underline underline-offset-4">Sign in</Link>{' '}
      to see {what}. New accounts start with $10,000 simulated cash.
    </p>
  )
}
