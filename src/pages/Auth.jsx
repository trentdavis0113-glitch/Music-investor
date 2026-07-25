import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, callFunction, SUPABASE_URL, SUPABASE_KEY } from '../lib/supabase'

const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/

export default function Auth() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)
  // null = unknown/not checked, otherwise { state: 'checking'|'free'|'taken'|'invalid' }
  const [nameCheck, setNameCheck] = useState(null)
  // null = still checking, true = offer it, false = provider is off, hide it entirely
  const [googleEnabled, setGoogleEnabled] = useState(null)
  const navigate = useNavigate()
  const reqId = useRef(0)

  // Is Google actually configured? signInWithOAuth navigates the browser straight to
  // Supabase, and if the provider is disabled Supabase answers with a raw JSON 400 on its
  // OWN domain — it never redirects back, so the app cannot catch or explain it and the
  // user is simply stranded. Ask up front instead, and only offer the button if it works.
  // Fails open: if this check itself fails, show the button rather than hide a working one.
  useEffect(() => {
    let alive = true
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
      .then(r => (r.ok ? r.json() : null))
      .then(s => { if (alive) setGoogleEnabled(s ? !!s?.external?.google : true) })
      .catch(() => { if (alive) setGoogleEnabled(true) })
    return () => { alive = false }
  }, [])

  // Surface an OAuth failure that App.jsx captured from the redirect URL.
  useEffect(() => {
    const stashed = sessionStorage.getItem('greenroom_auth_error')
    if (!stashed) return
    sessionStorage.removeItem('greenroom_auth_error')
    setErr(/provider is not enabled|unsupported provider/i.test(stashed)
      ? 'Google sign-in is not switched on yet. Use email for now.'
      : friendly(stashed))
  }, [])

  // Live username availability. Previously the only way to discover a name was taken was
  // to submit and get silently renamed to trader_<uuid>.
  useEffect(() => {
    if (mode !== 'signup') { setNameCheck(null); return }
    const raw = username.trim()
    if (!raw) { setNameCheck(null); return }
    if (raw.length < 3 || raw.length > 24 || !USERNAME_RE.test(raw)) {
      setNameCheck({ state: 'invalid' })
      return
    }
    setNameCheck({ state: 'checking' })
    const mine = ++reqId.current
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('username_available', { p_username: raw })
      if (mine !== reqId.current) return          // a newer keystroke won
      if (error) { setNameCheck(null); return }   // never block signup on the check
      setNameCheck({ state: data ? 'free' : 'taken' })
    }, 350)
    return () => clearTimeout(t)
  }, [username, mode])

  function validate() {
    if (!email.includes('@')) return 'Enter a valid email address.'
    if (password.length < 8) return 'Password needs at least 8 characters.'
    if (mode === 'signup') {
      const u = username.trim()
      if (u.length < 3 || u.length > 24) return 'Username needs 3 to 24 characters.'
      if (!USERNAME_RE.test(u)) return 'Usernames can use letters, numbers, and . _ - only.'
    }
    return null
  }

  /** Sign in, retrying once — a fresh account is occasionally not yet readable. */
  async function signIn() {
    let last = null
    for (let i = 0; i < 2; i++) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error) return null
      last = error
      if (/invalid login|not confirmed/i.test(error.message)) break
      await new Promise(r => setTimeout(r, 500))
    }
    return last
  }

  async function submit(e) {
    e?.preventDefault?.()
    const v = validate()
    if (v) { setErr(v); return }
    setBusy(true); setErr(null); setInfo(null)
    try {
      if (mode === 'signup') {
        const { data, error } = await callFunction('signup', {
          email,
          password,
          username: username.trim(),
          ref: localStorage.getItem('greenroom_ref') || null,
        })

        if (error) {
          // Route the user instead of dead-ending them on "Signup failed".
          if (error.code === 'email_taken') {
            setMode('signin')
            setErr('That email already has an account — sign in below.')
            return
          }
          setErr(error.message)
          return
        }

        const signInErr = await signIn()
        if (signInErr) {
          // The account DOES exist. Saying "Signup failed" here used to send people into a
          // retry loop that then reported "email already has an account".
          setMode('signin')
          setInfo('Your account was created. Sign in to finish.')
          return
        }

        if (data?.renamed && data?.username) {
          // Tell them rather than silently renaming.
          sessionStorage.setItem('greenroom_rename_notice', data.username)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (/not confirmed/i.test(error.message)) { setConfirmSent(true); return }
          throw error
        }
      }
      navigate('/portfolio')
    } catch (e2) {
      setErr(friendly(e2.message))
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    setErr(null); setInfo(null); setBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Must be listed under Authentication → URL Configuration → Redirect URLs in
        // Supabase, for every origin the app is served from.
        redirectTo: `${window.location.origin}/portfolio`,
        // Testers routinely have several Google accounts; let them pick rather than
        // silently reusing whichever one the browser is already signed into.
        queryParams: { prompt: 'select_account' },
      },
    })
    // On success the browser navigates away, so this only runs on failure.
    setBusy(false)
    if (error) {
      setErr(/not enabled|unsupported|provider is not enabled/i.test(error.message)
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
    else setInfo('Sent. Check your inbox.')
  }

  if (confirmSent) return (
    <div className="mx-auto max-w-sm space-y-4 text-center">
      <h1 className="font-display text-2xl font-extrabold">Check your email</h1>
      <p className="text-sm text-fog">
        We sent a confirmation link to <span className="text-paper">{email}</span>.
        Click it, then sign in. Nothing arriving? Check spam, or resend below.
      </p>
      <p aria-live="polite">
        {err && <span className="text-sm text-loss">{err}</span>}
        {info && <span className="text-sm text-gain">{info}</span>}
      </p>
      <button disabled={busy} onClick={resend}
        className="w-full rounded-lg border border-edge py-2.5 text-sm font-semibold hover:border-stage disabled:opacity-50">
        Resend confirmation email
      </button>
      <button onClick={() => { setConfirmSent(false); setMode('signin'); setInfo(null) }}
        className="text-sm text-fog hover:text-paper">Back to sign in</button>
    </div>
  )

  const input = 'w-full rounded-lg border border-edge bg-ink px-3 py-2.5 text-sm outline-none focus:border-stage'

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-extrabold">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>
        <span className="rounded-full border border-stage/50 bg-stage/10 px-2 py-0.5 text-[11px] font-semibold text-stage">
          Private Columbus Beta
        </span>
      </div>
      <p className="text-sm text-fog">
        Every trader starts Season 1 with $10,000 in <span className="text-paper">simulated cash</span>.
        No real money, no deposits, no securities, and nothing to buy.{' '}
        <Link to="/how-it-works" className="text-stage underline underline-offset-4">How it works</Link>
        {' · '}
        <Link to="/terms" className="text-stage underline underline-offset-4">Terms</Link>
      </p>

      {googleEnabled !== false && (
      <>
      <button onClick={google} disabled={busy || googleEnabled === null} type="button"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-edge bg-panel py-2.5 text-sm font-semibold hover:border-stage disabled:opacity-50">
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs text-fog">
        <span className="h-px flex-1 bg-edge" />or use email<span className="h-px flex-1 bg-edge" />
      </div>
      </>
      )}

      <form onSubmit={submit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <input className={input} placeholder="Username (3-24 characters)" value={username}
              maxLength={24} autoComplete="username" aria-label="Username"
              onChange={e => setUsername(e.target.value)} />
            <p aria-live="polite" className="mt-1 min-h-[1rem] text-xs">
              {nameCheck?.state === 'checking' && <span className="text-fog">Checking…</span>}
              {nameCheck?.state === 'free' && <span className="text-gain">{username.trim()} is available.</span>}
              {nameCheck?.state === 'taken' && <span className="text-loss">That username is taken.</span>}
              {nameCheck?.state === 'invalid' && <span className="text-fog">Letters, numbers, and . _ - only.</span>}
            </p>
          </div>
        )}
        <input className={input} type="email" placeholder="Email" value={email}
          autoComplete="email" aria-label="Email" onChange={e => setEmail(e.target.value)} />
        <div className="relative">
          <input className={`${input} pr-16`} type={showPw ? 'text' : 'password'}
            placeholder={mode === 'signup' ? 'Password (8+ characters)' : 'Password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            aria-label="Password"
            value={password} onChange={e => setPassword(e.target.value)} />
          <button type="button" onClick={() => setShowPw(s => !s)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 px-3 text-xs text-fog hover:text-paper">
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>
        {/* Stated persistently, not only as placeholder text that vanishes on first keystroke. */}
        {mode === 'signup' && (
          <p className="-mt-2 text-xs text-fog">Use at least 8 characters.</p>
        )}

        <p aria-live="polite" role="status">
          {err && <span className="text-sm text-loss">{err}</span>}
          {info && <span className="text-sm text-gain">{info}</span>}
        </p>

        <button type="submit" disabled={busy || (mode === 'signup' && nameCheck?.state === 'taken')}
          className="w-full rounded-lg bg-stage py-2.5 font-semibold text-ink disabled:opacity-50">
          {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <div className="flex justify-between text-sm">
        <button onClick={() => { setErr(null); setInfo(null); setMode(mode === 'signin' ? 'signup' : 'signin') }}
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
