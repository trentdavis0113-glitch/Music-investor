import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LineChart, Line, YAxis, XAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { supabase, fmt, dayChange } from '../lib/supabase'
import { useSession } from '../App'

const RANGES = { '1D': 1, '1W': 7, 'ALL': 9999 }

export default function Artist() {
  const { id } = useParams()
  const session = useSession()
  const [artist, setArtist] = useState(null)
  const [ticks, setTicks] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [holding, setHolding] = useState(null)
  const [cash, setCash] = useState(null)
  const [myTrades, setMyTrades] = useState([])
  const [watched, setWatched] = useState(false)
  const [updates, setUpdates] = useState([])
  const [backers, setBackers] = useState([])
  const [pressure, setPressure] = useState(null)
  const [shares, setShares] = useState('10')
  const [range, setRange] = useState('1W')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function loadAll() {
    const [{ data: a }, { data: t }, { data: m }] = await Promise.all([
      supabase.from('artists').select('*').eq('id', id).single(),
      supabase.from('price_ticks').select('price,ts').eq('artist_id', id)
        .order('ts', { ascending: false }).limit(800),
      supabase.from('metric_snapshots').select('popularity,followers')
        .eq('artist_id', id).order('captured_at', { ascending: false }).limit(1)
    ])
    setArtist(a)
    setTicks((t || []).reverse())
    setMetrics(m?.[0] || null)
    const { data: ups } = await supabase.from('artist_updates')
      .select('body,created_at').eq('artist_id', id)
      .order('created_at', { ascending: false }).limit(10)
    setUpdates(ups || [])
    supabase.rpc('top_holders', { p_artist_id: Number(id) }).then(({ data }) => setBackers(data || []))
    supabase.rpc('artist_pressure', { p_artist_id: Number(id) }).then(({ data }) => setPressure(data))
    if (session) {
      const { data: acct } = await supabase.rpc('ensure_account')
      setCash(acct?.cash ?? null)
      const { data: h } = await supabase.from('holdings')
        .select('shares,avg_cost').eq('artist_id', id).maybeSingle()
      setHolding(h)
      const { data: w } = await supabase.from('watchlists')
        .select('artist_id').eq('artist_id', id).maybeSingle()
      setWatched(!!w)
      const { data: tx } = await supabase.from('transactions')
        .select('side,shares,price,total,ts').eq('artist_id', id)
        .order('ts', { ascending: false }).limit(5)
      setMyTrades(tx || [])
    }
  }

  useEffect(() => { loadAll() }, [id, session])

  const { pct, latest } = useMemo(() => dayChange(ticks), [ticks])

  const fairValue = useMemo(() => {
    if (!metrics) return null
    return 1 + (metrics.popularity / 100) * 49
      + Math.min(Math.sqrt(Math.max(metrics.followers, 0)) / 100, 25)
  }, [metrics])

  const chartData = useMemo(() => {
    const cutoff = Date.now() - RANGES[range] * 86400_000
    return ticks
      .filter(t => new Date(t.ts).getTime() >= cutoff)
      .map(t => ({
        ts: new Date(t.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric' }),
        price: Number(t.price)
      }))
  }, [ticks, range])

  const heldShares = holding ? Number(holding.shares) : 0
  const positionPl = holding && latest ? (latest - Number(holding.avg_cost)) * heldShares : 0
  const maxBuy = cash && latest ? Math.floor((cash / latest) * 2) / 2 : 0

  async function toggleWatch() {
    if (!session) return
    if (watched) {
      await supabase.from('watchlists').delete().eq('artist_id', id).eq('user_id', session.user.id)
      setWatched(false)
    } else {
      await supabase.from('watchlists').insert({ artist_id: Number(id), user_id: session.user.id })
      setWatched(true)
    }
  }

  async function share() {
    const url = window.location.href
    const text = `${artist.name} is trading at $${fmt(latest)} on Greenroom Exchange`
    if (navigator.share) { try { await navigator.share({ title: artist.name, text, url }) } catch {} }
    else { await navigator.clipboard.writeText(url); setMsg({ ok: true, text: 'Link copied.' }) }
  }

  async function trade(side) {
    setBusy(true); setMsg(null)
    const { data, error } = await supabase.rpc('execute_trade', {
      p_artist_id: Number(id), p_side: side, p_shares: Number(shares)
    })
    setBusy(false)
    if (error) { setMsg({ ok: false, text: error.message }); return }
    setMsg({ ok: true, text: `${side === 'buy' ? 'Bought' : 'Sold'} ${data.shares} shares at $${fmt(data.price)}` })
    loadAll()
  }

  if (!artist) return <p className="text-fog">Loading…</p>
  const cost = latest ? Number(shares || 0) * latest : 0
  const gapPct = fairValue && latest ? ((fairValue - latest) / latest) * 100 : null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {artist.image_url
            ? <img src={artist.image_url} alt="" className="h-14 w-14 rounded-full object-cover" />
            : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-edge font-display text-lg font-bold">
                {artist.name.slice(0, 2).toUpperCase()}
              </div>}
          <div>
            <h1 className="font-display text-2xl font-extrabold">{artist.name} <span className="num text-base font-normal text-fog">${artist.symbol}</span></h1>
            <p className="text-sm text-fog">
              {artist.genre || 'Independent'}
              {artist.claimed_by && <span className="ml-2 text-stage">✓ Verified artist</span>}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="mb-1 flex justify-end gap-2">
            {session && (
              <button onClick={toggleWatch} title="Watchlist"
                className={`rounded-lg border border-edge px-2 py-1 text-sm ${watched ? 'text-stage' : 'text-fog hover:text-paper'}`}>
                {watched ? '★' : '☆'}
              </button>
            )}
            <button onClick={share} title="Share"
              className="rounded-lg border border-edge px-2 py-1 text-sm text-fog hover:text-paper">↗</button>
          </div>
          <p className="num text-2xl">${latest ? fmt(latest) : '—'}</p>
          <p className={`num text-sm ${pct >= 0 ? 'text-gain' : 'text-loss'}`}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(2)}% today
          </p>
        </div>
      </div>

      {artist.bio && <p className="text-sm text-fog">{artist.bio}</p>}
      {!artist.claimed_by && (
        <p className="text-xs text-fog">
          Are you {artist.name}?{' '}
          <Link to={`/for-artists?claim=${artist.id}`} className="text-stage underline underline-offset-4">
            Claim this profile
          </Link>
        </p>
      )}

      <div>
        <div className="mb-2 flex gap-2">
          {Object.keys(RANGES).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${range === r ? 'bg-stage text-ink' : 'bg-panel text-fog hover:text-paper'}`}>
              {r}
            </button>
          ))}
        </div>
        <div className="h-64 rounded-xl border border-edge bg-panel p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="ts" hide />
              <YAxis domain={['auto', 'auto']} width={52}
                tick={{ fill: '#9A9DB3', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickFormatter={v => `$${v.toFixed(2)}`} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1B1D29', border: '1px solid #2A2D3E', borderRadius: 8 }}
                labelStyle={{ color: '#9A9DB3', fontSize: 12 }}
                formatter={v => [`$${fmt(v)}`, 'Price']} />
              {fairValue && (
                <ReferenceLine y={fairValue} stroke="#8B7CF6" strokeDasharray="4 4"
                  label={{ value: 'fair value', fill: '#8B7CF6', fontSize: 10, position: 'insideTopRight' }} />
              )}
              <Line type="monotone" dataKey="price" dot={false} strokeWidth={2}
                stroke={pct >= 0 ? '#3DDC97' : '#FF6B6B'} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        <Stat label="Momentum" value={metrics ? metrics.popularity : '—'} />
        <Stat label="Monthly listeners" value={metrics ? Number(metrics.followers).toLocaleString() : '—'} />
        <Stat label="Fair value" value={fairValue ? `$${fmt(fairValue)}` : '—'} />
        <Stat label="Vs. price"
          value={gapPct != null ? `${gapPct >= 0 ? '+' : ''}${gapPct.toFixed(1)}%` : '—'}
          tone={gapPct == null ? '' : gapPct >= 0 ? 'text-gain' : 'text-loss'} />
      </div>

      {pressure && gapPct != null && (
        <div className="rounded-xl border border-edge bg-panel px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-fog">Why it's moving</p>
          <p className="mt-1 text-sm text-fog">
            {Number(pressure.net_shares) > 0
              ? `Buyers are in control: ${Number(pressure.traders)} trader${Number(pressure.traders) === 1 ? '' : 's'} net-bought ${Number(pressure.net_shares).toLocaleString()} shares in 24h. `
              : Number(pressure.net_shares) < 0
                ? `Sellers are in control: net ${Math.abs(Number(pressure.net_shares)).toLocaleString()} shares sold in 24h. `
                : 'No net trading pressure in the last 24h, so the engine is doing the work. '}
            {gapPct >= 3
              ? `Price sits ${gapPct.toFixed(0)}% under fair value, so gravity is pulling it up.`
              : gapPct <= -3
                ? `Price sits ${Math.abs(gapPct).toFixed(0)}% above fair value, so gravity is pulling it down.`
                : 'Price is trading near fair value.'}
          </p>
        </div>
      )}

      <p className="text-xs leading-relaxed text-fog">
        Fair value is what this artist's real monthly listener count justifies. The price constantly drifts
        toward it: a positive "Vs. price" means they may be undervalued, negative means you're
        paying for hype. Prices update every 15 minutes and reprice on real data every Monday.
      </p>

      {artist.spotify_url && (
        <a href={artist.spotify_url} target="_blank" rel="noreferrer"
          className="inline-block text-sm text-stage underline underline-offset-4">
          Listen on Spotify
        </a>
      )}

      {session && heldShares > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-edge bg-panel px-4 py-3">
          <div>
            <p className="text-sm font-medium">Your position</p>
            <p className="num text-xs text-fog">{heldShares.toLocaleString()} sh @ ${fmt(holding.avg_cost)}</p>
          </div>
          <div className="text-right">
            <p className="num text-sm">${fmt(heldShares * latest)}</p>
            <p className={`num text-xs ${positionPl >= 0 ? 'text-gain' : 'text-loss'}`}>
              {positionPl >= 0 ? '+' : ''}${fmt(positionPl)}
            </p>
          </div>
        </div>
      )}

      <div id="trade-panel" className="rounded-xl border border-edge bg-panel p-4">
        <h2 className="font-display font-bold">Trade</h2>
        {!session ? (
          <p className="mt-2 text-sm text-fog">
            <Link to="/auth" className="text-stage underline underline-offset-4">Sign in</Link> to trade. New accounts start with $10,000.
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input type="number" min="0.5" step="0.5" value={shares}
                onChange={e => setShares(e.target.value)}
                className="num w-24 rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-stage" />
              {[10, 25, 50].map(n => (
                <button key={n} onClick={() => setShares(String(n))}
                  className="rounded-lg bg-ink px-2.5 py-1.5 text-xs text-fog hover:text-paper">{n}</button>
              ))}
              <button onClick={() => setShares(String(maxBuy))}
                className="rounded-lg bg-ink px-2.5 py-1.5 text-xs text-fog hover:text-paper">Max</button>
              {heldShares > 0 && (
                <button onClick={() => setShares(String(heldShares))}
                  className="rounded-lg bg-ink px-2.5 py-1.5 text-xs text-fog hover:text-paper">All held</button>
              )}
              <span className="num ml-auto text-xs text-fog">≈ ${fmt(cost)}</span>
            </div>
            <p className="num mt-2 text-xs text-fog">Cash available: ${cash != null ? fmt(cash) : '—'}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button disabled={busy} onClick={() => trade('buy')}
                className="rounded-lg bg-gain py-2.5 font-semibold text-ink disabled:opacity-50">Buy</button>
              <button disabled={busy || heldShares <= 0} onClick={() => trade('sell')}
                className="rounded-lg bg-loss py-2.5 font-semibold text-ink disabled:opacity-40">Sell</button>
            </div>
            {msg && (
              <div className={`toast fixed inset-x-4 bottom-32 z-30 mx-auto max-w-sm rounded-xl border px-4 py-3 text-center text-sm font-medium backdrop-blur sm:bottom-8
                ${msg.ok ? 'border-gain/40 bg-gain/15 text-gain' : 'border-loss/40 bg-loss/15 text-loss'}`}>
                {msg.text}
              </div>
            )}
            {myTrades.length > 0 && (
              <div className="mt-4 border-t border-edge pt-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-fog">Your recent trades</p>
                {myTrades.map((t, i) => (
                  <p key={i} className="num mt-1.5 flex justify-between text-xs text-fog">
                    <span className={t.side === 'buy' ? 'text-gain' : 'text-loss'}>
                      {t.side.toUpperCase()} {Number(t.shares).toLocaleString()}
                    </span>
                    <span>@ ${fmt(t.price)}</span>
                    <span>{new Date(t.ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {backers.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-fog">Top backers</h2>
          <div className="mt-2 divide-y divide-edge rounded-xl border border-edge bg-panel">
            {backers.map((b, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span><span className="num mr-2 text-fog">#{i + 1}</span>{b.username}</span>
                <span className="num text-xs text-fog">{Number(b.shares).toLocaleString()} sh</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {updates.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-fog">From the artist</h2>
          <div className="mt-2 space-y-2">
            {updates.map((u, i) => (
              <div key={i} className="rounded-xl border border-edge bg-panel px-4 py-3">
                <p className="text-sm whitespace-pre-wrap">{u.body}</p>
                <p className="mt-1 text-xs text-fog">
                  {new Date(u.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
      {session && latest && (
        <div className="fixed inset-x-0 bottom-14 z-10 flex items-center justify-between border-t border-edge bg-ink/95 px-4 py-2.5 backdrop-blur sm:hidden"
          style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom) * 0.3)' }}>
          <div>
            <p className="num text-sm">${fmt(latest)}</p>
            <p className={`num text-xs ${pct >= 0 ? 'text-gain' : 'text-loss'}`}>
              {pct >= 0 ? '+' : ''}{pct.toFixed(2)}% today
            </p>
          </div>
          <button onClick={() => document.getElementById('trade-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="rounded-lg bg-stage px-5 py-2 text-sm font-semibold text-ink">
            Trade ${artist.symbol}
          </button>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, tone = '' }) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-3">
      <p className={`num text-lg ${tone}`}>{value}</p>
      <p className="text-xs text-fog">{label}</p>
    </div>
  )
}
