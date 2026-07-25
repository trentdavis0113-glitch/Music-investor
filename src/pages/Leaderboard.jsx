import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, fmt } from '../lib/supabase'
import { SkeletonRows, ErrorState } from '../components/States'
import { useSession } from '../App'

export default function Leaderboard() {
  const session = useSession()
  const [rows, setRows] = useState(null)
  const [me, setMe] = useState(null)
  const [endsAt, setEndsAt] = useState(null)
  const [err, setErr] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    supabase.rpc('get_leaderboard').then(({ data, error }) => {
      // Without this, a failed RPC rendered "No traders on the board yet."
      if (error) { setErr(error.message || 'Request failed.'); return }
      setErr(null); setRows(data || [])
    })
    supabase.from('seasons').select('ends_at')
      .lte('starts_at', new Date().toISOString()).gte('ends_at', new Date().toISOString())
      .limit(1).then(({ data }) => setEndsAt(data?.[0]?.ends_at || null))
    if (session) {
      supabase.from('profiles').select('username').eq('id', session.user.id)
        .maybeSingle().then(({ data }) => setMe(data?.username || null))
    }
  }, [session, reloadKey])

  if (err && rows === null) return (
    <ErrorState message="Couldn't load the leaderboard." onRetry={() => { setErr(null); setReloadKey(k => k + 1) }}>
      {err}
    </ErrorState>
  )
  if (rows === null) return <SkeletonRows rows={6} />
  if (!rows.length) return <p className="text-fog">No traders on the board yet. Make a trade and claim #1.</p>

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-xl font-extrabold">Season leaderboard</h1>
        {endsAt && (
          <span className="num text-xs text-fog">
            resets in {Math.max(0, Math.ceil((new Date(endsAt) - Date.now()) / 86400000))}d
          </span>
        )}
      </div>
      <div className="divide-y divide-edge rounded-xl border border-edge bg-panel">
        {rows.map(r => {
          const mine = me && r.username === me
          return (
            <Link key={r.rank + r.username} to={`/trader/${encodeURIComponent(r.username)}`}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-edge/40 ${mine ? 'bg-stage/10' : ''}`}>
              <span className={`num w-8 font-semibold ${
                r.rank === 1 ? 'text-[#F5C044]' :
                r.rank === 2 ? 'text-[#C7CBD9]' :
                r.rank === 3 ? 'text-[#C88A5B]' : 'text-fog'}`}>
                {r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank - 1] : `#${r.rank}`}
              </span>
              <span className="flex-1 text-sm font-medium">
                {r.username}{mine && <span className="ml-2 text-xs text-stage">you</span>}
              </span>
              <span className="num text-sm">${fmt(r.portfolio_value)}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
