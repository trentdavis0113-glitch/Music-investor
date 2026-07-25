import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [err, setErr] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)
  const navigate = useNavigate()

  function validate() {
    if (!email.includes('@')) return 'Enter a valid email address.'
    if (password.length < 8) return 'Password needs at least 8 characters.'
    if (mode === 'signup' && (username.trim().length < 3 || username.trim().length > 24))
      return 'Username needs 3 to 24 characters.'
    return null
  }

  async function submit() {
    const v = validate()
    if (v) { setErr(v); return }
    setBusy(true); setErr(null); setInfo(null)
    try {
      if (mode === 'signup') {
        const res = await fetch('https://uajheoltstvftdmnigaw.supabase.co/functions/v1/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhamhlb2x0c3R2ZnRkbW5pZ2F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMzAwNjIsImV4cCI6MjA5ODcwNjA2Mn0.Y76uSwVI7t-NOZNB9RWKoeQY0EGBGByjmypjfs__RP8'
          },
          body: JSON.stringify({ email, password, username: username.trim(), ref: localStorage.getItem('greenroom_ref') || null })
        })
        const out = await res.json()
        if (!res.ok) throw new Error(out.error || 'Signup failed. Try again.')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (/not confirmed/i.test(error.message)) { setConfirmSent(true); return }
          throw error
        }
      }
      navigate('/portfolio')
    } catch (e) {
      setErr(friendly(e.message))
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    setErr(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/portfolio' }
    })
    if (error) {
      setErr(/not enabled|unsupported/i.test(error.message)
        ? 'Google sign-in is not switched on yet. Use email for now.'
        : friendly(error.message))
    }
  }

  async function forgot() {
    if (!email.includes('@')) { setErr('Enter your email above first, then tap forgot password.'); return }
    setBusy(true); setErr(null); setInfo(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset'
    })
    setBusy(false)
    if (error) { setErr(friendly(error.message)); return }
    setInfo('Password reset link sent. Check your inbox.')
  }

  async function resend() {
    setBusy(true); setErr(null)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setBusy(false)
    if (error) setErr(friendly(error.message))
  }

  if (confirmSent) return (
    <div className="mx-auto max-w-sm space-y-4 text-center">
      <h1 className="font-display text-2xl font-extrabold">Check your email</h1>
      <p className="text-sm text-fog">
        We sent a confirmation link to <span className="text-paper">{email}</span>.
        Click it, then sign in. Nothing arriving? Check spam, or resend below.
      </p>
      {err && <p className="text-sm text-loss">{err}</p>}
      <button disabled={busy} onClick={resend}
        className="w-full rounded-lg border border-edge py-2.5 text-sm font-semibold hover:border-stage disabled:opacity-50">
        Resend confirmation email
      </button>
      <button onClick={() => { setConfirmSent(false); setMode('signin') }}
        className="text-sm text-fog hover:text-paper">Back to sign in</button>
    </div>
  )

  const input = 'w-full rounded-lg border border-edge bg-ink px-3 py-2.5 text-sm outline-none focus:border-stage'

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="font-display text-2xl font-extrabold">
        {mode === 'signin' ? 'Sign in' : 'Create account'}
      </h1>
      <p className="text-sm text-fog">
        Every trader starts Season 1 with $10,000 in simulated cash. No real money is involved.{' '}
        <Link to="/how-it-works" className="text-stage underline underline-offset-4">How it works</Link>
      </p>

      <button onClick={google}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-edge bg-panel py-2.5 text-sm font-semibold hover:border-stage">
        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs text-fog">
        <span className="h-px flex-1 bg-edge" />or use email<span className="h-px flex-1 bg-edge" />
      </div>

      {mode === 'signup' && (
        <input className={input} placeholder="Username (3-24 characters)" value={username}
          maxLength={24} onChange={e => setUsername(e.target.value)} />
      )}
      <input className={input} type="email" placeholder="Email" value={email}
        autoComplete="email" onChange={e => setEmail(e.target.value)} />
      <input className={input} type="password"
        placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        value={password} onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()} />
      {err && <p className="text-sm text-loss">{err}</p>}
      {info && <p className="text-sm text-gain">{info}</p>}
      <button disabled={busy} onClick={submit}
        className="w-full rounded-lg bg-stage py-2.5 font-semibold text-ink disabled:opacity-50">
        {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
      <div className="flex justify-between text-sm">
        <button onClick={() => { setErr(null); setMode(mode === 'signin' ? 'signup' : 'signin') }}
          className="text-fog hover:text-paper">
          {mode === 'signin' ? 'Create an account' : 'Sign in instead'}
        </button>
        {mode === 'signin' && (
          <button onClick={forgot} className="text-fog hover:text-paper">Forgot password?</button>
        )}
      </div>
    </div>
  )
}

function friendly(msg) {
  if (/rate limit/i.test(msg)) return 'Signups are briefly rate limited. Try again in a few minutes.'
  if (/already registered/i.test(msg)) return 'That email already has an account. Sign in instead.'
  if (/invalid login/i.test(msg)) return 'Wrong email or password.'
  return msg
}
