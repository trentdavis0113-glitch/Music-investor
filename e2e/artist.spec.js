import { test, expect } from '@playwright/test'

const REF = 'uajheoltstvftdmnigaw'
const UID = '11111111-2222-4333-8444-555555555555'

const MARKET = [
  { id: 1, name: 'Nova Reign', symbol: 'NOVA', genre: 'Hip-Hop', image_url: null, metrics_verified: true, latest: 25, pct: 6.42, gap: 8.1, spark: [24, 25] },
  { id: 2, name: 'Glasshouse', symbol: 'GLAS', genre: 'Indie', image_url: null, metrics_verified: false, latest: 10, pct: -2.31, gap: -4, spark: [11, 10] },
  { id: 3, name: 'Mira Vale', symbol: 'MIRA', genre: 'Hip-Hop', image_url: null, metrics_verified: true, latest: 40, pct: 3.11, gap: 1.4, spark: [39, 40] },
]

const ARTIST = {
  id: 1, name: 'Nova Reign', symbol: 'NOVA', genre: 'Hip-Hop', image_url: null,
  bio: 'Producer and vocalist.', is_active: true, claimed_by: null,
}

function history(n = 40, start = 20, end = 25) {
  const now = Date.now()
  const points = Array.from({ length: n }, (_, i) => ({
    t: now - (n - 1 - i) * 3600_000,
    p: +(start + ((end - start) * i) / (n - 1)).toFixed(2),
  }))
  const ps = points.map(p => p.p)
  return {
    points, first: ps[0], last: ps[ps.length - 1],
    high: Math.max(...ps), low: Math.min(...ps),
    samples: n * 4, last_ts: new Date(points[n - 1].t).toISOString(),
  }
}

const HOLDERS = {
  holders: 7, shares_held: 1200, private_count: 5,
  public: [
    { username: 'reverbkid', shares: 620, avatar_url: null },
    { username: 'tapedeck', shares: 410, avatar_url: null },
  ],
}

/**
 * A stateful backend stand-in.
 *
 * Trades mutate cash and holdings here, so the tests exercise the real post-trade
 * refresh path — the page has to re-read the server and show the new numbers, rather
 * than a fixed response making any implementation look correct.
 */
function server(opts = {}) {
  const s = {
    cash: opts.cash ?? 10_000,
    shares: opts.shares ?? 0,
    avgCost: opts.avgCost ?? 0,
    watched: opts.watched ?? false,
    market: opts.market ?? MARKET,
    holders: opts.holders ?? HOLDERS,
    history: opts.history ?? history(),
    artistMissing: opts.artistMissing ?? false,
    artistError: opts.artistError ?? false,
    tradeError: opts.tradeError ?? null,      // { message } -> definitive rejection
    tradeHang: opts.tradeHang ?? false,       // network-style failure
    txns: [],
    calls: { trade: [], watchUpsert: 0, watchDelete: 0, history: [], market: 0 },
  }
  return s
}

