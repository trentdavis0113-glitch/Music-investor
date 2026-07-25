import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, YAxis, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase, fmt, dayChange } from '../lib/supabase'
import { useSession } from '../App'

export default function Studio() {
  const session = useSession()
  const [artists, setArtists] = useState(null)
  const [edits, setEdits] = useState({})
  const [msg, setMsg] = useState(null)
  const [post, setPost] = useState({})

  useEffect(() => {
    if (!session) return
    async function load() {
      const { data: mine } = await supabase.from('artists')
        .select('id,name,genre,bio,image_url,spotify_url').eq('claimed_by', session.user.id)
      if (!mine?.length) { setArtists([]); return }
      const enriched = await Promise.all(mine.map(async a => {
        const [{ data: ticks }, { data: stats }, { data: hist }] = await Promise.all([
          supabase.from('price_ticks').select('price,ts').eq('artist_id', a.id)
            .order('ts', { ascending: false }).limit(120),
          supabase.rpc('artist_stats', { p_artist_id: a.id }),
          supabase.from('metric_snapshots').select('followers,captured_at')
            .eq('artist_id', a.id).order('captured_at', { ascending: true }).limit(60)
        ])
        const { pct, latest } = dayChange((ticks || []).reverse())
        const growth = (hist || []).map(h => ({
          d: new Date(h.captured_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          v: Number(h.followers)
        }))
        return { ...a, pct, latest, growth, holders: stats?.holders ?? 0, sharesHeld: Number(stats?.shares_held ?? 0) }
      }))
      setArtists(enriched)
      setEdits(Object.fromEntries(enriched.map(a => [a.id, { bio: a.bio || '', genre: a.genre || '' }])))
    }
    load()
  }, [session])

  async function publish(artistId) {
    const body = (post[artistId] || '').trim()
    if (!body) return
    const { error } = await supabase.from('artist_updates').insert({ artist_id: artistId, body })
    if (error) { setMsg({ ok: false, text: error.message }); return }
    setPost(x => ({ ...x, [artistId]: '' }))
    setMsg({ ok: true, text: 'Posted. Fans see it on your market page.' })
  }

  async function save(id) {
    setMsg(null)
    const { error } = await supabase.rpc('update_my_artist', {
      p_artist_id: id, p_bio: edits[id].bio, p_genre: edits[id].genre
    })
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Saved.' })
  }

  if (!session) return <p className="text-fog"><Link to="/auth" className="text-stage underline underline-offset-4">Sign in</Link> to open your studio.</p>
  if (artists === null) return <p className="text-fog">Loading studio…</p>
  if (!artists.length) return (
    <p className="text-fog">
      You don't manage any artist profiles yet.{' '}
      <Link to="/for-artists" className="text-stage underline underline-offset-4">Claim yours or apply to get listed.</Link>
    </p>
  )

  const input = 'w-full rounded-lg border border-edge bg-ink px-3 py-2.5 text-sm outline-none focus:border-stage'

  return (
    <div className="space-y-8">
      {artists.map(a => {
        const cap = a.latest ? a.latest * a.sharesHeld : 0
        return (
          <div key={a.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-2xl font-extrabold">{a.name}</h1>
              <Link to={`/artist/${a.id}`} className="text-sm text-stage underline underline-offset-4">
                View market page
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <Stat label="Share price" value={a.latest ? `$${fmt(a.latest)}` : '—'} />
              <Stat label="Today" value={`${a.pct >= 0 ? '+' : ''}${a.pct.toFixed(2)}%`}
                tone={a.pct >= 0 ? 'text-gain' : 'text-loss'} />
              <Stat label="Holders" value={a.holders} />
              <Stat label="Fan investment" value={`$${fmt(cap)}`} />
            </div>
            {a.growth.length >= 2 && (
              <div className="rounded-xl border border-edge bg-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-fog">Monthly listeners over time</p>
                <div className="mt-2 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={a.growth}>
                      <XAxis dataKey="d" tick={{ fill: '#9A9DB3', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis width={48} tick={{ fill: '#9A9DB3', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#1B1D29', border: '1px solid #2A2D3E', borderRadius: 8 }}
                        formatter={val => [Number(val).toLocaleString(), 'Listeners']} />
                      <Line type="monotone" dataKey="v" dot={false} strokeWidth={2} stroke="#8B7CF6" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs text-fog">
                  {a.growth.length >= 2 && a.growth[a.growth.length - 1].v !== a.growth[0].v
                    ? `${a.growth[a.growth.length - 1].v > a.growth[0].v ? '+' : ''}${(a.growth[a.growth.length - 1].v - a.growth[0].v).toLocaleString()} listeners since your first listing snapshot.`
                    : 'Growth updates land every Monday.'}
                </p>
              </div>
            )}
            <div className="space-y-3 rounded-xl border border-edge bg-panel p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-fog">Post an update</p>
              <textarea rows={2} maxLength={500} value={post[a.id] || ''}
                onChange={e => setPost(x => ({ ...x, [a.id]: e.target.value }))}
                placeholder="New single Friday. Studio session pics. Anything that moves your fans."
                className={input} />
              <button onClick={() => publish(a.id)}
                className="rounded-lg bg-stage px-4 py-2 text-sm font-semibold text-ink">Post to your page</button>
            </div>
            <div className="space-y-3 rounded-xl border border-edge bg-panel p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-fog">Your public profile</p>
              <input className={input} placeholder="Genre" value={edits[a.id]?.genre || ''}
                onChange={e => setEdits(x => ({ ...x, [a.id]: { ...x[a.id], genre: e.target.value } }))} maxLength={40} />
              <textarea className={input} rows={3} placeholder="Bio" value={edits[a.id]?.bio || ''}
                onChange={e => setEdits(x => ({ ...x, [a.id]: { ...x[a.id], bio: e.target.value } }))} maxLength={280} />
              {msg && <p className={`text-sm ${msg.ok ? 'text-gain' : 'text-loss'}`}>{msg.text}</p>}
              <button onClick={() => save(a.id)}
                className="rounded-lg bg-stage px-4 py-2 text-sm font-semibold text-ink">Save changes</button>
              <p className="text-xs text-fog">
                Your name, photo, and stats sync from Spotify automatically. Share your market page with fans;
                more holders means more people invested in your next release.
              </p>
            </div>
          </div>
        )
      })}
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
