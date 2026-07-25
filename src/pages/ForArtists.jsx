import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../App'

export default function ForArtists() {
  const session = useSession()
  const [params] = useSearchParams()
  const preselect = params.get('claim')
  const [tab, setTab] = useState(preselect ? 'claim' : 'apply')
  const [unclaimed, setUnclaimed] = useState([])
  const [myClaims, setMyClaims] = useState([])
  const [form, setForm] = useState({
    artistId: preselect || '', name: '', genre: '', bio: '', spotifyUrl: '', note: ''
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    supabase.from('artists').select('id,name,genre')
      .is('claimed_by', null).eq('is_active', true).order('name')
      .then(({ data }) => setUnclaimed(data || []))
    if (session) loadClaims()
  }, [session])

  async function loadClaims() {
    const { data } = await supabase.from('artist_claims')
      .select('id,status,proposed_name,created_at,artists(name)')
      .order('created_at', { ascending: false })
    setMyClaims(data || [])
  }

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })) }

  async function submit() {
    setBusy(true); setMsg(null)
    const { error } = await supabase.rpc('submit_claim', {
      p_artist_id: tab === 'claim' ? Number(form.artistId) || null : null,
      p_spotify_url: form.spotifyUrl.trim(),
      p_note: form.note || null,
      p_name: tab === 'apply' ? form.name : null,
      p_genre: tab === 'apply' ? form.genre : null,
      p_bio: tab === 'apply' ? form.bio : null
    })
    setBusy(false)
    if (error) { setMsg({ ok: false, text: error.message }); return }
    setMsg({ ok: true, text: 'Submitted. We review every claim by hand, usually within a day or two.' })
    setForm({ artistId: '', name: '', genre: '', bio: '', spotifyUrl: '', note: '' })
    loadClaims()
  }

  const input = 'w-full rounded-lg border border-edge bg-ink px-3 py-2.5 text-sm outline-none focus:border-stage'

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Get listed. Get backed.</h1>
        <p className="mt-2 text-sm text-fog">
          Fans trade shares of your career using simulated cash. Your price moves on your real
          Spotify momentum, and every holder is a fan with a reason to share your music.
          Free for artists, always.
        </p>
      </div>

      {!session ? (
        <div className="rounded-xl border border-edge bg-panel p-4">
          <p className="text-sm text-fog">
            <Link to="/auth" className="text-stage underline underline-offset-4">Create an account</Link> first,
            then come back here to claim your profile or apply to get listed.
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <button onClick={() => setTab('apply')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === 'apply' ? 'bg-stage text-ink' : 'bg-panel text-fog'}`}>
              Apply to get listed
            </button>
            <button onClick={() => setTab('claim')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === 'claim' ? 'bg-stage text-ink' : 'bg-panel text-fog'}`}>
              Claim an existing profile
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-edge bg-panel p-4">
            {tab === 'claim' ? (
              unclaimed.length ? (
                <select value={form.artistId} onChange={set('artistId')} className={input}>
                  <option value="">Select your profile…</option>
                  {unclaimed.map(a => (
                    <option key={a.id} value={a.id}>{a.name}{a.genre ? ` (${a.genre})` : ''}</option>
                  ))}
                </select>
              ) : <p className="text-sm text-fog">No unclaimed profiles right now. Apply to get listed instead.</p>
            ) : (
              <>
                <input className={input} placeholder="Artist or band name" value={form.name} onChange={set('name')} maxLength={60} />
                <input className={input} placeholder="Genre" value={form.genre} onChange={set('genre')} maxLength={40} />
                <textarea className={input} rows={3} placeholder="Short bio (shown on your market page)"
                  value={form.bio} onChange={set('bio')} maxLength={280} />
              </>
            )}
            <input className={input} placeholder="Your Spotify artist link (open.spotify.com/artist/...)"
              value={form.spotifyUrl} onChange={set('spotifyUrl')} />
            <textarea className={input} rows={2}
              placeholder="How can we verify it's you? (Instagram handle, email on your Spotify page, etc.)"
              value={form.note} onChange={set('note')} maxLength={400} />
            {msg && <p className={`text-sm ${msg.ok ? 'text-gain' : 'text-loss'}`}>{msg.text}</p>}
            <button disabled={busy} onClick={submit}
              className="w-full rounded-lg bg-stage py-2.5 font-semibold text-ink disabled:opacity-50">
              {busy ? 'Submitting…' : tab === 'claim' ? 'Submit claim' : 'Submit application'}
            </button>
          </div>

          {myClaims.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-fog">Your submissions</h2>
              <div className="mt-2 divide-y divide-edge rounded-xl border border-edge bg-panel">
                {myClaims.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>{c.artists?.name || c.proposed_name}</span>
                    <span className={
                      c.status === 'approved' ? 'text-gain' :
                      c.status === 'rejected' ? 'text-loss' : 'text-fog'
                    }>{c.status}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