async function mount(page, s, { signedIn = true } = {}) {
  await page.addInitScript(([ref, uid, on]) => {
    if (on) {
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
        access_token: 'test', token_type: 'bearer', expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'test',
        user: { id: uid, email: 't@example.invalid', aud: 'authenticated', role: 'authenticated' },
      }))
    }
    localStorage.setItem('howstrip', 'closed')
  }, [REF, UID, signedIn])

  await page.route('**/*.supabase.co/**', async route => {
    const req = route.request()
    const url = req.url()
    const body = (() => { try { return JSON.parse(req.postData() || '{}') } catch { return {} } })()
    const json = b => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) })

    if (url.includes('/rpc/market_overview')) { s.calls.market++; return json(s.market) }
    if (url.includes('/auth/v1/settings')) return json({ external: { google: true } })
    if (url.includes('/auth/v1/user')) return json({ id: UID, email: 't@example.invalid' })

    if (url.includes('/rpc/artist_history')) { s.calls.history.push(body.p_range); return json(s.history) }
    if (url.includes('/rpc/top_holders')) return json(s.holders)
    if (url.includes('/rpc/artist_pressure')) return json({ net_shares: 420, trades: 11, traders: 4 })
    if (url.includes('/rpc/ensure_account')) return json({ season_id: 1, cash: s.cash })
    if (url.includes('/rpc/get_achievements')) return json([])
    if (url.includes('/rpc/touch_streak')) return json({ streak: 0 })

    if (url.includes('/rpc/execute_trade')) {
      s.calls.trade.push(body)
      if (s.tradeHang) return route.abort('connectionfailed')
      if (s.tradeError) {
        return route.fulfill({ status: 400, contentType: 'application/json',
          body: JSON.stringify({ message: s.tradeError }) })
      }
      // Replay protection, exactly as the SQL function does it.
      const prior = s.txns.find(t => t.client_token && t.client_token === body.p_token)
      if (prior) return json({ ...prior, replayed: true })

      const price = s.market.find(a => a.id === 1)?.latest ?? null
      const n = Number(body.p_shares)
      const total = +(n * price).toFixed(2)
      if (body.p_side === 'buy') {
        s.avgCost = (s.avgCost * s.shares + total) / (s.shares + n)
        s.shares += n; s.cash = +(s.cash - total).toFixed(2)
      } else {
        s.shares -= n; s.cash = +(s.cash + total).toFixed(2)
      }
      const tx = { side: body.p_side, shares: n, price, total,
                   ts: new Date().toISOString(), client_token: body.p_token }
      s.txns.unshift(tx)
      return json(tx)
    }

    if (url.includes('/artists')) {
      if (s.artistError) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' })
      return json(s.artistMissing ? null : ARTIST)
    }
    if (url.includes('/metric_snapshots')) return json([
      { popularity: 61, followers: 412_800, captured_at: new Date().toISOString() },
      { popularity: 59, followers: 396_100, captured_at: new Date(Date.now() - 8 * 864e5).toISOString() },
    ])
    if (url.includes('/artist_updates')) return json([])
    if (url.includes('/watchlists')) {
      if (req.method() === 'POST') { s.calls.watchUpsert++; s.watched = true; return json([]) }
      if (req.method() === 'DELETE') { s.calls.watchDelete++; s.watched = false; return json([]) }
      return json(s.watched ? [{ artist_id: 1 }] : [])
    }
    if (url.includes('/holdings')) {
      if (url.includes('artist_id=eq.')) {
        return json(s.shares > 0 ? [{ shares: s.shares, avg_cost: s.avgCost }] : [])
      }
      return json(s.shares > 0 ? [{ artist_id: 1, shares: s.shares }] : [])
    }
    if (url.includes('/transactions')) return json(s.txns.slice(0, 5))
    if (url.includes('/seasons')) return json({ starting_bankroll: 10_000 })
    if (url.includes('/profiles')) return json({ username: 'tester', is_public: false, is_admin: false })
    return json([])
  })
}

async function open(page, s, opts) {
  await mount(page, s, opts)
  await page.goto('/artist/1')
  await expect(page.getByRole('heading', { name: /Nova Reign/ })).toBeVisible()
}

const trade = page => page.getByRole('region', { name: 'Trade' })

/* ------------------------------------------------------------------ display */

test.describe('the artist page states only what the data supports', () => {
  test('shows the same price as the market aggregate, not a charted one', async ({ page }) => {
    const s = server()
    // The chart history deliberately ends somewhere else; the headline must follow the
    // market payload, which is what the ticker and market list also read.
    s.history = history(40, 20, 22.75)
    await open(page, s)
    await expect(page.getByRole('region', { name: 'Simulated price' })).toContainText('$25.00')
    // The chart still reports its own last recorded point, and says the headline is newer.
    await expect(page.getByRole('region', { name: /price history/i }))
      .toContainText('the headline price above is more recent than the last chart point')
  })

  test('an artist with no market price cannot be traded, and never reads $0.00', async ({ page }) => {
    const s = server({ market: MARKET.map(a => a.id === 1 ? { ...a, latest: null, pct: null, gap: null } : a) })
    await open(page, s)

    await expect(page.getByText('Price unavailable')).toBeVisible()
    await expect(page.getByRole('status')).toContainText('no recent market price')
    await expect(trade(page).getByRole('button', { name: /^Buy/ })).toBeDisabled()
    await expect(trade(page)).toContainText('No current price for this artist')
    await expect(page.locator('body')).not.toContainText('$0.00')
  })

  test('the chart carries a text alternative and honest sampling counts', async ({ page }) => {
    const s = server()
    await open(page, s)
    const chart = page.getByRole('region', { name: /price history/i })
    await expect(chart.locator('.sr-only').first())
      .toContainText(/started at \$20\.00, ended at \$25\.00/)
    await expect(chart).toContainText('Sampled from 160 recorded prices')
  })

  test('says so plainly when a range has too little history', async ({ page }) => {
    const s = server({ history: { points: [{ t: Date.now(), p: 25 }], first: 25, last: 25, high: 25, low: 25, samples: 1 } })
    await open(page, s)
    await expect(page.getByText('Not enough recorded price history for this range yet.')).toBeVisible()
  })

  test('switching range refetches that range rather than resampling locally', async ({ page }) => {
    const s = server()
    await open(page, s)
    await page.getByRole('button', { name: '1D', exact: true }).click()
    await expect.poll(() => s.calls.history).toContain('1D')
    await page.getByRole('button', { name: 'All', exact: true }).click()
    await expect.poll(() => s.calls.history).toContain('ALL')
    await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })

  test('never uses valuation or recommendation language', async ({ page }) => {
    const s = server({ shares: 100, avgCost: 20 })
    await open(page, s)
    const text = await page.locator('main, body').first().innerText()
    expect(text).not.toMatch(/undervalued|overvalued|strong buy|low risk|guaranteed|AI pick|bargain/i)
    await expect(page.getByRole('region', { name: 'Artist intelligence' }))
      .toContainText('below the price its listener count implies')
  })

  test('counts private backers without naming them', async ({ page }) => {
    const s = server()
    await open(page, s)
    const backers = page.getByRole('region', { name: 'Top backers' })
    await expect(backers).toContainText('reverbkid')
    await expect(backers).toContainText('Plus 5 traders with private portfolios')
    // Only the two public holders are named, never the five private ones.
    await expect(backers.getByRole('link')).toHaveCount(2)
  })

  test('handles an artist that does not exist', async ({ page }) => {
    const s = server({ artistMissing: true })
    await mount(page, s)
    await page.goto('/artist/999')
    await expect(page.getByText('Nothing trades here.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to market' })).toBeVisible()
  })

  test('offers a retry when the artist fails to load', async ({ page }) => {
    const s = server({ artistError: true })
    await mount(page, s)
    await page.goto('/artist/1')
    await expect(page.getByText("Couldn't load this artist.")).toBeVisible()
    s.artistError = false
    await page.getByRole('button', { name: /try again/i }).click()
    await expect(page.getByRole('heading', { name: /Nova Reign/ })).toBeVisible()
  })
})

