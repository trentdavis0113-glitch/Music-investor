import { useEffect, useState, createContext, useContext, lazy, Suspense } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Ticker from './components/Ticker'
import ErrorBoundary from './components/ErrorBoundary'
import { SkeletonRows } from './components/States'

// Market is the landing page and uses a hand-rolled SVG sparkline, so it stays eager.
import Market from './pages/Market'

// Everything else is split out. recharts alone is 375 kB (103 kB gzipped) — larger than
// React and Supabase combined — and only Artist, Portfolio and Studio use it. Importing
// them statically meant every visitor downloaded the charting library to look at the
// market list, which never renders a chart.
const Artist = lazy(() => import('./pages/Artist'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const Auth = lazy(() => import('./pages/Auth'))
const ForArtists = lazy(() => import('./pages/ForArtists'))
const Studio = lazy(() => import('./pages/Studio'))
const Admin = lazy(() => import('./pages/Admin'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))
const Trader = lazy(() => import('./pages/Trader'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Terms = lazy(() => import('./pages/Terms'))

const SessionCtx = createContext(null)
const MetaCtx = createContext({ ownsArtist: false, isAdmin: false })
const AuthReadyCtx = createContext(false)
export const useSession = () => useContext(SessionCtx)
export const useMeta = () => useContext(MetaCtx)
/** False until the initial getSession() resolves, so pages can tell "signed out" from "still checking". */
export const useAuthReady = () => useContext(AuthReadyCtx)

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [meta, setMeta] = useState({ ownsArtist: false, isAdmin: false, streak: 0 })
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) localStorage.setItem('greenroom_ref', ref)

    // A failed OAuth attempt comes back as ?error=/#error= on whatever URL Supabase was
    // configured to return to — not as a rejected promise from signInWithOAuth(), which
    // only navigates the browser. Without this the user lands on a random page with no
    // explanation at all. Stash it and send them somewhere that can show it.
    const q = new URLSearchParams(window.location.search)
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const authError =
      q.get('error_description') || h.get('error_description') ||
      q.get('error') || h.get('error')
    if (authError) {
      sessionStorage.setItem('greenroom_auth_error', authError)
      window.history.replaceState({}, '', window.location.pathname)
      navigate('/auth', { replace: true })
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setAuthReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setMeta({ ownsArtist: false, isAdmin: false, streak: 0 }); return }

    // OAuth signups never reach the signup Edge Function, so a ?ref= invite would go
    // unattributed. claim_referral is one-shot and ignores an already-attributed profile,
    // so running it for every sign-in is safe. Clearing the key also stops a stale invite
    // from following a later account on a shared device.
    const invite = localStorage.getItem('greenroom_ref')
    if (invite) {
      supabase.rpc('claim_referral', { p_ref: invite })
        .then(() => localStorage.removeItem('greenroom_ref'))
        .catch(() => {})
    }

    Promise.all([
      supabase.from('artists').select('id').eq('claimed_by', session.user.id).limit(1),
      supabase.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle(),
      supabase.rpc('touch_streak')
    ]).then(([a, p, st]) => {
      setMeta({
        ownsArtist: (a.data || []).length > 0,
        isAdmin: !!p.data?.is_admin,
        streak: st.data?.streak ?? 0
      })
    })
  }, [session])

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  const tab = ({ isActive }) =>
    'px-3 py-2 text-sm font-medium rounded-lg transition-colors ' +
    (isActive ? 'bg-panel text-paper' : 'text-fog hover:text-paper')

  return (
    <SessionCtx.Provider value={session}>
      <AuthReadyCtx.Provider value={authReady}>
      <MetaCtx.Provider value={meta}>
        <div className="min-h-screen pb-20 sm:pb-0">
          <a href="#main" className="skip-link">Skip to content</a>
          <Ticker />
          <header className="sticky top-0 z-20 border-b border-edge bg-ink/95 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <NavLink to="/" className="font-display text-lg font-extrabold tracking-tight">
                Greenroom<span className="text-stage">.</span>Exchange
              </NavLink>
              <nav className="hidden items-center gap-1 sm:flex">
                <NavLink to="/" end className={tab}>Market</NavLink>
                <NavLink to="/portfolio" className={tab}>Portfolio</NavLink>
                <NavLink to="/leaderboard" className={tab}>Leaderboard</NavLink>
                <NavLink to="/how-it-works" className={tab}>How it works</NavLink>
                {meta.ownsArtist
                  ? <NavLink to="/studio" className={tab}>Studio</NavLink>
                  : <NavLink to="/for-artists" className={tab}>For artists</NavLink>}
                {meta.isAdmin && <NavLink to="/admin" className={tab}>Claims</NavLink>}
                {/* Held back until auth resolves: a returning user used to see "Sign in" flash first. */}
                {!authReady ? (
                  <span className="ml-2 h-9 w-20 rounded-lg bg-panel/60" aria-hidden="true" />
                ) : session ? (
                  <button onClick={signOut} className="px-3 py-2 text-sm text-fog hover:text-paper">Sign out</button>
                ) : (
                  <NavLink to="/auth" className="ml-2 rounded-lg bg-stage px-3 py-2 text-sm font-semibold text-ink">Sign in</NavLink>
                )}
              </nav>
            </div>
          </header>

          <main id="main" key={location.pathname} className="animate-fadeup mx-auto max-w-5xl px-4 py-6">
            {/* Keyed by path so navigating away clears a crashed page instead of pinning the error. */}
            <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<SkeletonRows rows={5} />}>
            <Routes>
              <Route path="/" element={<Market />} />
              <Route path="/artist/:id" element={<Artist />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/for-artists" element={<ForArtists />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/reset" element={<ResetPassword />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/trader/:username" element={<Trader />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </ErrorBoundary>
          </main>

          <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-edge bg-ink/95 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
            <NavLink to="/" end className={tab}>Market</NavLink>
            <NavLink to="/portfolio" className={tab}>Portfolio</NavLink>
            <NavLink to="/leaderboard" className={tab}>Ranks</NavLink>
            {meta.ownsArtist
              ? <NavLink to="/studio" className={tab}>Studio</NavLink>
              : meta.isAdmin
                ? <NavLink to="/admin" className={tab}>Claims</NavLink>
                : !authReady
                  ? <span className={tab({ isActive: false })} aria-hidden="true">&nbsp;</span>
                  : <NavLink to={session ? '/for-artists' : '/auth'} className={tab}>{session ? 'Artists' : 'Sign in'}</NavLink>}
          </nav>
        </div>
      </MetaCtx.Provider>
      </AuthReadyCtx.Provider>
    </SessionCtx.Provider>
  )
}
