import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, fmt } from '../lib/supabase'
import { SkeletonRows, ErrorState } from '../components/States'

export default function Trader() {
  const { username } = useParams()
  const [data, setData] = useState(undefined)
  const [err, setErr] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    supabase.rpc('get_public_portfolio', { p_username: username })
      .then(({ data, error }) => {
        // Distinguish a real failure from a genuinely private/missing portfolio.
        if (error) { setErr(error.message || 'Request failed.'); return }
        setErr(null); setData(data)
      })
  }, [username, reloadKey])

  if (err) return (
    <ErrorState message="Couldn't load that trader." onRetry={() => { setErr(null); setReloadKey(k => k + 1) }}>
      {err}
    </ErrorState>
  )
  if (data === undefined) return <SkeletonRows rows={4} />
  if (data === null) return (
    <p className="text-fog">
      This portfolio is private or doesn't exist.{' '}
      <Link to="/leaderboard" className="text-stage underline underline-offset-4">Back to the leaderboard.</Link>
    </p>
  )

  const invested = data.positions.reduce((s, p) => s + Number(p.value), 0)
  const total = Number(data.cash) + invested

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-extrabold">{data.username}</h1>
        {data.streak > 0 && <p className="num mt-1 text-xs text-fog">🔥 {data.streak} day streak</p>}
        <p className="num mt-3 font-display text-3xl font-extrabold">${fmt(total)}</p>
        <p className="text-xs text-fog">total portfolio value</p>
      </div>

      {data.positions.length === 0 ? (
        <p className="text-center text-sm text-fog">All cash right now. Watching from the sidelines.</p>
      ) : (
        <div className="divide-y divide-edge rounded-xl border border-edge bg-panel">
          {data.positions.map(p => (
            <Link key={p.artist_id} to={`/artist/${p.artist_id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-edge/40">
              <span className="text-sm font-medium">{p.name} <span className="num text-xs text-fog">${p.symbol}</span></span>
              <span className="text-right">
                <span className="num block text-sm">${fmt(p.value)}</span>
                <span className={`num block text-xs ${Number(p.pl) >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {Number(p.pl) >= 0 ? '+' : ''}${fmt(p.pl)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