/* ---------------------------------------------------------------- watchlist */

test.describe('watchlist', () => {
  test('adds, then removes, and reflects each immediately', async ({ page }) => {
    const s = server()
    await open(page, s)
    const star = page.getByRole('button', { name: /watchlist/ })

    await expect(star).toHaveAttribute('aria-pressed', 'false')
    await star.click()
    await expect(star).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => s.calls.watchUpsert).toBe(1)

    await star.click()
    await expect(star).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => s.calls.watchDelete).toBe(1)
  })

  test('an already-watched artist is not added twice', async ({ page }) => {
    const s = server({ watched: true })
    await open(page, s)
    const star = page.getByRole('button', { name: /watchlist/ })
    await expect(star).toHaveAttribute('aria-pressed', 'true')
    expect(s.calls.watchUpsert).toBe(0)
  })

  test('is not offered to signed-out visitors', async ({ page }) => {
    const s = server()
    await open(page, s, { signedIn: false })
    await expect(page.getByRole('button', { name: /watchlist/ })).toHaveCount(0)
  })
})

/* -------------------------------------------------------------------- trade */

test.describe('the trade workflow', () => {
  test('a buy updates cash, holdings and the market store', async ({ page }) => {
    const s = server({ cash: 10_000 })
    await open(page, s)
    const startMarketCalls = s.calls.market

    await trade(page).getByLabel('Shares').fill('20')
    await expect(trade(page)).toContainText('$500.00')          // 20 x $25 estimate
    await trade(page).getByRole('button', { name: /^Buy 20 shares/ }).click()

    const receipt = page.getByRole('status').filter({ hasText: 'Purchased' })
    await expect(receipt).toContainText('Purchased 20 shares of Nova Reign at $25.00 per share for $500.00')

    // The page re-read the server rather than patching local state optimistically.
    await expect(page.getByRole('region', { name: 'Your position' })).toContainText('20 sh')
    await expect.poll(() => s.calls.market).toBeGreaterThan(startMarketCalls)
    expect(s.cash).toBe(9500)
  })

  test('a sell reduces the position and returns cash', async ({ page }) => {
    const s = server({ cash: 1000, shares: 50, avgCost: 20 })
    await open(page, s)

    await trade(page).getByRole('button', { name: 'sell', exact: true }).click()
    await trade(page).getByLabel('Shares').fill('30')
    await expect(trade(page)).toContainText('Estimated proceeds')
    await trade(page).getByRole('button', { name: /^Sell 30 shares/ }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Sold' }))
      .toContainText('Sold 30 shares of Nova Reign at $25.00 per share for $750.00')
    await expect(page.getByRole('region', { name: 'Your position' })).toContainText('20 sh')
    expect(s.cash).toBe(1750)
  })

  test('the receipt reports what the backend executed, not the pre-submit estimate', async ({ page }) => {
    const s = server({ cash: 10_000 })
    await open(page, s)
    await trade(page).getByLabel('Shares').fill('10')
    await expect(trade(page)).toContainText('$250.00')

    // The price moves between quote and execution, as it can in production.
    s.market = MARKET.map(a => a.id === 1 ? { ...a, latest: 26.4 } : a)
    await trade(page).getByRole('button', { name: /^Buy 10 shares/ }).click()

    await expect(page.getByRole('status').filter({ hasText: 'Purchased' }))
      .toContainText('at $26.40 per share for $264.00')
  })

  test('blocks a buy beyond available cash before anything is sent', async ({ page }) => {
    const s = server({ cash: 100 })
    await open(page, s)
    await trade(page).getByLabel('Shares').fill('50')

    await expect(trade(page)).toContainText('That costs more than your available simulated cash.')
    await expect(trade(page).getByRole('button', { name: /^Buy 50 shares/ })).toBeDisabled()
    // No impossible balance is projected for a trade that cannot happen.
    await expect(trade(page).getByText('Cash after')).toBeVisible()
    await expect(trade(page).locator('dl#quote-line')).toContainText('—')
    expect(s.calls.trade).toHaveLength(0)
  })

  test('blocks a sell beyond shares held before anything is sent', async ({ page }) => {
    const s = server({ shares: 5, avgCost: 20 })
    await open(page, s)
    await trade(page).getByRole('button', { name: 'sell', exact: true }).click()
    await trade(page).getByLabel('Shares').fill('40')

    await expect(trade(page)).toContainText('You do not hold that many shares.')
    await expect(trade(page).getByRole('button', { name: /^Sell 40 shares/ })).toBeDisabled()
    expect(s.calls.trade).toHaveLength(0)
  })

  test('a double submit executes once', async ({ page }) => {
    const s = server({ cash: 10_000 })
    await open(page, s)
    // Two clicks in the same tick, before React can re-render — an impatient double tap,
    // not two considered presses.
    await trade(page).getByRole('button', { name: /^Buy 10 shares/ }).evaluate(el => {
      el.click(); el.click()
    })
    await expect(page.getByRole('status').filter({ hasText: 'Purchased' })).toBeVisible()
    expect(s.calls.trade).toHaveLength(1)
    expect(s.cash).toBe(9750)
  })

  test('surfaces a backend rejection in plain language and does not execute', async ({ page }) => {
    const s = server({ tradeError: 'Insufficient cash' })
    await open(page, s)
    await trade(page).getByRole('button', { name: /^Buy 10 shares/ }).click()
    await expect(page.getByRole('alert')).toContainText('You don’t have enough simulated cash for that.')
    await expect(page.getByRole('status').filter({ hasText: 'Purchased' })).toHaveCount(0)
  })

  // The server refuses a delisted artist and a price that has stopped updating. Those
  // are reachable by calling the RPC directly, so the page has to explain them rather
  // than show raw SQL text.
  for (const [raw, shown] of [
    ['Artist is not trading', 'This artist is no longer trading, so the position can’t be changed.'],
    ['Stale market price for this artist', 'This artist’s price hasn’t updated recently, so trading is paused until it does.'],
    ['Rate limit: max 20 trades per minute', 'That’s a lot of trades in a short time. Wait a moment and try again.'],
  ]) {
    test(`explains "${raw}" in plain language`, async ({ page }) => {
      const s = server({ tradeError: raw })
      await open(page, s)
      await trade(page).getByRole('button', { name: /^Buy 10 shares/ }).click()
      await expect(page.getByRole('alert')).toContainText(shown)
    })
  }

  test('signed-out visitors are invited to sign in, not shown a trade form', async ({ page }) => {
    const s = server()
    await open(page, s, { signedIn: false })
    await expect(trade(page).getByRole('link', { name: 'Sign in' })).toBeVisible()
    await expect(trade(page).getByLabel('Shares')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Your position' })).toHaveCount(0)
  })
})

/* ------------------------------------------------------- ambiguous outcomes */

test.describe('an unconfirmed trade is never silently repeated', () => {
  test('offers a safe status check instead of auto-retrying', async ({ page }) => {
    const s = server({ cash: 10_000, tradeHang: true })
    await open(page, s)
    await trade(page).getByRole('button', { name: /^Buy 10 shares/ }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('could not confirm whether that went through')
    await expect(alert).toContainText('will not trade twice')
    // One attempt, and no automatic second one.
    await page.waitForTimeout(1200)
    expect(s.calls.trade).toHaveLength(1)

    // "Check status" replays the SAME token, so a trade the server did execute comes
    // back as the original rather than being duplicated.
    s.tradeHang = false
    await alert.getByRole('button', { name: 'Check status' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Purchased' })).toBeVisible()
    expect(s.calls.trade).toHaveLength(2)
    expect(s.calls.trade[0].p_token).toBe(s.calls.trade[1].p_token)
    expect(s.calls.trade[0].p_token).toBeTruthy()
    expect(s.cash).toBe(9750)   // charged once
  })

  test('a replayed token reports the original trade and says it was not repeated', async ({ page }) => {
    const s = server({ cash: 10_000 })
    await open(page, s)
    await trade(page).getByRole('button', { name: /^Buy 10 shares/ }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Purchased' })).toBeVisible()
    const token = s.calls.trade[0].p_token

    // Replay it directly, as a recovering client would.
    const replay = await page.evaluate(async ([url, key, tok]) => {
      const r = await fetch(`${url}/rest/v1/rpc/execute_trade`, {
        method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_artist_id: 1, p_side: 'buy', p_shares: 10, p_token: tok }),
      })
      return r.json()
    }, [`https://${REF}.supabase.co`, 'test', token])

    expect(replay.replayed).toBe(true)
    expect(replay.total).toBe(250)
    expect(s.cash).toBe(9750)   // still charged only once
  })

  test('a definitive rejection starts a fresh intent rather than reusing the token', async ({ page }) => {
    const s = server({ tradeError: 'Insufficient cash' })
    await open(page, s)
    const btn = trade(page).getByRole('button', { name: /^Buy 10 shares/ })

    await btn.click()
    await expect(page.getByRole('alert')).toBeVisible()
    s.tradeError = null
    await btn.click()
    await expect(page.getByRole('status').filter({ hasText: 'Purchased' })).toBeVisible()

    expect(s.calls.trade).toHaveLength(2)
    expect(s.calls.trade[0].p_token).not.toBe(s.calls.trade[1].p_token)
  })
})

/* ------------------------------------------------------------ accessibility */

test.describe('accessibility', () => {
  test('a trade can be completed with the keyboard alone', async ({ page }) => {
    const s = server({ cash: 10_000 })
    await open(page, s)

    const qty = trade(page).getByLabel('Shares')
    await qty.focus()
    await qty.fill('15')

    // Tab forward until the submit button has focus, then activate it with the keyboard.
    const submit = trade(page).getByRole('button', { name: /^Buy 15 shares/ })
    for (let i = 0; i < 12 && !(await submit.evaluate(el => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab')
    }
    await expect(submit).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('status').filter({ hasText: 'Purchased' })).toBeVisible()
    expect(s.calls.trade).toHaveLength(1)
  })

  test('the confirmation is announced and takes focus', async ({ page }) => {
    const s = server({ cash: 10_000 })
    await open(page, s)
    await trade(page).getByRole('button', { name: /^Buy 10 shares/ }).click()

    const receipt = page.getByRole('status').filter({ hasText: 'Purchased' })
    await expect(receipt).toHaveAttribute('aria-live', 'polite')
    await expect(receipt).toBeFocused()
  })

  test('gain and loss are readable without colour', async ({ page }) => {
    const s = server({ shares: 100, avgCost: 20 })
    await open(page, s)
    const pos = page.getByRole('region', { name: 'Your position' })
    await expect(pos).toContainText('+25.00%')            // sign, not colour alone
    await expect(pos.locator('.sr-only').first()).toContainText('up 25.00')
  })

  test('range buttons report their pressed state', async ({ page }) => {
    const s = server()
    await open(page, s)
    await expect(page.getByRole('button', { name: '1W', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: '1M', exact: true })).toHaveAttribute('aria-pressed', 'false')
  })

  test('respects reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const s = server()
    await open(page, s)
    const duration = await page.getByRole('heading', { name: /Nova Reign/ })
      .evaluate(el => getComputedStyle(el).transitionDuration)
    expect(parseFloat(duration)).toBeLessThan(0.02)
  })

  test('the trade controls meet the touch target minimum', async ({ page }) => {
    const s = server({ cash: 10_000 })
    await open(page, s)
    for (const name of [/^Buy 10 shares/, /^buy$/i, /^sell$/i]) {
      const box = await trade(page).getByRole('button', { name }).first().boundingBox()
      expect(box.height).toBeGreaterThanOrEqual(40)
    }
    const qty = await trade(page).getByLabel('Shares').boundingBox()
    expect(qty.height).toBeGreaterThanOrEqual(44)
  })
})
