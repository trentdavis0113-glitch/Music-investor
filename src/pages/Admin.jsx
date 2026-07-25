import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession, useMeta } from '../App'

export default function Admin() {
  const session = useSession()
  const { isAdmin } = useMeta()
  const [claims, setClaims] = useState(null)
  const [msg, setMsg] = useState(null)
  const [stats, setStats] = useState(null)
  const [requests, setRequests] = useState([])
  const [roster, setRoster] = useState([])
  const [edits, setEdits] = useState({})
  const [saveMsg, setSaveMsg] = useState(null)
  const [na, setNa] = useState({ name: '', url: '', genre: '', listeners: '' })
  const [addMsg, setAddMsg] = useState(null)

  async function load() {
    const { data } = await supabase.from('artist_claims')
      .select('id,status,proposed_name,proposed_genre,proposed_bio,spotify_url,note,created_at,artists(name),profiles(username)')
      .eq('status', 'pending').order('created_at', { ascending: true })
    setClaims(data || [])
  }
  useEffect(() => {
    if (!isAdmin) return
    load()
    supabase.rpc('admin_stats').then(({ data }) => setStats(data))
    supabase.from('artist_requests')
      .select('artist_name,created_at,profiles(username)')
      .order('created_at', { ascending: false }).limit(15)
      .then(({ data }) => setRequests(data || []))
    loadRoster()
  }, [isAdmin])

  async function loadRoster() {
    const { data: arts } = await supabase.from('artists')
      .select('id,name,symbol').not('spotify_id', 'is', null).eq('is_active', true).order('name')
    if (!arts) return
    const { data: snaps } = await supabase.from('metric_snapshots')
      .select('artist_id,followers,captured_at').order('captured_at', { ascending: false }).limit(200)
    const latest = {}
    for (const m of snaps || []) if (!(m.artist_id in latest)) latest[m.artist_id] = Number(m.followers)
    setRoster(arts.map(a => ({ ...a, listeners: latest[a.id] ?? 0 })))
  }

  async function saveMetric(id) {
    setSaveMsg(null)
    const val = Number(edits[id])
    if (!Number.isFinite(val) || val < 0) return
    const { error } = await supabase.rpc('set_artist_metrics', { p_artist_id: id, p_listeners: Math.round(val) })
    if (error) { setSaveMsg(error.message); return }
    setEdits(x => ({ ...x, [id]: '' }))
    loadRoster()
  }

  async function addArtist() {
    setAddMsg(null)
    const { data, error } = await supabase.rpc('admin_add_artist', {
      p_name: na.name, p_spotify_url: na.url.trim(), p_genre: na.genre,
      p_listeners: Math.round(Number(na.listeners) || 0)
    })
    if (error) { setAddMsg({ ok: false, text: error.message }); return }
    setAddMsg({ ok: true, text: `Listed as $${data.symbol}. Live on the market now.` })
    setNa({ name: '', url: '', genre: '', listeners: '' })
    loadRoster()
  }

  async function review(id, approve) {
    setMsg(null)
    const { error } = await supabase.rpc('review_claim', { p_claim_id: id, p_approve: approve })
    if (error) { setMsg(error.message); return }
    load()
  }

  if (!session || !isAdmin) return <p className="text-fog">Admin access only.</p>
  if (claims === null) return <p className="text-fog">Loading claims…</p>

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-extrabold">Command center</h1>
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[['Traders', stats.users], ['Trades 24h', stats.trades_24h],
              ['Volume 24h', '$' + Number(stats.volume_24h).toLocaleString()],
              ['Active 24h', stats.active_traders_24h]].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-edge bg-panel p-3">
                <p className="num text-lg">{v}</p>
                <p className="text-xs text-fog">{l}</p>
              </div>
            ))}
          </div>
          {stats.top_traded?.length > 0 && (
            <p className="text-xs text-fog">
              Most traded this week: {stats.top_traded.map(t => `${t.name} (${t.trades})`).join(', ')}
            </p>
          )}
        </>
      )}
      {requests.length > 0 && (
        <p className="text-xs text-fog">
          Fan requests: {requests.map(r => r.artist_name).join(', ')}
        </p>
      )}
      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">Add artist</h2>
        <p className="text-xs text-fog">
          In Spotify: search the artist, tap share, copy link. Their monthly listeners are on the same page.
        </p>
        <div className="space-y-2 rounded-xl border border-edge bg-panel p-4">
          <input placeholder="Artist name" value={na.name}
            onChange={e => setNa(x => ({ ...x, name: e.target.value }))}
            className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-stage" />
          <input placeholder="Spotify artist link" value={na.url}
            onChange={e => setNa(x => ({ ...x, url: e.target.value }))}
            className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-stage" />
          <div className="flex gap-2">
            <input placeholder="Genre" value={na.genre}
              onChange={e => setNa(x => ({ ...x, genre: e.target.value }))}
              className="min-w-0 flex-1 rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-stage" />
            <input placeholder="Monthly listeners" type="number" inputMode="numeric" value={na.listeners}
              onChange={e => setNa(x => ({ ...x, listeners: e.target.value }))}
              className="num w-36 rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-stage" />
          </div>
          {addMsg && <p className={`text-xs ${addMsg.ok ? 'text-gain' : 'text-loss'}`}>{addMsg.text}</p>}
          <button onClick={addArtist}
            className="w-full rounded-lg bg-stage py-2 text-sm font-semibold text-ink">List artist</button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">Monday metrics</h2>
        <p className="text-xs text-fog">
          Open each artist in the Spotify app, read their monthly listeners, type it here. Prices gap on save.
        </p>
        <div className="divide-y divide-edge rounded-xl border border-edge bg-panel">
          {roster.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{a.name} <span className="num text-xs text-fog">${a.symbol}</span></p>
                <p className="num text-xs text-fog">current: {a.listeners.toLocaleString()} listeners</p>
              </div>
              <input type="number" inputMode="numeric" placeholder="new #"
                value={edits[a.id] || ''}
                onChange={e => setEdits(x => ({ ...x, [a.id]: e.target.value }))}
                className="num w-24 rounded-lg border border-edge bg-ink px-2 py-1.5 text-sm outline-none focus:border-stage" />
              <button onClick={() => saveMetric(a.id)}
                className="rounded-lg bg-stage px-3 py-1.5 text-xs font-semibold text-ink">Set</button>
            </div>
          ))}
        </div>
        {saveMsg && <p className="text-xs text-loss">{saveMsg}</p>}
      </section>

      <h2 className="font-display text-lg font-bold">Pending claims</h2>
      {msg && <p className="text-sm text-loss">{msg}</p>}
      {!claims.length && <p className="text-fog">Queue is clear.</p>}
      {claims.map(c => (
        <div key={c.id} className="space-y-2 rounded-xl border border-edge bg-panel p-4 text-sm">
          <div className="flex items-center justify-between">
            <p className="font-semibold">
              {c.artists?.name
                ? <>Claim on <span className="text-stage">{c.artists.name}</span></>
                : <>New listing: <span className="text-stage">{c.proposed_name}</span></>}
            </p>
            <p className="text-xs text-fog">by {c.profiles?.username}</p>
          </div>
          {c.proposed_genre && <p className="text-fog">Genre: {c.proposed_genre}</p>}
          {c.proposed_bio && <p className="text-fog">Bio: {c.proposed_bio}</p>}
          <p><a href={c.spotify_url} target="_blank" rel="noreferrer" className="text-stage underline underline-offset-4 break-all">{c.spotify_url}</a></p>
          {c.note && <p className="text-fog">Verification: {c.note}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => review(c.id, true)}
              className="rounded-lg bg-gain px-4 py-2 font-semibold text-ink">Approve</button>
            <button onClick={() => review(c.id, false)}
              className="rounded-lg bg-loss px-4 py-2 font-semibold text-ink">Reject</button>
          </div>
        </div>
      ))}
    </div>
  )
}
