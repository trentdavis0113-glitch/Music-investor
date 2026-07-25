import { test, expect } from '@playwright/test'

const ARTISTS = [
  { id: 1, name: 'Nova Reign', genre: 'Hip-Hop', image_url: null, symbol: 'NOVA',
    metrics_verified: true, latest: 24.5, pct: 3.2, gap: 5.1, spark: [23, 23.5, 24, 24.5] },
  { id: 2, name: 'Glasshouse', genre: 'Indie', image_url: null, symbol: 'GLAS',
    metrics_verified: false, latest: 11.25, pct: -1.4, gap: -2.0, spark: [12, 11.8, 11.4, 11.25] },
]

/** Serve the aggregated RPC and stub everything else Supabase-shaped. */
async function mockMarket(page, { rows = ARTISTS, fail = false, onCall } = {}) {
  await page.route('**/*.supabase.co/**', route => {
    const url = route.request().url()
    if (url.includes('/rpc/market_overview')) {
      onCall?.()
      if (fail) {
        return route.fulfill({
          status: 500, contentType: 'application/json',
          body: JSON.stringify({ message: 'boom' }),
        })
      }
      return route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify(rows),
      })
    }
    if (url.includes('/auth/v1/settings')) {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ external: { google: true } }),
      })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
}

test('the market renders from the aggregated endpoint', async ({ page }) => {
  await mockMarket(page)
  await page.goto('/')

  await expect(page.getByRole('link', { name: /Nova Reign/ })).toBeVisible()
  await expect(page.getByText('$24.50').first()).toBeVisible()
  await expect(page.getByText('+3.20%').first()).toBeVisible()
  await expect(page.getByText('-1.40%').first()).toBeVisible()
})

// The whole point of the shared store: Ticker and Market are both mounted on "/" and
// must not each run their own poll.
test('Ticker and Market share a single request', async ({ page }) => {
  let calls = 0
  await mockMarket(page, { onCall: () => { calls++ } })
  await page.goto('/')

  await expect(page.getByRole('link', { name: /Nova Reign/ })).toBeVisible()
  await page.waitForTimeout(1500)

  expect(calls).toBe(1)
})

test('the ticker shows live symbols from the same data', async ({ page }) => {
  await mockMarket(page)
  await page.goto('/')

  // Scoped to the marquee: the symbol also appears once in the market list row below.
  // The ticker duplicates its row for a seamless loop, so expect two of each in here.
  const marquee = page.locator('.marquee-track')
  await expect(marquee.getByText('$NOVA')).toHaveCount(2)
  await expect(marquee.getByText('$GLAS')).toHaveCount(2)
  await expect(marquee.getByText('$24.50')).toHaveCount(2)
})

test('a failed market load offers a retry rather than an empty market', async ({ page }) => {
  await mockMarket(page, { fail: true })
  await page.goto('/')

  await expect(page.getByText("Couldn't load the market.")).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  // "No artists listed yet." would be a lie here.
  await expect(page.getByText('No artists listed yet.')).toHaveCount(0)
})

test('search filters by name, symbol and genre', async ({ page }) => {
  await mockMarket(page)
  await page.goto('/')
  await expect(page.getByRole('link', { name: /Nova Reign/ })).toBeVisible()

  const search = page.getByPlaceholder('Search artists or genres')

  await search.fill('glas')
  await expect(page.getByRole('link', { name: /Glasshouse/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Nova Reign/ })).toHaveCount(0)

  await search.fill('Hip-Hop')
  await expect(page.getByRole('link', { name: /Nova Reign/ })).toBeVisible()

  await search.fill('$GLAS')
  await expect(page.getByRole('link', { name: /Glasshouse/ })).toBeVisible()

  await search.fill('nothing matches this')
  await expect(page.getByText('No artists match that search.')).toBeVisible()
})
