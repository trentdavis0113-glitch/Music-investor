import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, YAxis, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Link } from 'react-router-dom'
import { supabase, fmt } from '../lib/supabase'
import { useMarket } from '../lib/market'
import { computePortfolio, summarise } from '../lib/portfolio'
import { SkeletonRows, SkeletonBlock, ErrorState, SignedOut } from '../components/States'
import Avatar from '../components/Avatar'
import Delta from '../components/Delta'
import { useSession, useMeta, useAuthReady } from '../App'

// Snapshots are written once a day by snapshot_portfolios(), so intraday ranges cannot be
// supported honestly and are deliberately absent. A range is only offered when it has at
// least two points to draw.
const RANGES = [
  { key: '1W', label: '1W', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: 'S', label: 'Season', days: null },
]

export default function Portfolio() {
  const session = useSession()
  const authReady = useAuthReady()
  const { streak } = useMeta()
  const { rows: market } = useMarket()

  const [err, setErr] = useState(null)
  const [copied, setCopied] = useState(false)
  const [renamed, setRenamed] = useState(() => sessionStorage.getItem('greenroom_rename_notice'))
  const [reloadKey, setReloadKey] = useState(0)
  const [seasonId, setSeasonId] = useState(null)
  const [cash, setCash] = useState(null)
  const [holdings, setHoldings] = useState(null)
  const [txns, setTxns] = useState([])
  const [snaps, setSnaps] = useState([])
  const [range, setRange] = useState('1M')
  const [uname, setUname] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [nameMsg, setNameMsg] = useState(null)
  const [badges, setBadges] = useState([])
  const [isPublic, setIsPublic] = useState(false)
  const [bankroll, setBankroll] = useState(0)

  useEffect(() => {
    if (!session) return
    let alive = true

    async function load() {
      // ensure_account() is the single source of truth for which season is current, and
      // returns it — so everything below can be season-scoped without a second lookup.
      const { data: acct, error: acctErr } = await supabase.rpc('ensure_account')
      if (!alive) return
      if (acctErr) { setErr(acctErr.message || 'Request failed.'); return }
      setErr(null)
      const sid = acct?.season_id ?? null
      setSeasonId(sid)
      setCash(Number(acct?.cash ?? 0))

      // One round trip for everything else rather than a sequential waterfall.
      const [season, hold, snap, tx, prof, ach] = await Promise.all([
        supabase.from('seasons').select('starting_bankroll').eq('id', sid).maybeSingle(),
        // season_id scoping matters: holdings is keyed (user, season, artist), so without
        // it a trader with positions in two seasons would have every artist counted twice
        // the moment Season 2 opens.
        supabase.from('holdings').select('artist_id,shares,avg_cost')
          .eq('season_id', sid).gt('shares', 0),
        // Ordered descending then reversed. Ascending + limit returns the OLDEST rows, so
        // the chart would have frozen on day 120 and never advanced.
        supabase.from('portfolio_snapshots').select('snap_date,value')
          .eq('season_id', sid).order('snap_date', { ascending: false }).limit(400),
        supabase.from('transactions').select('side,shares,price,total,ts,artist_id,artists(name,symbol)')
          .eq('season_id', sid).order('ts', { ascending: false }).limit(20),
        supabase.from('profiles').select('username,is_public').eq('id', session.user.id).maybeSingle(),
        supabase.rpc('get_achievements'),
      ])
      if (!alive) return

      setBankroll(Number(season.data?.starting_bankroll ?? 0))
      setHoldings(hold.data || [])
      setSnaps((snap.data || []).slice().reverse()
        .map(x => ({ d: x.snap_date, t: new Date(x.snap_date).getTime(), v: Number(x.value) })))
      setTxns(tx.data || [])
      setUname(prof.data?.username || '')
      setIsPublic(!!prof.data?.is_public)
      setBadges(ach.data || [])
    }

    load()
    return () => { alive = false }
  }, [session, reloadKey])

  // Prices come from the shared market store, which is already loaded and polling for the
  // ticker. This also replaces a fragile query that fetched the most recent
  // (holdings × 4) ticks globally — with ties on ts, an artist could be dropped from that
  // window entirely and its position would have valued at zero.
  const { priceOf, artistOf } = useMemo(() => {
    const priceOf = {}, artistOf = {}
    for (const a of market || []) {
      priceOf[a.id] = a.latest
      artistOf[a.id] = a
    }
    return { priceOf, artistOf }
  }, [market])

  const p = useMemo(() => computePortfolio({
    cash: cash ?? 0, holdings: holdings || [], priceOf, artistOf, startingBankroll: bankroll,
  }), [cash, holdings, priceOf, artistOf, bankroll])

  const summary = useMemo(() => summarise(p), [p])

  const series = useMemo(() => {
    if (!snaps.length) return []
    const r = RANGES.find(x => x.key === range)
    if (!r?.days) return snaps
    const cutoff = Date.now() - r.days * 86400_000
    return snaps.filter(s => s.t >= cutoff)
  }, [snaps, range])

  const availableRanges = useMemo(() => RANGES.filter(r => {
    if (!r.days) return snaps.length >= 2
    const cutoff = Date.now() - r.days * 86400_000
    return snaps.filter(s => s.t >= cutoff).length >= 2
  }), [snaps])

  async function saveUsername() {
    setNameMsg(null)
    const clean = nameDraft.trim()
    if (clean.length < 3 || clean.length > 24) { setNameMsg('3 to 24 characters.'); return }
    if (!/^[a-zA-Z0-9_.-]+$/.test(clean)) { setNameMsg('Letters, numbers, and . _ - only.'); return }
    const { error } = await supabase.from('profiles').update({ username: clean }).eq('id', session.user.id)
    if (error) {
      setNameMsg(/duplicate|unique/i.test(error.message) ? 'That username is taken.' : error.message)
      return
    }
    setUname(clean); setEditingName(false); setNameMsg('Saved.')
    setTimeout(() => setNameMsg(null), 2000)
  }

  async function togglePublic() {
    const next = !isPublic
    const { error } = await supabase.from('profiles').update({ is_public: next }).eq('id', session.user.id)
    if (!error) setIsPublic(next)
  }

  if (!authReady) return <SkeletonBlock className="h-32" />
  if (!session) return <SignedOut what="your portfolio" />
  if (err && holdings === null) return (
    <ErrorState message="Couldn't load your portfolio." onRetry={() => { setErr(null); setReloadKey(k => k + 1) }}>
      {err}
    </ErrorState>
  )
  if (holdings === null) return (
    <div className="space-y-4">
      <p className="sr-only">Loading portfolio</p>
      <SkeletonBlock className="h-32" />
      <SkeletonBlock className="h-44" />
      <SkeletonRows rows={3} />
    </div>
  )

  const empty = p.positions.length === 0

  return (
    <div className="space-y-4 sm:space-y-6">
      {renamed && (
        <div className="card flex items-start justify-between gap-3 border-stage/40 bg-stage/10 px-4 py-3">
          <p className="text-sm">
            The username you picked was taken, so you’re trading as{' '}
            <span className="font-semibold text-stage">{renamed}</span>. Change it below any time.
          </p>
          <button onClick={() => { sessionStorage.removeItem('greenroom_rename_notice'); setRenamed(null) }}
            aria-label="Dismiss" className="shrink-0 text-fog hover:text-paper">✕</button>
        </div>
      )}

      <Header p={p} empty={empty} streak={streak} />

      {empty ? (
        <EmptyPortfolio market={market} cash={p.cash} />
      ) : (
        <>
          {series.length >= 2 && (
            <PerformanceChart
              series={series} range={range} setRange={setRange}
              ranges={availableRanges} bankroll={bankroll} />
          )}

          {summary && (
            <p className="card px-4 py-3 text-sm leading-relaxed text-fog">
              {summary}
            </p>
          )}

          <Intelligence p={p} />
          <Holdings p={p} />
          <Allocation p={p} />
        </>
      )}

      <RecentActivity txns={txns} />

      {/* Account settings sit below the intelligence: useful, but not what you came for. */}
      <section className="space-y-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">Account</h2>

        <div className="card flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
          {editingName ? (
            <span className="flex items-center gap-2">
              <input value={nameDraft} onChange={e => setNameDraft(e.target.value)} maxLength={24}
                aria-label="Username" autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') saveUsername()
                  if (e.key === 'Escape') { setEditingName(false); setNameMsg(null) }
                }}
                className="w-40 rounded-lg border border-edge bg-ink px-2 py-1.5 text-sm outline-none focus:border-stage" />
              <button onClick={saveUsername} className="pressable text-stage">Save</button>
              <button onClick={() => { setEditingName(false); setNameMsg(null) }}
                className="pressable text-fog hover:text-paper">Cancel</button>
            </span>
          ) : (
            <span className="text-fog">
              Trading as <span className="text-paper">{uname}</span>{' '}
              <button onClick={() => { setNameDraft(uname); setEditingName(true); setNameMsg(null) }}
                className="pressable text-stage underline underline-offset-4">edit</button>
            </span>
          )}
          {nameMsg && (
            <span aria-live="polite" className={nameMsg === 'Saved.' ? 'text-gain' : 'text-loss'}>{nameMsg}</span>
          )}
        </div>

        <div className="card flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Public portfolio</p>
            <p className="text-xs text-fog">
              {isPublic ? 'Anyone can view your positions from the leaderboard.' : 'Your positions are private.'}
            </p>
          </div>
          <button onClick={togglePublic} aria-pressed={isPublic}
            className={`pressable shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
              isPublic ? 'bg-stage text-ink' : 'border border-edge text-fog'}`}>
            {isPublic ? 'Public' : 'Private'}
          </button>
        </div>

        <div className="card flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Invite friends</p>
            <p className="num truncate text-xs text-fog">
              {`${window.location.origin}/?ref=${encodeURIComponent(uname)}`}
            </p>
          </div>
          <button
            onClick={async () => {
              const link = `${window.location.origin}/?ref=${encodeURIComponent(uname)}`
              try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) }
              catch { setCopied(false) }
            }}
            aria-live="polite"
            className="pressable shrink-0 rounded-lg bg-stage px-3 py-2 text-xs font-semibold text-ink">
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>

        {badges.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {badges.map(b => (
              <div key={b.code}
                className={`rounded-card border p-3 text-center ${
                  b.earned ? 'border-stage/50 bg-stage/10' : 'border-edge bg-panel opacity-50'}`}>
                <p className="text-sm font-semibold">{b.name}</p>
                <p className="mt-0.5 text-xs text-fog">{b.descr}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/* ---------------------------------------------------------------- header */

function Header({ p, empty, streak }) {
  return (
    <section className="card-raised px-4 py-5 sm:px-6 sm:py-6" aria-labelledby="pf-total">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 id="pf-total" className="text-[11px] font-semibold uppercase tracking-widest text-mute">
            Total simulated value
          </h1>
          {/* One dominant number. Everything else is deliberately smaller. */}
          <p className="num mt-1 font-display text-4xl font-extrabold leading-none sm:text-5xl">
            ${fmt(p.total)}
          </p>
          {!empty && p.seasonReturn != null && (
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <Delta value={p.seasonReturn} size="lg" />
              <Delta value={p.seasonReturnPct} percent size="sm" showGlyph={false} />
              <span className="text-xs text-mute">this season</span>
            </p>
          )}
        </div>

        <dl className="flex shrink-0 gap-5 text-right sm:gap-8">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-widest text-mute">Cash</dt>
            <dd className="num mt-1 text-lg font-semibold">${fmt(p.cash)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-widest text-mute">Invested</dt>
            <dd className="num mt-1 text-lg font-semibold">${fmt(p.invested)}</dd>
          </div>
          {streak > 0 && (
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-widest text-mute">Streak</dt>
              <dd className="num mt-1 text-lg font-semibold">{streak}d</dd>
            </div>
          )}
        </dl>
      </div>

      {p.unpricedCount > 0 && (
        <p role="status" className="mt-3 text-xs text-fog">
          {p.unpricedCount} position{p.unpricedCount === 1 ? '' : 's'} awaiting a price update and
          excluded from these totals.
        </p>
      )}
    </section>
  )
}

/* ----------------------------------------------------------------- chart */

function PerformanceChart({ series, range, setRange, ranges, bankroll }) {
  const first = series[0]?.v ?? 0
  const last = series[series.length - 1]?.v ?? 0
  const change = last - first
  const values = series.map(s => s.v)
  const high = Math.max(...values), low = Math.min(...values)
  const up = change >= 0

  const label = ranges.find(r => r.key === range)?.label || range

  return (
    <section className="card px-4 py-4" aria-label="Portfolio performance">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">Performance</h2>
        <div role="group" aria-label="Chart range" className="flex gap-1">
          {ranges.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)} aria-pressed={range === r.key}
              className={`pressable min-h-[34px] rounded-lg px-3 text-xs font-semibold ${
                range === r.key ? 'bg-stage text-ink' : 'bg-panel text-fog hover:text-paper'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* The chart is decorative to a screen reader; this sentence carries the same
          information in text (WCAG 1.1.1). */}
      <p className="sr-only">
        Portfolio value over {label}: started at ${fmt(first)}, ended at ${fmt(last)},
        a change of ${fmt(change)}. High ${fmt(high)}, low ${fmt(low)},
        across {series.length} daily snapshots.
      </p>

      <div className="mt-3 h-44 sm:h-56" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
            <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']}
              tickFormatter={v => new Date(v).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              minTickGap={44} height={18}
              tick={{ fill: '#6E7288', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false} tickLine={false} />
            <YAxis domain={['auto', 'auto']} width={54}
              tickFormatter={v => `$${Math.round(v).toLocaleString()}`}
              tick={{ fill: '#6E7288', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false} tickLine={false} />
            {bankroll > 0 && (
              <ReferenceLine y={bankroll} stroke="#6E7288" strokeDasharray="4 4"
                label={{ value: 'start', fill: '#6E7288', fontSize: 10, position: 'insideTopLeft' }} />
            )}
            <Tooltip
              contentStyle={{ background: '#1B1D29', border: '1px solid #343850', borderRadius: 10 }}
              labelStyle={{ color: '#9A9DB3', fontSize: 12 }}
              labelFormatter={v => new Date(v).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              formatter={v => [`$${fmt(v)}`, 'Value']} />
            <Line type="monotone" dataKey="v" dot={false} strokeWidth={2}
              stroke={up ? '#3DDC97' : '#FF6B6B'} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-edge pt-3 text-center">
        <div><dt className="text-[10px] uppercase tracking-widest text-mute">Start</dt>
          <dd className="num text-sm">${fmt(first)}</dd></div>
        <div><dt className="text-[10px] uppercase tracking-widest text-mute">Change</dt>
          <dd><Delta value={change} size="sm" /></dd></div>
        <div><dt className="text-[10px] uppercase tracking-widest text-mute">High</dt>
          <dd className="num text-sm">${fmt(high)}</dd></div>
      </dl>
    </section>
  )
}

/* ---------------------------------------------------------- intelligence */

function Intelligence({ p }) {
  const cards = []
  if (p.best) cards.push({ k: 'best', label: p.best.plPct > 0 ? 'Strongest position' : 'Best position', a: p.best })

  if (p.worst) {
    // "Weakest position" beside a green +6% arrow reads as a contradiction. When the
    // lowest performer is still up, say what is actually true.
    cards.push({ k: 'worst', label: p.worst.plPct < 0 ? 'Weakest position' : 'Smallest gain', a: p.worst })
  }

  // Suppressed when it is the same artist as the strongest — a three-card row that names
  // one artist twice wastes a third of itself.
  const dupe = p.largest && p.best && p.largest.artist_id === p.best.artist_id
  if (p.largest && p.positions.length > 1 && !dupe) {
    cards.push({ k: 'largest', label: 'Largest holding', a: p.largest, alloc: true })
  }

  if (!cards.length) return null

  return (
    <section aria-label="Position highlights" className="grid gap-2 sm:grid-cols-3 sm:gap-3">
      {cards.map(({ k, label, a, alloc }) => (
        <Link key={k} to={`/artist/${a.artist_id}`}
          className="card pressable flex items-center gap-3 px-4 py-3 hover:border-edge2">
          <Avatar username={a.name} url={a.image_url} size={36} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-mute">{label}</p>
            <p className="truncate text-sm font-semibold text-paper">{a.name}</p>
          </div>
          <div className="shrink-0 text-right">
            {alloc
              ? <p className="num text-sm font-semibold">{a.allocation?.toFixed(0)}%</p>
              : <Delta value={a.plPct} percent size="sm" />}
            <p className="num text-[11px] text-mute">${fmt(a.value)}</p>
          </div>
        </Link>
      ))}
    </section>
  )
}

/* -------------------------------------------------------------- holdings */

function Holdings({ p }) {
  return (
    <section aria-label="Your holdings" className="space-y-2">
      <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">
        Holdings <span className="text-mute">({p.positions.length})</span>
      </h2>

      <div className="card divide-y divide-edge overflow-hidden">
        {/* Column headers on desktop only; on mobile each row is self-labelling. */}
        <div className="hidden px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-mute sm:grid sm:grid-cols-[1fr_5rem_6rem_6rem_4rem] sm:gap-3">
          <span>Artist</span>
          <span className="text-right">Shares</span>
          <span className="text-right">Price</span>
          <span className="text-right">Value</span>
          <span className="text-right">Weight</span>
        </div>

        {p.positions.map(a => (
          <Link key={a.artist_id} to={`/artist/${a.artist_id}`}
            className="block px-3 py-3 transition-colors duration-instant hover:bg-edge/40 sm:px-4">
            <div className="flex items-center gap-3 sm:grid sm:grid-cols-[1fr_5rem_6rem_6rem_4rem] sm:items-center sm:gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar username={a.name} url={a.image_url} size={38} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-paper">{a.name}</p>
                  <p className="num mt-0.5 text-[11px] text-mute">
                    ${a.symbol} · avg ${fmt(a.avgCost)}
                  </p>
                </div>
              </div>

              {/* Mobile: value and return stack on the right. Desktop: aligned columns. */}
              <span className="num hidden text-right text-sm sm:block">{a.shares.toLocaleString()}</span>
              <span className="num hidden text-right text-sm sm:block">
                {a.priceKnown ? `$${fmt(a.price)}` : '—'}
              </span>
              <span className="hidden text-right sm:block">
                <span className="num block text-sm font-semibold">
                  {a.priceKnown ? `$${fmt(a.value)}` : '—'}
                </span>
                <Delta value={a.plPct} percent size="xs" />
              </span>
              <span className="num hidden text-right text-sm text-fog sm:block">
                {a.allocation != null ? `${a.allocation.toFixed(0)}%` : '—'}
              </span>

              <span className="shrink-0 text-right sm:hidden">
                <span className="num block text-sm font-semibold">
                  {a.priceKnown ? `$${fmt(a.value)}` : '—'}
                </span>
                <Delta value={a.plPct} percent size="xs" />
              </span>
            </div>

            {/* Mobile-only secondary line, so nothing important is truncated above. */}
            <p className="num mt-1.5 flex items-center gap-2 text-[11px] text-mute sm:hidden">
              <span>{a.shares.toLocaleString()} sh</span>
              <span aria-hidden="true">·</span>
              <span>{a.priceKnown ? `$${fmt(a.price)}` : 'no price'}</span>
              {a.allocation != null && (<><span aria-hidden="true">·</span><span>{a.allocation.toFixed(0)}% of total</span></>)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ allocation */

function Allocation({ p }) {
  const priced = p.positions.filter(x => x.priceKnown)
  if (!priced.length) return null

  return (
    <section aria-label="Allocation" className="card space-y-3 px-4 py-4">
      <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">Allocation</h2>

      {/* A stacked bar reads better than a pie at this width, and the list underneath
          carries the same numbers for anyone who cannot see it. */}
      <div className="flex h-2 overflow-hidden rounded-full bg-edge" aria-hidden="true">
        {priced.map((a, i) => (
          <span key={a.artist_id}
            style={{ width: `${a.allocation ?? 0}%` }}
            className={['bg-stage', 'bg-gain', 'bg-gold', 'bg-loss', 'bg-fog'][i % 5]} />
        ))}
        <span style={{ width: `${p.cashPct ?? 0}%` }} className="bg-edge2" />
      </div>

      <ul className="space-y-1.5 text-sm">
        {priced.map((a, i) => (
          <li key={a.artist_id} className="flex items-center gap-2">
            <span aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${['bg-stage', 'bg-gain', 'bg-gold', 'bg-loss', 'bg-fog'][i % 5]}`} />
            <span className="min-w-0 flex-1 truncate">{a.name}</span>
            <span className="num text-fog">${fmt(a.value)}</span>
            <span className="num w-12 text-right">{a.allocation?.toFixed(0)}%</span>
          </li>
        ))}
        <li className="flex items-center gap-2 border-t border-edge pt-1.5">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-edge2" />
          <span className="min-w-0 flex-1 text-fog">Cash</span>
          <span className="num text-fog">${fmt(p.cash)}</span>
          <span className="num w-12 text-right">{p.cashPct?.toFixed(0)}%</span>
        </li>
      </ul>

      {p.concentration != null && p.concentration >= 40 && p.positions.length > 1 && (
        <p className="rounded-lg bg-edge/40 px-3 py-2 text-xs leading-relaxed text-fog">
          {p.largest.name} accounts for {p.concentration.toFixed(0)}% of your total simulated
          value. In this game a single artist moving has a proportionally large effect on
          your total.
        </p>
      )}
    </section>
  )
}

/* -------------------------------------------------------------- activity */

function RecentActivity({ txns }) {
  return (
    <section aria-label="Recent activity" className="space-y-2">
      <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">Recent activity</h2>

      {txns.length === 0 ? (
        <p className="card px-4 py-6 text-center text-sm text-fog">
          No trades yet this season. Your buys and sells will appear here with the price and
          total you paid.
        </p>
      ) : (
        <ul className="card divide-y divide-edge overflow-hidden">
          {txns.map((t, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className={`chip shrink-0 ${
                t.side === 'buy' ? 'bg-gain/15 text-gain' : 'bg-loss/15 text-loss'}`}>
                {t.side === 'buy' ? 'Bought' : 'Sold'}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {t.artists?.name || '—'}
              </span>
              <span className="num shrink-0 text-right text-xs text-fog">
                <span className="block">
                  {Number(t.shares).toLocaleString()} @ ${fmt(t.price)}
                </span>
                <span className="block text-mute">
                  ${fmt(t.total)} · {new Date(t.ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ----------------------------------------------------------- empty state */

function EmptyPortfolio({ market, cash }) {
  // Labels are literal descriptions of how each list was selected. No personalisation is
  // claimed, because there is no preference data to base it on.
  const movers = (market || []).slice().sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 3)
  const value = (market || []).filter(a => a.gap != null).sort((a, b) => b.gap - a.gap).slice(0, 3)

  return (
    <section className="space-y-4">
      <div className="card px-4 py-6 text-center sm:py-8">
        <p className="font-display text-lg font-extrabold">You haven’t bought any artists yet.</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fog">
          Your portfolio will show what you hold, what it’s worth, and how it’s moving. You have{' '}
          <span className="num text-paper">${fmt(cash)}</span> in simulated cash to start —
          no real money is involved at any point.
        </p>
        <Link to="/"
          className="pressable mt-4 inline-block rounded-lg bg-stage px-5 py-2.5 text-sm font-semibold text-ink shadow-e1 hover:brightness-110">
          Explore the market
        </Link>
      </div>

      {movers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Suggestions title="Biggest movers today" hint="Largest price change in either direction" items={movers} metric="pct" />
          {value.length > 0 && (
            <Suggestions title="Furthest under fair value" hint="Price sits below what listener data implies" items={value} metric="gap" />
          )}
        </div>
      )}
    </section>
  )
}

function Suggestions({ title, hint, items, metric }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 pb-2 pt-3">
        <h3 className="font-display text-sm font-bold uppercase tracking-widest text-fog">{title}</h3>
        <p className="mt-0.5 text-[11px] text-mute">{hint}</p>
      </div>
      <ul className="divide-y divide-edge border-t border-edge">
        {items.map(a => (
          <li key={a.id}>
            <Link to={`/artist/${a.id}`}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-instant hover:bg-edge/40">
              <Avatar username={a.name} url={a.image_url} size={30} />
              <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
              <span className="num shrink-0 text-xs text-fog">${fmt(a.latest)}</span>
              <Delta value={metric === 'gap' ? a.gap : a.pct} percent size="xs" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
