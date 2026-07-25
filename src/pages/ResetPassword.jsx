import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function save() {
    if (password.length < 8) { setErr('Password needs at least 8 characters.'); return }
    setBusy(true); setErr(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) { setErr(error.message); return }
    navigate('/portfolio')
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="font-display text-2xl font-extrabold">Set a new password</h1>
      <input type="password" placeholder="New password (8+ characters)" value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()}
        className="w-full rounded-lg border border-edge bg-ink px-3 py-2.5 text-sm outline-none focus:border-stage" />
      {err && <p className="text-sm text-loss">{err}</p>}
      <button disabled={busy} onClick={save}
        className="w-full rounded-lg bg-stage py-2.5 font-semibold text-ink disabled:opacity-50">
        {busy ? 'Saving…' : 'Save and sign in'}
      </button>
    </div>
  )
}
