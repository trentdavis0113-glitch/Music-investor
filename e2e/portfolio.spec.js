import { test, expect } from '@playwright/test'

const REF = 'uajheoltstvftdmnigaw'
const UID = '11111111-2222-4333-8444-555555555555'

const MARKET = [
  { id: 1, name: 'Nova Reign', symbol: 'NOVA', genre: 'Hip-Hop', image_url: null, metrics_verified: true, latest: 25, pct: 6.42, gap: 8.1, spark: [24, 25] },
  { id: 2, name: 'Glasshouse', symbol: 'GLAS', genre: 'Indie', image_url: null, metrics_verified: false, latest: 10, pct: -2.31, gap: -4, spark: [11, 10] },
  { id: 3, name: 'Mira Vale', symbol: 'MIRA', genre: 'R&B', image_url: null, metrics_verified: true, latest: 40, pct: 3.11, gap: 1.4, spark: [39, 40] },
]

// 100 @ 20 -> 25 = 2500 value, 2000 cost, +500 (+25%)
// 50  @ 12 -> 10 =  500 value,  600 cost, -100 (-16.67%)
// cash 1000 -> total 4000, invested 3000, season start 10000
const MULTI = [
  { artist_id: 1, shares: 100, avg_cost: 20 },
  { artist_id: 2, shares: 50, avg_cost: 12 },
]

function snaps(n = 10) {
  return Array.from({ length: n }, (_, i) => ({
    snap_date: new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10),
    value: (3800 + i * 20).toFixed(2),
  }))
}

async function signedIn(page, {
  holdings = MULTI, cash = 1000, transactions = [], snapshots = snaps(), fail = false, capture,
} = {}) {
  await page.addInitScript(([ref, uid]) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
      access_token: 'test', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'test',
      user: { id: uid, email: 't@example.invalid', aud: 'authenticated', role: 'authenticated' },
    }))
    localStorage.setItem('howstrip', 'closed')
  }, [REF, UID])

  await page.route('**/*.supabase.co/**', route => {
    const url = route.request().url()
    capture?.(url)
    const json = b => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) })

    if (url.includes('/rpc/market_overview')) return json(MARKET)
    if (url.includes('/auth/v1/settings')) return json({ external: { google: true } })
    if (url.includes('/auth/v1/user')) return json({ id: UID, email: 't@example.invalid' })
    if (url.includes('/rpc/ensure_account')) {
      return fail
        ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'boom' }) })
        : json({ season_id: 1, cash })
    }
    if (url.includes('/rpc/get_achievements')) return json([])
    if (url.includes('/rpc/touch_streak')) return json({ streak: 0 })
    if (url.includes('/seasons')) return json({ starting_bankroll: 10000 })
    if (url.includes('/holdings')) return json(holdings)
    if (url.includes('/portfolio_snapshots')) return json(snapshots)
    if (url.includes('/transactions')) return json(transactions)
    if (url.includes('/profiles')) return json({ username: 'tester', is_public: false, is_admin: false })
    return json([])
  })
}

// The header <section> is labelled by its own <h1>, so it exposes as a named region.
const header = page => page.getByRole('region', { name: 'Total simulated value' })

test('shows total value, cash and invested that reconcile', async ({ page }) => {
  await signedIn(page)
  await page.goto('/portfolio')

  // 1000 cash + 2500 + 500 invested = 4000. Scoped to the header: cash also appears
  // in the allocation list, which is correct but ambiguous for a bare text match.
  const h = header(page)
  await expect(h).toContainText('$4,000.00')
  await expect(h).toContainText('$1,000.00')   // cash
  await expect(h).toContainText('$3,000.00')   // invested
})

test('season return is measured against the starting bankroll, not cost basis', async ({ page }) => {
  await signedIn(page)
  await page.goto('/portfolio')

  // 4000 - 10000 = -6000 (-60.00%). Cost-basis P/L would have been +400.
  const h = header(page)
  await expect(h).toContainText('$6,000.00')
  await expect(h).toContainText('60.00%')
})

