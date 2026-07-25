import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, fmt } from '../lib/supabase'
import { useMarket, refreshMarket } from '../lib/market'
import Sparkline from '../components/Sparkline'
import Avatar from '../components/Avatar'
import HowStrip from '../components/HowStrip'
import PulseBar from '../components/PulseBar'
import { SkeletonRows, ErrorState } from '../components/States'
import { useSession } from '../App'

function RequestArtist({ session }) {
  const [name, setName] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState(null)

  async function send() {
    setErr(null)
    if (!session) { setErr('Sign in to request an artist.'); return }
    if (name.trim().length < 2) return
    const { error } = await supabase.from('artist_requests')
      .insert({ user_id: session.user.id, artist_name: name.trim() })
    if (error) { setErr(error.message); return }
    setName(''); setSent(true)
  }

  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <p className="text-sm font-medium">Want an artist listed?</p>
      {sent ? (
        <p className="mt-1 text-sm text-gain">Got it. Requested artists get priority on the next listing round.</p>
      ) : (
        <div className="mt-2 flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Artist name"
            className="min-w-0 flex-1 rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-stage" />
          <button onClick={send} className="rounded-lg bg-stage px-4 py-2 text-sm font-semibold text-ink">Request</button>
        </div>
      )}
      {err && <p className="mt-1 text-xs text-loss">{err}</p>}
    </div>
  )
}

