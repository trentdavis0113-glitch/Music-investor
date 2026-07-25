import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { LineChart, Line, YAxis, XAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { supabase, fmt, money } from '../lib/supabase'
import { useMarket, refreshMarket } from '../lib/market'
import {
  priceSignal, valueGapSentence, pressureSentence,
  participationSentence, exposureSentence, quote,
} from '../lib/artistIntel'
import { SkeletonBlock, ErrorState } from '../components/States'
import Avatar from '../components/Avatar'
import Delta from '../components/Delta'
import NotFound from './NotFound'
import { pushRecent } from '../lib/recent'
import { useSession, useMeta } from '../App'

// Ticks land every 15 minutes, so unlike the portfolio's daily snapshots an intraday
// range is genuinely supported here.
const RANGES = [
  { key: '1D', label: '1D' },
  { key: '1W', label: '1W' },
  { key: '1M', label: '1M' },
  { key: 'ALL', label: 'All' },
]

export default function Artist() {
  const { id } = useParams()
  const session = useSession()
  const { ownsArtist } = useMeta()
  const { rows: market } = useMarket()

  const [artist, setArtist] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [history, setHistory] = useState(null)
  const [range, setRange] = useState('1W')
  const [holding, setHolding] = useState(null)
  const [seasonId, setSeasonId] = useState(null)
  const [cash, setCash] = useState(null)
  const [myTrades, setMyTrades] = useState([])
  const [allHold, setAllHold] = useState(null)
  const [watched, setWatched] = useState(false)
  const [watchBusy, setWatchBusy] = useState(false)
  const [updates, setUpdates] = useState([])
  const [backers, setBackers] = useState(null)
  const [pressure, setPressure] = useState(null)
  const [side, setSide] = useState('buy')
  const [shares, setShares] = useState('10')
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [tradeErr, setTradeErr] = useState(null)
  const [unresolved, setUnresolved] = useState(false)
  const [loadErr, setLoadErr] = useState(null)
  const [notFound, setNotFound] = useState(false)

  const tokenRef = useRef(null)
  const receiptRef = useRef(null)
  // `busy` state cannot gate this: setBusy is asynchronous, so two clicks dispatched in
  // the same tick — an impatient double tap — both pass the check and fire the RPC. The
  // idempotency token means only one trade is ever charged, but a ref stops the second
  // request being made at all.
  const busyRef = useRef(false)

  /* --------------------------------------------------------------- loading */

  const loadUser = useCallback(async () => {
    if (!session) { setHolding(null); setCash(null); setMyTrades([]); setAllHold(null); return }
    const { data: acct } = await supabase.rpc('ensure_account')
    const sid = acct?.season_id ?? null
    setSeasonId(sid)
    setCash(Number(acct?.cash ?? 0))

    const [hold, tx, watch, everything] = await Promise.all([
      // Season-scoped, and no maybeSingle(): holdings is keyed (user, season, artist), so
      // once Season 2 opens a trader holding this artist in both seasons returns two rows
      // and maybeSingle() rejects outright — the panel would have errored, not just
      // double-counted.
      supabase.from('holdings').select('shares,avg_cost')
        .eq('season_id', sid).eq('artist_id', id).gt('shares', 0).limit(1),
      supabase.from('transactions').select('side,shares,price,total,ts')
        .eq('season_id', sid).eq('artist_id', id).order('ts', { ascending: false }).limit(5),
      supabase.from('watchlists').select('artist_id').eq('artist_id', id).limit(1),
      supabase.from('holdings').select('artist_id,shares').eq('season_id', sid).gt('shares', 0),
    ])
    setHolding(hold.data?.[0] ?? null)
    setMyTrades(tx.data || [])
    setWatched((watch.data || []).length > 0)
    // Kept raw. Valuing it here would bake in whatever the market store happened to hold
    // at fetch time — which on first load is nothing, so every unpriced position counted
    // as zero and the exposure percentage came out far too high.
    setAllHold(everything.data || [])
  }, [session, id])

  const loadArtist = useCallback(async () => {
    const [{ data: a, error: aErr }, { data: m }] = await Promise.all([
      supabase.from('artists').select('*').eq('id', id).maybeSingle(),
      supabase.from('metric_snapshots').select('popularity,followers,captured_at')
        .eq('artist_id', id).order('captured_at', { ascending: false }).limit(2),
    ])
    if (aErr) { setLoadErr(aErr.message || 'Request failed.'); return }
    if (!a) { setNotFound(true); return }
    setLoadErr(null); setNotFound(false)
    setArtist(a)
    pushRecent(a)
    setMetrics({ latest: m?.[0] || null, prev: m?.[1] || null })

    supabase.from('artist_updates').select('body,created_at').eq('artist_id', id)
      .order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setUpdates(data || []))
    supabase.rpc('top_holders', { p_artist_id: Number(id) }).then(({ data }) => setBackers(data || null))
    supabase.rpc('artist_pressure', { p_artist_id: Number(id) }).then(({ data }) => setPressure(data))
  }, [id])

  useEffect(() => { loadArtist() }, [loadArtist])
  useEffect(() => { loadUser() }, [session, id])   // market intentionally omitted: prices refresh on their own

  // Chart history is fetched per range from a server-side aggregate rather than as raw
  // ticks. The old path pulled a flat 800 most-recent ticks (~31 kB) which also meant
  // "All" only ever showed the ~8 days those ticks covered.
  useEffect(() => {
    let alive = true
    setHistory(null)
    supabase.rpc('artist_history', { p_artist_id: Number(id), p_range: range })
      .then(({ data }) => { if (alive) setHistory(data || null) })
    return () => { alive = false }
  }, [id, range])

  /* ------------------------------------------------------------ derivation */

  // Single source of truth for the live price: the same aggregate the market list and
  // ticker use, so the two can never disagree.
  //
  // There is deliberately no fallback to the last charted point. An artist whose ticks
  // have stopped would otherwise show a stale figure styled exactly like a live one, and
  // the trade form would quote against it — the chart still shows the last recorded price,
  // labelled as recorded, which is the honest place for it.
  const marketReady = market != null
  const live = useMemo(() => (market || []).find(a => a.id === Number(id)) || null, [market, id])
  const price = live?.latest != null ? Number(live.latest) : null
  const dayPct = price != null ? (live?.pct ?? null) : null
  const gap = price != null ? (live?.gap ?? null) : null

  // Unknown, not zero: one position we cannot value makes the whole total unknowable, so
  // exposure simply omits the "share of your portfolio" clause rather than overstating it.
  const portfolioTotal = useMemo(() => {
    if (!allHold || cash == null || !marketReady) return null
    const priceById = new Map(market.map(a => [a.id, a.latest]))
    let invested = 0
    for (const h of allHold) {
      const p = priceById.get(h.artist_id)
      if (p == null) return null
      invested += Number(p) * Number(h.shares)
    }
    return cash + invested
  }, [allHold, cash, market, marketReady])

  const heldShares = holding ? Number(holding.shares) : 0
  const avgCost = holding ? Number(holding.avg_cost) : null
  const positionValue = price != null && heldShares ? heldShares * price : null
  const positionPct = avgCost && price != null && heldShares
    ? ((price - avgCost) / avgCost) * 100 : null

  const q = useMemo(() => quote({
    side, shares, price, cash: cash ?? 0, held: heldShares,
  }), [side, shares, price, cash, heldShares])

  const points = useMemo(() => (history?.points || [])
    .map(p => ({ t: Number(p.t), p: Number(p.p) })), [history])

  const listenerChange = useMemo(() => {
    const a = metrics?.latest, b = metrics?.prev
    if (!a || !b || !b.followers) return null
    return ((a.followers - b.followers) / b.followers) * 100
  }, [metrics])

  /* ---------------------------------------------------------------- actions */

  async function toggleWatch() {
    if (!session || watchBusy) return
    setWatchBusy(true)
    const next = !watched
    setWatched(next)                                  // optimistic
    const { error } = next
      ? await supabase.from('watchlists').upsert(
          { artist_id: Number(id), user_id: session.user.id },
          { onConflict: 'user_id,artist_id', ignoreDuplicates: true })
      : await supabase.from('watchlists').delete()
          .eq('artist_id', id).eq('user_id', session.user.id)
    if (error) setWatched(!next)                      // rollback
    setWatchBusy(false)
  }

  async function submitTrade() {
    if (busyRef.current || !q.ok || !session) return
    busyRef.current = true
    setBusy(true); setTradeErr(null); setReceipt(null)

    // One token per intent. It is deliberately NOT regenerated on retry: replaying the
    // same token returns the original execution instead of trading twice, which is what
    // makes recovery from an ambiguous failure safe.
    if (!tokenRef.current) {
      tokenRef.current = (crypto?.randomUUID?.() ?? `t-${Date.now()}-${Math.random()}`)
    }

    const { data, error } = await supabase.rpc('execute_trade', {
      p_artist_id: Number(id), p_side: side,
      p_shares: Number(shares), p_token: tokenRef.current,
    })
    setBusy(false)
    busyRef.current = false

    if (error) {
      const network = /fetch|network|timeout|abort/i.test(error.message || '')
      if (network) {
        // The server may or may not have executed. Never invite a blind resubmit.
        setUnresolved(true)
        setTradeErr('We could not confirm whether that went through. Use “Check status” — it is safe and will not trade twice.')
      } else {
        setTradeErr(friendlyTrade(error.message))
        tokenRef.current = null                       // definitively rejected; a retry is a new intent
      }
      return
    }

    setUnresolved(false)
    tokenRef.current = null
    // Confirmation uses the values the backend actually executed at, never the pre-submit
    // estimate, which can differ if the price ticked between quote and execution.
    setReceipt({
      side: data.side, shares: Number(data.shares),
      price: Number(data.price), total: Number(data.total),
      replayed: !!data.replayed,
    })

    await Promise.all([loadUser(), refreshMarket()])  // portfolio + market reflect it without a refresh
    receiptRef.current?.focus()
  }

  async function checkStatus() {
    setTradeErr(null)
    await submitTrade()
  }

  async function share() {
    const url = window.location.href
    const text = `${artist.name} is trading at $${fmt(price)} on Greenroom Exchange`
    if (navigator.share) { try { await navigator.share({ title: artist.name, text, url }) } catch {} }
    else { try { await navigator.clipboard.writeText(url); setTradeErr(null) } catch {} }
  }

  /* ----------------------------------------------------------------- render */

  if (notFound) return <NotFound />
  if (loadErr && !artist) return (
    <ErrorState message="Couldn't load this artist." onRetry={loadArtist}>{loadErr}</ErrorState>
  )
  if (!artist) return (
    <div className="space-y-4">
      <p className="sr-only">Loading artist</p>
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-56" />
      <SkeletonBlock className="h-32" />
    </div>
  )

  const signal = priceSignal(dayPct)
  const isOwner = session && artist.claimed_by === session.user.id

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ---------------------------------------------------------- identity */}
      <section className="card-raised px-4 py-4 sm:px-5" aria-labelledby="artist-name">
        <div className="flex items-start gap-3 sm:gap-4">
          <Avatar username={artist.name} url={artist.image_url} size={56} />
          <div className="min-w-0 flex-1">
            <h1 id="artist-name" className="flex flex-wrap items-center gap-x-2 font-display text-xl font-extrabold leading-tight sm:text-2xl">
              <span className="min-w-0 break-words">{artist.name}</span>
              <span className="num text-sm font-normal text-mute">${artist.symbol}</span>
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-fog">
              <span>{artist.genre || 'Independent'}</span>
              {artist.claimed_by && (
                <span className="chip bg-stage/20 text-stage">✓ Verified artist</span>
              )}
              {!artist.is_active && (
                <span className="chip bg-loss/15 text-loss">Not trading</span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {session && (
              <button onClick={toggleWatch} disabled={watchBusy}
                aria-pressed={watched}
                aria-label={watched ? `Remove ${artist.name} from your watchlist` : `Add ${artist.name} to your watchlist`}
                className={`pressable grid h-10 w-10 place-items-center rounded-lg border border-edge text-base ${
                  watched ? 'bg-stage/15 text-stage' : 'text-fog hover:text-paper'}`}>
                <span aria-hidden="true">{watched ? '★' : '☆'}</span>
              </button>
            )}
            <button onClick={share} aria-label={`Share ${artist.name}`}
              className="pressable grid h-10 w-10 place-items-center rounded-lg border border-edge text-fog hover:text-paper">
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>

        {artist.bio && <p className="mt-3 text-sm leading-relaxed text-fog">{artist.bio}</p>}

        {/* ------------------------------------------------- market headline */}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-edge pt-4">
          {/* Named so the headline figure is reachable as a landmark, the same way the
              portfolio names its total. */}
          <section aria-label="Simulated price">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-mute">
              Simulated price
            </p>
            {price != null ? (
              <p className="num font-display text-3xl font-extrabold leading-none sm:text-4xl">
                ${fmt(price)}
              </p>
            ) : !marketReady ? (
              // The market payload has not arrived. Saying "unavailable" here would be a
              // verdict on data we have not seen yet.
              <SkeletonBlock className="mt-1 h-9 w-36" />
            ) : (
              <p className="font-display text-2xl font-bold text-fog">Price unavailable</p>
            )}
            {price != null && (
              <p className="mt-1.5 flex flex-wrap items-center gap-2">
                <Delta value={dayPct} percent size="sm" />
                <span className="text-xs text-mute">today</span>
                {signal && <span className="chip bg-edge text-fog">{signal.label}</span>}
              </p>
            )}
          </section>
          {isOwner && (
            <Link to="/studio" className="pressable rounded-lg border border-stage/50 bg-stage/10 px-3 py-2 text-xs font-semibold text-stage">
              Open Studio →
            </Link>
          )}
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-mute">
          All prices and balances are simulated. Trading here buys no equity, royalties,
          securities or any real interest in the artist.
        </p>
      </section>

      {marketReady && price == null && (
        <p role="status" className="card px-4 py-3 text-sm text-fog">
          This artist has no recent market price, so trading is unavailable right now.
          Nothing is wrong with your account.
        </p>
      )}

      {/* -------------------------------------------------- personal position */}
      {session && (
        <section aria-label="Your position" className="card px-4 py-3">
          {heldShares > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-mute">Your position</p>
                <p className="num mt-1 text-lg font-semibold">
                  {heldShares.toLocaleString()} sh
                  {positionValue != null && <span className="text-fog"> · ${fmt(positionValue)}</span>}
                </p>
                <p className="num mt-0.5 text-[11px] text-mute">
                  avg ${avgCost != null ? fmt(avgCost) : '—'}
                </p>
              </div>
              <div className="text-right">
                <Delta value={positionPct} percent size="lg" />
                <Link to="/portfolio" className="mt-1 block text-xs text-stage underline underline-offset-4">
                  View portfolio
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-fog">
              You don’t hold {artist.name} this season.{' '}
              {cash != null && <>You have <span className="num text-paper">${fmt(cash)}</span> in simulated cash.</>}
            </p>
          )}
        </section>
      )}

      {/* -------------------------------------------------------------- chart */}
      <PriceChart
        points={points} history={history} range={range} setRange={setRange}
        livePrice={price} name={artist.name} />

      {/* ------------------------------------------------------- intelligence */}
      <Intelligence
        gap={gap} pressure={pressure} backers={backers} metrics={metrics}
        listenerChange={listenerChange}
        exposure={exposureSentence({ shares: heldShares, price, portfolioTotal })} />

      {/* -------------------------------------------------------------- trade */}
      <TradeModule
        artist={artist} session={session} price={price} cash={cash} held={heldShares}
        side={side} setSide={setSide} shares={shares} setShares={setShares}
        q={q} busy={busy} onSubmit={submitTrade}
        receipt={receipt} onDismissReceipt={() => setReceipt(null)} receiptRef={receiptRef}
        tradeErr={tradeErr} unresolved={unresolved} onCheckStatus={checkStatus}
        myTrades={myTrades} />

      {/* ------------------------------------------------------- participation */}
      <Backers backers={backers} />

      {updates.length > 0 && (
        <section aria-label="Artist updates" className="space-y-2">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">From the artist</h2>
          <div className="space-y-2">
            {updates.map((u, i) => (
              <div key={i} className="card px-4 py-3">
                <p className="whitespace-pre-wrap text-sm">{u.body}</p>
                <p className="mt-1 text-xs text-mute">
                  {new Date(u.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <SameGenre market={market} artist={artist} />
    </div>
  )
}

/* ------------------------------------------------------------------- chart */

function PriceChart({ points, history, range, setRange, livePrice, name }) {
  const loading = history === null
  const enough = points.length >= 2
  const first = history?.first != null ? Number(history.first) : null
  const last = history?.last != null ? Number(history.last) : null
  const high = history?.high != null ? Number(history.high) : null
  const low = history?.low != null ? Number(history.low) : null
  const change = first != null && last != null ? last - first : null
  const lastTs = history?.last_ts ? new Date(history.last_ts) : null

  // The headline uses the live aggregate while the chart uses sampled history, so they
  // can differ by a tick. Say so rather than let them look contradictory.
  const drift = livePrice != null && last != null && Math.abs(livePrice - last) > 0.005

  return (
    <section className="card px-4 py-4" aria-label={`${name} price history`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">Price history</h2>
        <div role="group" aria-label="Chart range" className="flex gap-1">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)} aria-pressed={range === r.key}
              className={`pressable min-h-[34px] rounded-lg px-2.5 text-xs font-semibold ${
                range === r.key ? 'bg-stage text-ink' : 'bg-panel text-fog hover:text-paper'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <SkeletonBlock className="mt-3 h-48 sm:h-60" />}

      {!loading && !enough && (
        <p className="mt-3 rounded-lg bg-edge/40 px-3 py-6 text-center text-sm text-fog">
          Not enough recorded price history for this range yet.
        </p>
      )}

      {!loading && enough && (
        <>
          <p className="sr-only">
            {name} price over {range}: started at ${fmt(first)}, ended at ${fmt(last)},
            a change of ${fmt(change)}. High ${fmt(high)}, low ${fmt(low)},
            from {history.samples} recorded prices.
          </p>

          <div className="mt-3 h-48 sm:h-60" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']}
                  tickFormatter={v => range === '1D'
                    ? new Date(v).toLocaleTimeString([], { hour: 'numeric' })
                    : new Date(v).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  minTickGap={44} height={18}
                  tick={{ fill: '#6E7288', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} width={54}
                  tickFormatter={v => `$${Number(v).toFixed(2)}`}
                  tick={{ fill: '#6E7288', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={false} tickLine={false} />
                {first != null && (
                  <ReferenceLine y={first} stroke="#6E7288" strokeDasharray="4 4" />
                )}
                <Tooltip
                  contentStyle={{ background: '#1B1D29', border: '1px solid #343850', borderRadius: 10 }}
                  labelStyle={{ color: '#9A9DB3', fontSize: 12 }}
                  labelFormatter={v => new Date(v).toLocaleString([], {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  formatter={v => [`$${fmt(v)}`, 'Price']} />
                <Line type="monotone" dataKey="p" dot={false} strokeWidth={2}
                  stroke={change >= 0 ? '#3DDC97' : '#FF6B6B'} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-edge pt-3 text-center">
            <div><dt className="text-[10px] uppercase tracking-widest text-mute">Start</dt>
              <dd className="num text-sm">${fmt(first)}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-widest text-mute">Change</dt>
              <dd><Delta value={change} size="sm" /></dd></div>
            <div><dt className="text-[10px] uppercase tracking-widest text-mute">High</dt>
              <dd className="num text-sm">${fmt(high)}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-widest text-mute">Low</dt>
              <dd className="num text-sm">${fmt(low)}</dd></div>
          </dl>

          <p className="mt-2 text-[11px] leading-relaxed text-mute">
            Sampled from {history.samples} recorded prices
            {lastTs && <> · last recorded {lastTs.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</>}
            {drift && <> · the headline price above is more recent than the last chart point</>}
          </p>
        </>
      )}
    </section>
  )
}

/* ------------------------------------------------------------ intelligence */

function Intelligence({ gap, pressure, backers, metrics, listenerChange, exposure }) {
  const facts = [
    metrics?.latest && {
      k: 'listeners',
      title: 'Monthly listeners',
      body: `${Number(metrics.latest.followers).toLocaleString()} recorded` +
        (listenerChange != null
          ? `, ${listenerChange >= 0 ? 'up' : 'down'} ${Math.abs(listenerChange).toFixed(1)}% on the previous reading.`
          : '.'),
    },
    gap != null && { k: 'gap', title: 'Versus listener-implied price', body: valueGapSentence(gap) },
    pressure && { k: 'pressure', title: 'Recent trading', body: pressureSentence(pressure) },
    backers && { k: 'holders', title: 'Market participation', body: participationSentence(backers) },
    exposure && { k: 'exposure', title: 'Your exposure', body: exposure },
  ].filter(Boolean)

  if (!facts.length) return null

  return (
    <section aria-label="Artist intelligence" className="grid gap-2 sm:grid-cols-2 sm:gap-3">
      {facts.map(f => (
        <div key={f.k} className="card px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-mute">{f.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-fog">{f.body}</p>
        </div>
      ))}
    </section>
  )
}

/* ------------------------------------------------------------------ trade */

function TradeModule({
  artist, session, price, cash, held, side, setSide, shares, setShares,
  q, busy, onSubmit, receipt, onDismissReceipt, receiptRef,
  tradeErr, unresolved, onCheckStatus, myTrades,
}) {
  const disabled = !q.ok || busy || price == null

  return (
    <section id="trade" aria-label="Trade" className="card px-4 py-4">
      <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">Trade</h2>

      {!session ? (
        <p className="mt-3 text-sm text-fog">
          <Link to="/auth" className="text-stage underline underline-offset-4">Sign in</Link> to trade.
          New accounts start with $10,000 in simulated cash.
        </p>
      ) : receipt ? (
        <div ref={receiptRef} tabIndex={-1} role="status" aria-live="polite"
          className="mt-3 rounded-card border border-gain/40 bg-gain/10 px-4 py-4 outline-none">
          <p className="text-sm font-semibold text-gain">
            {receipt.side === 'buy' ? 'Purchased' : 'Sold'} {receipt.shares.toLocaleString()}{' '}
            share{receipt.shares === 1 ? '' : 's'} of {artist.name} at ${fmt(receipt.price)} per
            share for ${fmt(receipt.total)} simulated cash.
          </p>
          {receipt.replayed && (
            <p className="mt-1 text-xs text-fog">
              This was the trade you already submitted — it was not repeated.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/portfolio"
              className="pressable rounded-lg bg-stage px-4 py-2 text-sm font-semibold text-ink">
              View portfolio
            </Link>
            <button onClick={onDismissReceipt}
              className="pressable rounded-lg border border-edge px-4 py-2 text-sm font-semibold text-fog hover:text-paper">
              Keep trading
            </button>
          </div>
        </div>
      ) : (
        <>
          <div role="group" aria-label="Buy or sell" className="mt-3 grid grid-cols-2 gap-2">
            {['buy', 'sell'].map(s => (
              <button key={s} onClick={() => setSide(s)} aria-pressed={side === s}
                className={`pressable min-h-[42px] rounded-lg text-sm font-semibold capitalize ${
                  side === s
                    ? (s === 'buy' ? 'bg-gain text-ink' : 'bg-loss text-ink')
                    : 'border border-edge text-fog hover:text-paper'}`}>
                {s}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <label htmlFor="qty" className="text-[11px] font-semibold uppercase tracking-widest text-mute">
              Shares
            </label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input id="qty" type="number" inputMode="decimal" min="0.5" step="0.5" value={shares}
                onChange={e => setShares(e.target.value)}
                aria-describedby="quote-line"
                aria-invalid={!q.ok}
                className="num min-h-[44px] w-24 rounded-lg border border-edge bg-ink px-3 text-sm outline-none focus:border-stage" />
              {[10, 25, 50].map(n => (
                <button key={n} onClick={() => setShares(String(n))}
                  className="pressable min-h-[36px] rounded-lg bg-ink px-3 text-xs text-fog hover:text-paper">{n}</button>
              ))}
              {side === 'buy' && price != null && cash != null && (
                <button onClick={() => setShares(String(Math.floor((cash / price) * 2) / 2))}
                  className="pressable min-h-[36px] rounded-lg bg-ink px-3 text-xs text-fog hover:text-paper">Max</button>
              )}
              {side === 'sell' && held > 0 && (
                <button onClick={() => setShares(String(held))}
                  className="pressable min-h-[36px] rounded-lg bg-ink px-3 text-xs text-fog hover:text-paper">All</button>
              )}
            </div>
          </div>

          {/* Everything the trade will do, before it is submitted. */}
          <dl id="quote-line" className="mt-3 space-y-1 rounded-lg bg-edge/30 px-3 py-2.5 text-xs">
            <div className="flex justify-between">
              <dt className="text-fog">Price per share</dt>
              <dd className="num">{price != null ? `$${fmt(price)}` : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fog">{side === 'buy' ? 'Estimated cost' : 'Estimated proceeds'}</dt>
              <dd className="num font-semibold">{q.total != null ? `$${fmt(q.total)}` : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fog">{side === 'buy' ? 'Cash after' : 'Shares after'}</dt>
              <dd className="num">
                {side === 'buy'
                  ? (q.cashAfter != null ? `$${fmt(q.cashAfter)}` : '—')
                  : (q.sharesAfter != null ? q.sharesAfter.toLocaleString() : '—')}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fog">{side === 'buy' ? 'Available cash' : 'Shares held'}</dt>
              <dd className="num">{side === 'buy' ? money(cash) : held.toLocaleString()}</dd>
            </div>
          </dl>

          <p aria-live="polite" className="mt-2 min-h-[1rem] text-xs">
            {!q.ok && q.problem && <span className="text-loss">{q.problem}</span>}
          </p>

          <button onClick={onSubmit} disabled={disabled}
            className={`pressable mt-1 min-h-[46px] w-full rounded-lg text-sm font-semibold disabled:opacity-40 ${
              side === 'buy' ? 'bg-gain text-ink' : 'bg-loss text-ink'}`}>
            {busy
              ? 'Submitting…'
              : `${side === 'buy' ? 'Buy' : 'Sell'} ${Number(shares) || 0} ${
                  Number(shares) === 1 ? 'share' : 'shares'} · simulated`}
          </button>

          {tradeErr && (
            <div role="alert" className={`mt-3 rounded-lg px-3 py-2.5 text-xs ${
              unresolved ? 'bg-gold/15 text-gold' : 'bg-loss/15 text-loss'}`}>
              <p>{tradeErr}</p>
              {unresolved && (
                <button onClick={onCheckStatus} disabled={busy}
                  className="pressable mt-2 rounded-lg border border-gold/40 px-3 py-1.5 font-semibold">
                  Check status
                </button>
              )}
            </div>
          )}
        </>
      )}

      {myTrades.length > 0 && (
        <div className="mt-4 border-t border-edge pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-mute">
            Your trades in {artist.name} this season
          </p>
          <ul className="mt-1.5 space-y-1">
            {myTrades.map((t, i) => (
              <li key={i} className="num flex justify-between text-xs text-fog">
                <span className={t.side === 'buy' ? 'text-gain' : 'text-loss'}>
                  {t.side === 'buy' ? 'Bought' : 'Sold'} {Number(t.shares).toLocaleString()}
                </span>
                <span>@ ${fmt(t.price)}</span>
                <span className="text-mute">
                  {new Date(t.ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/* ---------------------------------------------------------------- backers */

function Backers({ backers }) {
  if (!backers) return null
  const pub = backers.public || []
  const priv = Number(backers.private_count ?? 0)
  const holders = Number(backers.holders ?? 0)

  return (
    <section aria-label="Top backers" className="card px-4 py-4">
      <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">Top backers</h2>

      {holders === 0 ? (
        <p className="mt-2 text-sm text-fog">No traders hold this artist yet this season.</p>
      ) : (
        <>
          {pub.length > 0 && (
            <ul className="mt-2 divide-y divide-edge">
              {pub.map((b, i) => (
                <li key={b.username} className="flex items-center gap-3 py-2">
                  <span className="num w-5 text-xs text-mute">#{i + 1}</span>
                  <Avatar username={b.username} url={b.avatar_url} size={28} />
                  <Link to={`/trader/${encodeURIComponent(b.username)}`}
                    className="min-w-0 flex-1 truncate text-sm hover:underline">{b.username}</Link>
                  <span className="num text-xs text-fog">{Number(b.shares).toLocaleString()} sh</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs leading-relaxed text-mute">
            {pub.length === 0
              ? `${holders} trader${holders === 1 ? '' : 's'} hold this artist. None have made their portfolio public.`
              : priv > 0
                ? `Plus ${priv} trader${priv === 1 ? '' : 's'} with private portfolios.`
                : null}
            {' '}Rankings reflect simulated holdings only.
          </p>
        </>
      )}
    </section>
  )
}

/* -------------------------------------------------------------- discovery */

function SameGenre({ market, artist }) {
  // Deterministic: same genre string, excluding this artist, biggest absolute mover first.
  const peers = (market || [])
    .filter(a => a.id !== artist.id && a.genre && a.genre === artist.genre)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 4)

  if (!peers.length) return null

  return (
    <section aria-label="More in this genre" className="space-y-2">
      <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">
        More in {artist.genre}
      </h2>
      <div className="card divide-y divide-edge overflow-hidden">
        {peers.map(a => (
          <Link key={a.id} to={`/artist/${a.id}`}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-instant hover:bg-edge/40">
            <Avatar username={a.name} url={a.image_url} size={30} />
            <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
            <span className="num shrink-0 text-xs text-fog">{money(a.latest)}</span>
            <Delta value={a.latest != null ? a.pct : null} percent size="xs" />
          </Link>
        ))}
      </div>
    </section>
  )
}

function friendlyTrade(msg = '') {
  if (/Insufficient cash/i.test(msg)) return 'You don’t have enough simulated cash for that.'
  if (/Insufficient shares/i.test(msg)) return 'You don’t hold that many shares.'
  if (/Rate limit/i.test(msg)) return 'That’s a lot of trades in a short time. Wait a moment and try again.'
  if (/No active season/i.test(msg)) return 'The season is being set up. Trading resumes shortly.'
  if (/No market price/i.test(msg)) return 'There’s no current price for this artist, so trading is unavailable.'
  if (/Not authenticated|JWT|token/i.test(msg)) return 'Your session expired. Sign in again to trade.'
  return msg
}
