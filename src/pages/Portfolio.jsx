import { useEffect, useState } from 'react'
import { LineChart, Line, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Link } from 'react-router-dom'
import { supabase, fmt } from '../lib/supabase'
import { useSession, useMeta } from '../App'

export default function Portfolio() {
  const session = useSession()
  const { streak } = useMeta()
  const [cash, setCash] = useState(null)
  const [rows, setRows] = useState(null)
  const [txns, setTxns] = useState([])
  const [snaps, setSnaps] = useState([])
  const [uname, setUname] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameMsg, setNameMsg] = useState(null)
  const [badges, setBadges] = useState([])
  const [isPublic, setIsPublic] = useState(false)

  useEffect(() => {
    if (!session) return
    async function load() {
      const { data: acct } = await supabase.rpc('ensure_account')
      setCash(acct?.cash ?? 0)
      supabase.rpc('get_achievements').then(({ data }) => setBadges(data || []))
      const { data: sn } = await supabase.from('portfolio_snapshots')
        .select('snap_date,value').order('snap_date', { ascending: true }).limit(120)
      setSnaps((sn || []).map(x => ({ d: x.snap_date.slice(5), v: Number(x.value) })))
      const { data: prof } = await supabase.from('profiles')
        .select('username,is_public').eq('id', session.user.id).maybeSingle()
      setUname(prof?.username || '')
      setIsPublic(!!prof?.is_public)
      const { data: tx } = await supabase.from('transactions')
        .select('side,shares,price,total,ts,artists(name)')
        .order('ts', { ascending: false }).limit(15)
      setTxns(tx || [])
      const { data: holdings } = await supabase.from('holdings')
        .select('artist_id,shares,avg_cost').gt('shares', 0)
      if (!holdings?.length) { setRows([]); return }
      const ids = holdings.map(h => h.artist_id)
      const [{ data: artists }, { data: ticks }] = await Promise.all([
        supabase.from('artists').select('id,name,genre').in('id', ids),
        supabase.from('price_ticks').select('artist_id,price,ts')
          .in('artist_id', ids).order('ts', { ascending: false }).limit(ids.length * 4)
      ])
      const latest = {}
      for (const t of ticks || []) if (!(t.artist_id in latest)) latest[t.artist_id] = Number(t.price)
      setRows(holdings.map(h => {
        const a = artists?.find(x => x.id === h.artist_id)
        const price = latest[h.artist_id] ?? 0
        const value = price * Number(h.shares)
        const pl = (price - Number(h.avg_cost)) * Number(h.shares)
        return { ...h, name: a?.name || '—', price, value, pl }
      }).sort((x, y) => y.value - x.value))
    }
    load()
  }, [session])

  async function saveUsername() {
    setNameMsg(null)
    const clean = uname.trim()
    if (clean.length < 3 || clean.length > 24) { setNameMsg('3 to 24 characters.'); return }
    const { error } = await supabase.from('profiles')
      .update({ username: clean }).eq('id', session.user.id)
    if (error) {
      setNameMsg(/duplicate|unique/i.test(error.message) ? 'That username is taken.' : error.message)
      return
    }
    setEditingName(false)
  }

  async function togglePublic() {
    const next = !isPublic
    const { error } = await supabase.from('profiles')
      .update({ is_public: next }).eq('id', session.user.id)
    if (!error) setIsPublic(next)
  }

  if (!session) return (
    <p className="text-fog">
      <Link to="/auth" className="text-stage underline underline-offset-4">Sign in</Link> to see your portfolio. New accounts start with $10,000 simulated cash.
    </p>
  )
  if (rows === null) return <p className="text-fog">Loading portfolio…</p>

  const invested = rows.reduce((s, r) => s + r.value, 0)
  const totalPl = rows.reduce((s, r) => s + r.pl, 0)
  const total = Number(cash || 0) + invested

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm">
        {editingName ? (
          <span className="flex items-center gap-2">
            <input value={uname} onChange={e => setUname(e.target.value)} maxLength={24}
              className="w-40 rounded-lg border border-edge bg-panel px-2 py-1 text-sm outline-none focus:border-stage" />
            <button onClick={saveUsername} className="text-stage">Save</button>
          </span>
        ) : (
          <span className="text-fog">
            Trading as <span className="text-paper">{uname}</span>{' '}
            <button onClick={() => setEditingName(true)} className="text-stage underline underline-offset-4">edit</button>
          </span>
        )}
        {nameMsg && <span className="text-loss">{nameMsg}</span>}
        {streak > 0 && (
          <span className="num rounded-lg border border-edge bg-panel px-2.5 py-1 text-xs">
            🔥 {streak} day{streak === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="rounded-xl border border-edge bg-panel p-4 text-center">
        <p className="text-xs uppercase tracking-widest text-fog">Total portfolio value</p>
        <p className="num mt-1 font-display text-3xl font-extrabold">${fmt(total)}</p>
        <p className={`num mt-1 text-sm ${totalPl >= 0 ? 'text-gain' : 'text-loss'}`}>
          {totalPl >= 0 ? '+' : ''}${fmt(totalPl)} open P/L
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <Card label="Cash" value={`$${fmt(cash)}`} />
        <Card label="Invested" value={`$${fmt(invested)}`} />
      </div>

      {snaps.length >= 2 && (
        <div className="h-40 rounded-xl border border-edge bg-panel p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-fog">Performance</p>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={snaps}>
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip
                contentStyle={{ background: '#1B1D29', border: '1px solid #2A2D3E', borderRadius: 8 }}
                labelFormatter={() => ''} formatter={v => [`$${fmt(v)}`, 'Value']} />
              <Line type="monotone" dataKey="v" dot={false} strokeWidth={2}
                stroke={snaps[snaps.length - 1].v >= snaps[0].v ? '#3DDC97' : '#FF6B6B'} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-fog">No positions yet. Head to the <Link to="/" className="text-stage underline underline-offset-4">market</Link> and tap the Value sort: artists trading under fair value are the classic first buy.</p>
      ) : (
        <div className="divide-y divide-edge rounded-xl border border-edge bg-panel">
          {rows.map(r => (
            <Link key={r.artist_id} to={`/artist/${r.artist_id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-edge/40">
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="num text-xs text-fog">
                  {Number(r.shares).toLocaleString()} sh @ ${fmt(r.avg_cost)}
                </p>
              </div>
              <div className="text-right">
                <p className="num text-sm">${fmt(r.value)}</p>
                <p className={`num text-xs ${r.pl >= 0 ? 'text-gain' : 'text-loss'}`}>
                  {r.pl >= 0 ? '+' : ''}${fmt(r.pl)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-edge bg-panel px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Public portfolio</p>
          <p className="text-xs text-fog">
            {isPublic ? 'Anyone can view your positions from the leaderboard.' : 'Your positions are private.'}
          </p>
        </div>
        <button onClick={togglePublic}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${isPublic ? 'bg-stage text-ink' : 'border border-edge text-fog'}`}>
          {isPublic ? 'Public' : 'Private'}
        </button>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-edge bg-panel px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Invite friends</p>
          <p className="num truncate text-xs text-fog">{`${window.location.origin}/?ref=${uname}`}</p>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?ref=${uname}`); setNameMsg(null) }}
          className="shrink-0 rounded-lg bg-stage px-3 py-1.5 text-xs font-semibold text-ink">Copy link</button>
      </div>

      {badges.length > 0 && (
        <section>
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">Achievements</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {badges.map(b => (
              <div key={b.code}
                className={`rounded-xl border p-3 text-center ${b.earned ? 'border-stage/50 bg-stage/10' : 'border-edge bg-panel opacity-50'}`}>
                <p className="text-sm font-semibold">{b.name}</p>
                <p className="mt-0.5 text-xs text-fog">{b.descr}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {txns.length > 0 && (
        <section>
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-fog">Recent activity</h2>
          <div className="mt-3 divide-y divide-edge rounded-xl border border-edge bg-panel">
            {txns.map((t, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className={`num text-xs font-semibold ${t.side === 'buy' ? 'text-gain' : 'text-loss'}`}>
                  {t.side.toUpperCase()}
                </span>
                <span className="flex-1 px-3 truncate">{t.artists?.name}</span>
                <span className="num text-xs text-fog">
                  {Number(t.shares).toLocaleString()} @ ${fmt(t.price)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Card({ label, value }) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-3">
      <p className="num text-lg">{value}</p>
      <p className="text-xs text-fog">{label}</p>
    </div>
  )
}
