import { useEffect, useState, lazy, Suspense } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette'

// The library is the landing page and holds the whole catalog in memory anyway, so it
// stays eager. Everything else splits — a first visit shouldn't download the glossary.
import Library from './pages/Library'

const Chain = lazy(() => import('./pages/Chain'))
const Plugins = lazy(() => import('./pages/Plugins'))
const Rack = lazy(() => import('./pages/Rack'))
const Compare = lazy(() => import('./pages/Compare'))
const Learn = lazy(() => import('./pages/Learn'))
const About = lazy(() => import('./pages/About'))
const NotFound = lazy(() => import('./pages/NotFound'))

const NAV = [
  { to: '/', label: 'Chains', end: true },
  { to: '/plugins', label: 'Plugins' },
  { to: '/rack', label: 'My rack' },
  { to: '/learn', label: 'Learn' },
  { to: '/about', label: 'About' },
]

export default function App() {
  const [cmdOpen, setCmdOpen] = useState(false)
  const location = useLocation()

  // Cmd/Ctrl+K anywhere, plus "/" as a bare shortcut — but never while the user is
  // typing into a field, where "/" is just a slash.
  useEffect(() => {
    function onKey(e) {
      const t = e.target
      const typing = t instanceof HTMLElement &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); setCmdOpen(o => !o); return
      }
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault(); setCmdOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const tab = ({ isActive }) =>
    'px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap pressable ' +
    (isActive ? 'bg-raised text-paper shadow-e1' : 'text-fog hover:text-paper')

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <a href="#main" className="skip-link">Skip to content</a>

      <header className="sticky top-0 z-20 border-b border-edge bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <NavLink to="/" className="font-display text-lg font-extrabold tracking-tight">
            Signal<span className="text-amber">·</span>Chain
          </NavLink>

          <button
            onClick={() => setCmdOpen(true)}
            // Distinct from the palette input's own label: two controls sharing one
            // accessible name is ambiguous to a screen reader reading the page.
            aria-label="Open search"
            aria-keyshortcuts="Meta+K Control+K"
            className="pressable ml-auto mr-2 flex shrink-0 items-center gap-2 rounded-lg border border-edge bg-panel px-2.5 py-2 text-fog hover:border-edge2 hover:text-paper sm:mr-3 lg:min-w-[13rem]">
            <span aria-hidden="true">⌕</span>
            <span className="hidden text-sm sm:inline">Search chains, plugins…</span>
            <kbd className="ml-auto hidden rounded border border-edge px-1.5 py-0.5 font-mono text-[10px] text-mute sm:block">
              ⌘K
            </kbd>
          </button>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end} className={tab}>{n.label}</NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" key={location.pathname} className="animate-fadeup mx-auto max-w-5xl px-4 py-6">
        {/* Keyed by path so navigating away clears a crashed page instead of pinning the error. */}
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<div className="py-20 text-center text-sm text-mute">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Library />} />
              <Route path="/chain/:slug" element={<Chain />} />
              <Route path="/plugins" element={<Plugins />} />
              <Route path="/rack" element={<Rack />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-edge bg-ink/95 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        {NAV.filter(n => n.to !== '/about').map(n => (
          <NavLink key={n.to} to={n.to} end={n.end} className={tab}>{n.label}</NavLink>
        ))}
      </nav>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}