export default function Market() {
  const session = useSession()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('movers')
  const [watchIds, setWatchIds] = useState([])
  const [activity, setActivity] = useState([])
  const [recap, setRecap] = useState(null)
  const [predEnabled, setPredEnabled] = useState(false)
  const [pred, setPred] = useState(null)
  const [pickId, setPickId] = useState('')
  const [predMsg, setPredMsg] = useState(null)

  // Prices, day change, fair-value gap and sparklines all arrive pre-aggregated from
  // market_overview(), shared with the Ticker so the page makes one request, not two.
  const { rows, error: err, loading } = useMarket()

  useEffect(() => {
    // Slow-moving page furniture: fetched once, not on every price tick.
    supabase.rpc('recent_activity').then(({ data }) => setActivity(data || []))
    supabase.from('market_posts').select('title,body').order('id', { ascending: false })
      .limit(1).maybeSingle().then(({ data }) => setRecap(data))
    supabase.from('feature_flags').select('enabled').eq('key', 'predictions')
      .maybeSingle().then(({ data }) => setPredEnabled(!!data?.enabled))
  }, [])

  useEffect(() => {
    if (!session) { setWatchIds([]); setPred(null); return }
    supabase.from('watchlists').select('artist_id')
      .then(({ data }) => setWatchIds((data || []).map(w => w.artist_id)))
    supabase.rpc('prediction_status').then(({ data }) => setPred(data))
  }, [session])

  async function lockPick() {
    if (!pickId) return
    setPredMsg(null)
    const { error } = await supabase.rpc('submit_prediction', { p_artist_id: Number(pickId) })
    if (error) { setPredMsg(error.message); return }
    const { data } = await supabase.rpc('prediction_status')
    setPred(data)
  }

  const view = useMemo(() => {
    if (!rows) return null
    let out = rows.filter(r =>
      !q || r.name.toLowerCase().includes(q.toLowerCase()) ||
      (r.symbol || '').toLowerCase().includes(q.replace('$', '').toLowerCase()) ||
      (r.genre || '').toLowerCase().includes(q.toLowerCase()))
    if (sort === 'movers') out = [...out].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    if (sort === 'gainers') out = [...out].sort((a, b) => b.pct - a.pct)
    if (sort === 'price') out = [...out].sort((a, b) => b.latest - a.latest)
    if (sort === 'name') out = [...out].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'value') out = [...out].sort((a, b) => (b.gap ?? -999) - (a.gap ?? -999))
    return out
  }, [rows, q, sort])

  if (err && rows === null) return (
    <ErrorState message="Couldn't load the market." onRetry={refreshMarket}>
      {err}
    </ErrorState>
  )
  if (rows === null) return (
    <div className="space-y-3">
      <p className="sr-only">Loading market</p>
      <SkeletonRows rows={8} />
    </div>
  )
  if (!rows.length) return <p className="text-fog">No artists listed yet.</p>

  const gainers = [...rows].sort((a, b) => b.pct - a.pct)
  const top = gainers[0], bottom = gainers[gainers.length - 1]

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tightened: this was ~350px on a phone, pushing the market itself off screen.
          One line of pitch, one line of terms, one action. */}
      {!session && (
        <div className="rounded-card border border-stage/40 bg-stage/10 p-4 shadow-e1">
          <p className="font-display text-lg font-extrabold leading-tight sm:text-2xl">
            Trade shares of rising artists.
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-fog">
            Real listener momentum sets the price. Start with{' '}
            <span className="text-paper">$10,000 simulated</span>.
          </p>
          <div className="mt-3 flex items-center gap-4">
            <Link to="/auth"
              className="pressable rounded-lg bg-stage px-4 py-2.5 text-sm font-semibold text-ink shadow-e1 hover:brightness-110">
              Start trading free
            </Link>
            <Link to="/how-it-works" className="text-sm text-stage underline underline-offset-4">
              How it works
            </Link>
          </div>
        </div>
      )}

      <PulseBar />

      {!session && <HowStrip />}

      {predEnabled && session && pred && (
        <section className="rounded-xl border border-stage/40 bg-stage/10 p-4">
          <p className="font-display text-sm font-bold uppercase tracking-widest text-stage">Monday gap-up challenge</p>
          {pred.last && (
            <p className="mt-1 text-xs text-fog">
              Last week you called ${pred.last.symbol}: {pred.last.won ? 'nailed it 🏆' : 'missed.'}
            </p>
          )}
          {pred.pick ? (
            <p className="mt-1.5 text-sm text-fog">
              Your call: <span className="text-paper">{pred.pick.name} (${pred.pick.symbol})</span> jumps most at Monday's refresh. Change it below any time before Monday.
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-fog">
              Pick the artist whose monthly listeners jump most at Monday's refresh. Winners earn The Oracle badge.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <select value={pickId} onChange={e => setPickId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-stage">
              <option value="">Pick an artist…</option>
              {rows.map(a => <option key={a.id} value={a.id}>{a.name} (${a.symbol})</option>)}
            </select>
            <button onClick={lockPick}
              className="shrink-0 rounded-lg bg-stage px-4 py-2 text-sm font-semibold text-ink">
              {pred.pick ? 'Change' : 'Lock it'}
            </button>
          </div>
          {predMsg && <p className="mt-1.5 text-xs text-loss">{predMsg}</p>}
        </section>
      )}

      {recap && (
        <section className="rounded-xl border border-edge bg-panel p-4">
          <p className="font-display text-sm font-bold uppercase tracking-widest text-stage">{recap.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-fog">{recap.body}</p>
        </section>
      )}

      <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
        <Chip label="Listed" value={rows.length} sub="artists trading" />
        <Chip label="Top gainer" tone="text-gain" sub={top?.name} to={top && `/artist/${top.id}`}
          value={top ? `${top.pct >= 0 ? '+' : ''}${top.pct.toFixed(1)}%` : '—'} />
        <Chip label="Biggest drop" tone="text-loss" sub={bottom?.name} to={bottom && `/artist/${bottom.id}`}
          value={bottom ? `${bottom.pct.toFixed(1)}%` : '—'} />
      </div>

      {watchIds.length > 0 && (
        <section>
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">★ Watchlist</h2>
          <div className="mt-2 divide-y divide-edge rounded-xl border border-stage/40 bg-panel">
            {rows.filter(r => watchIds.includes(r.id)).map(a => (
              <Link key={a.id} to={`/artist/${a.id}`}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-edge/40">
                <span className="text-sm font-medium">{a.name}</span>
                <span className="num text-sm">
                  ${fmt(a.latest)}{' '}
                  <span className={a.pct >= 0 ? 'text-gain' : 'text-loss'}>
                    {a.pct >= 0 ? '+' : ''}{a.pct.toFixed(2)}%
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input value={q} onChange={e => setQ(e.target.value)} type="search"
              aria-label="Search artists or genres" placeholder="Search artists or genres"
              className="w-full rounded-lg border border-edge bg-panel px-3 py-2.5 pr-9 text-sm outline-none focus:border-stage" />
            {q && (
              <button onClick={() => setQ('')} aria-label="Clear search"
                className="absolute inset-y-0 right-0 px-3 text-fog hover:text-paper">×</button>
            )}
          </div>
          <button onClick={refreshMarket} disabled={loading}
            title="Refresh prices" aria-label="Refresh prices"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-edge bg-panel text-fog hover:border-stage hover:text-paper disabled:opacity-50">
            <span aria-hidden="true" className={loading ? 'inline-block animate-spin' : ''}>⟳</span>
          </button>
        </div>
        {/* Scrolls rather than wrapping, so the row keeps one predictable height on narrow
            phones. Tap targets raised from 26px to 38px. */}
        <div role="group" aria-label="Sort artists"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {[['movers', 'Movers'], ['gainers', 'Gainers'], ['value', 'Value'], ['price', 'Price'], ['name', 'A-Z']].map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} aria-pressed={sort === k}
              className={`min-h-[38px] shrink-0 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                sort === k ? 'bg-stage text-ink' : 'bg-panel text-fog hover:text-paper'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Named landmark: gives screen-reader users a way to jump straight to the market
          instead of tabbing through the hero and controls every time. */}
      <section aria-label="Artists" className="card divide-y divide-edge overflow-hidden">
        {view.map(a => <ArtistRow key={a.id} a={a} />)}
        {view.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-paper">No artists match “{q}”.</p>
            <button onClick={() => setQ('')} className="mt-2 text-sm text-stage underline underline-offset-4">
              Clear search
            </button>
          </div>
        )}
      </section>

      {activity.length > 0 && (
        <section>
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">Live activity</h2>
          <div className="mt-2 divide-y divide-edge rounded-xl border border-edge bg-panel">
            {activity.map((t, i) => (
              <Link key={i} to={`/artist/${t.artist_id}`}
                className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-edge/40">
                <span className="truncate">
                  <span className="text-paper">{t.username}</span>{' '}
                  <span className={t.side === 'buy' ? 'text-gain' : 'text-loss'}>
                    {t.side === 'buy' ? 'bought' : 'sold'}
                  </span>{' '}
                  <span className="num">{Number(t.shares).toLocaleString()}</span>{' '}
                  <span className="num text-fog">${t.symbol}</span>
                </span>
                <span className="num shrink-0 pl-3 text-fog">@ ${fmt(t.price)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {session && <HowStrip />}

      <RequestArtist session={session} />
    </div>
  )
}

/**
 * One artist, readable at a glance.
 *
 * The old row gave price, change and genre equal weight, so nothing told you where to
 * look. Hierarchy now runs: name → price → change → why it might matter. The signal chips
 * are the point — they surface the two things worth acting on (a big move, or a price
 * sitting well under fair value) without the user having to sort and compare.
 */
function ArtistRow({ a }) {
  const hot = Math.abs(a.pct) >= 5
  const value = a.gap != null && a.gap >= 5

  return (
    <Link to={`/artist/${a.id}`}
      className="group flex items-center gap-3 px-3 py-3 transition-colors duration-instant ease-out hover:bg-edge/40 sm:px-4">
      <Avatar username={a.name} url={a.image_url} size={40} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold leading-tight text-paper">
          <span className="truncate">{a.name}</span>
          {a.metrics_verified && (
            <span title="Listener data verified" aria-label="Listener data verified"
              className="shrink-0 text-[11px] text-stage">✓</span>
          )}
        </p>
        {/* On a phone the signal chip earns the space over the genre, which was truncating
            to "Hip-…". Genre returns from sm up, where there is room for both. */}
        <p className="mt-1 flex items-center gap-1.5 text-xs text-fog">
          <span className="num shrink-0 text-mute">${a.symbol}</span>
          <span aria-hidden="true" className={`text-mute ${value || hot ? 'hidden sm:inline' : ''}`}>·</span>
          <span className={`truncate ${value || hot ? 'hidden sm:inline' : ''}`}>
            {a.genre || 'Independent'}
          </span>
          {value && (
            <span className="chip shrink-0 bg-gain/15 text-gain">
              +{a.gap.toFixed(0)}% value
            </span>
          )}
          {hot && !value && (
            <span className="chip shrink-0 bg-stage/20 text-stage">Hot</span>
          )}
        </p>
      </div>

      <div className="hidden shrink-0 sm:block">
        <Sparkline points={a.spark} up={a.pct >= 0} />
      </div>

      <div className="w-[5.5rem] shrink-0 text-right">
        <p className="num text-[15px] font-semibold leading-tight text-paper">${fmt(a.latest)}</p>
        <p className={`num mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${
          a.pct >= 0 ? 'bg-gain/12 text-gain' : 'bg-loss/12 text-loss'}`}>
          {a.pct >= 0 ? '+' : ''}{a.pct.toFixed(2)}%
        </p>
      </div>
    </Link>
  )
}

/**
 * The old version rendered `sub || label`, so the two most interesting tiles showed an
 * artist name with no indication of whether it was the day's best or worst — the number
 * was there but the meaning wasn't. Label and subject are now both present, and the tile
 * links through to the artist it is describing.
 */
function Chip({ label, value, tone = '', sub, to }) {
  const body = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-mute">{label}</p>
      <p className={`num mt-1 text-lg font-semibold leading-none ${tone}`}>{value}</p>
      {sub && <p className="mt-1 truncate text-xs text-fog">{sub}</p>}
    </>
  )
  const cls = 'card px-2 py-2.5 text-center sm:py-3'
  return to
    ? <Link to={to} className={`${cls} pressable block hover:border-edge2`}>{body}</Link>
    : <div className={cls}>{body}</div>
}