test('scopes every query to the current season', async ({ page }) => {
  const urls = []
  await signedIn(page, { capture: u => urls.push(u) })
  await page.goto('/portfolio')
  await expect(page.getByText('$4,000.00')).toBeVisible()

  // Without season_id, a trader holding the same artist in two seasons would be
  // double-counted the moment Season 2 opens.
  const holdings = urls.find(u => u.includes('/holdings'))
  const snapshots = urls.find(u => u.includes('/portfolio_snapshots'))
  const txns = urls.find(u => u.includes('/transactions'))
  expect(holdings).toContain('season_id=eq.1')
  expect(snapshots).toContain('season_id=eq.1')
  expect(txns).toContain('season_id=eq.1')
})

test('requests snapshots newest-first so the chart cannot freeze on old data', async ({ page }) => {
  const urls = []
  await signedIn(page, { capture: u => urls.push(u) })
  await page.goto('/portfolio')
  await expect(page.getByText('$4,000.00')).toBeVisible()

  // Ascending + limit returns the OLDEST rows, which would have stopped advancing.
  const snapshots = urls.find(u => u.includes('/portfolio_snapshots'))
  expect(snapshots).toContain('order=snap_date.desc')
})

test('excludes a fully sold position', async ({ page }) => {
  await signedIn(page, { holdings: [...MULTI, { artist_id: 3, shares: 0, avg_cost: 30 }] })
  await page.goto('/portfolio')

  await expect(page.getByRole('region', { name: 'Your holdings' })).toContainText('Holdings')
  await expect(page.getByRole('region', { name: 'Your holdings' })).not.toContainText('Mira Vale')
})

test('names the strongest and weakest positions by return', async ({ page }) => {
  await signedIn(page)
  await page.goto('/portfolio')

  const highlights = page.getByRole('region', { name: 'Position highlights' })
  await expect(highlights).toContainText('Strongest position')
  await expect(highlights).toContainText('Nova Reign')       // +25%
  await expect(highlights).toContainText('Weakest position')
  await expect(highlights).toContainText('Glasshouse')       // -16.67%
})

test('calls the lowest performer a smallest gain when it is still up', async ({ page }) => {
  await signedIn(page, {
    holdings: [{ artist_id: 1, shares: 10, avg_cost: 20 }, { artist_id: 3, shares: 10, avg_cost: 39 }],
  })
  await page.goto('/portfolio')

  const highlights = page.getByRole('region', { name: 'Position highlights' })
  await expect(highlights).toContainText('Smallest gain')
  await expect(highlights).not.toContainText('Weakest position')
})

test('shows allocation totalling the whole portfolio including cash', async ({ page }) => {
  await signedIn(page)
  await page.goto('/portfolio')

  const alloc = page.getByRole('region', { name: 'Allocation' })
  await expect(alloc).toContainText('Cash')
  await expect(alloc).toContainText('63%')   // 2500 / 4000
  await expect(alloc).toContainText('25%')   // 1000 cash / 4000
})

test('states concentration as fact when one artist dominates', async ({ page }) => {
  await signedIn(page)
  await page.goto('/portfolio')

  const alloc = page.getByRole('region', { name: 'Allocation' })
  await expect(alloc).toContainText(/Nova Reign accounts for \d+% of your total simulated value/)
  // Educational, never advisory.
  await expect(alloc).not.toContainText(/should|recommend|consider selling/i)
})

test('a single holding does not claim a weakest position', async ({ page }) => {
  await signedIn(page, { holdings: [MULTI[0]] })
  await page.goto('/portfolio')

  const highlights = page.getByRole('region', { name: 'Position highlights' })
  await expect(highlights).toContainText('Strongest position')
  await expect(highlights).not.toContainText('Weakest position')
  await expect(highlights).not.toContainText('Smallest gain')
})

test('empty portfolio explains itself and routes back to the market', async ({ page }) => {
  await signedIn(page, { holdings: [], cash: 10000, snapshots: [] })
  await page.goto('/portfolio')

  await expect(page.getByText('You haven’t bought any artists yet.')).toBeVisible()
  await expect(page.getByText(/no real money is involved/i)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Explore the market' })).toBeVisible()
  // Suggestion lists must describe how they were built, not imply personalisation.
  await expect(page.getByText('Biggest movers today')).toBeVisible()
  await expect(page.getByText('Largest price change in either direction')).toBeVisible()
})

test('empty activity explains what a first trade will look like', async ({ page }) => {
  await signedIn(page, { holdings: [], cash: 10000, snapshots: [], transactions: [] })
  await page.goto('/portfolio')

  await expect(page.getByRole('region', { name: 'Recent activity' }))
    .toContainText('No trades yet this season')
})

test('recent activity reads in plain language', async ({ page }) => {
  await signedIn(page, {
    transactions: [
      { side: 'buy', shares: 100, price: 20, total: 2000, ts: new Date().toISOString(), artist_id: 1, artists: { name: 'Nova Reign', symbol: 'NOVA' } },
      { side: 'sell', shares: 5, price: 41, total: 205, ts: new Date().toISOString(), artist_id: 3, artists: { name: 'Mira Vale', symbol: 'MIRA' } },
    ],
  })
  await page.goto('/portfolio')

  const activity = page.getByRole('region', { name: 'Recent activity' })
  await expect(activity).toContainText('Bought')
  await expect(activity).toContainText('Sold')
  await expect(activity).toContainText('Nova Reign')
  await expect(activity).toContainText('$2,000.00')
})

test('gain and loss are not signalled by colour alone', async ({ page }) => {
  await signedIn(page)
  await page.goto('/portfolio')
  await expect(page.getByText('$4,000.00')).toBeVisible()

  // Every delta carries a direction glyph and a spoken form for screen readers.
  await expect(page.locator('text=▼').first()).toBeVisible()
  await expect(page.locator('.sr-only', { hasText: /down .* dollars/ }).first()).toBeAttached()
})

test('the chart offers only ranges the daily snapshots can support', async ({ page }) => {
  await signedIn(page)
  await page.goto('/portfolio')

  const chart = page.getByRole('region', { name: 'Portfolio performance' })
  await expect(chart.getByRole('button', { name: '1W' })).toBeVisible()
  // Snapshots are daily, so an intraday range would be a lie.
  await expect(chart.getByRole('button', { name: '1D' })).toHaveCount(0)
})

test('the chart has a text alternative', async ({ page }) => {
  await signedIn(page)
  await page.goto('/portfolio')

  // .first(): Delta also renders sr-only spans inside this region.
  await expect(page.getByRole('region', { name: 'Portfolio performance' })
    .locator('.sr-only').first()).toContainText(/Portfolio value over .*started at .*ended at/)
})

test('a failed load offers recovery rather than a blank page', async ({ page }) => {
  await signedIn(page, { fail: true })
  await page.goto('/portfolio')

  await expect(page.getByText("Couldn't load your portfolio.")).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})

test('does not scroll sideways and keeps artist names intact', async ({ page }) => {
  await signedIn(page)
  await page.goto('/portfolio')
  await expect(page.getByText('$4,000.00')).toBeVisible()

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  await expect(page.getByRole('region', { name: 'Your holdings' })).toContainText('Nova Reign')
})

test('holdings are reachable and operable by keyboard', async ({ page }) => {
  await signedIn(page)
  await page.goto('/portfolio')
  await expect(page.getByText('$4,000.00')).toBeVisible()

  const first = page.getByRole('region', { name: 'Your holdings' }).getByRole('link').first()
  await first.focus()
  await expect(first).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/artist\/\d+$/)
})

test('respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signedIn(page)
  await page.goto('/portfolio')
  await expect(page.getByText('$4,000.00')).toBeVisible()

  // Content is still fully present; only the movement is suppressed.
  await expect(page.getByRole('region', { name: 'Your holdings' })).toContainText('Nova Reign')
  const dur = await page.locator('main').evaluate(el => getComputedStyle(el).animationDuration)
  expect(parseFloat(dur)).toBeLessThan(0.05)
})
