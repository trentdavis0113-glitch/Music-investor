import { test, expect } from '@playwright/test'

const ARTISTS = [
  { id: 1, name: 'Nova Reign', genre: 'Hip-Hop', image_url: null, symbol: 'NOVA',
    metrics_verified: true, latest: 24.5, pct: 6.2, gap: 5.1, spark: [23, 24, 24.5] },
  { id: 2, name: 'Glasshouse', genre: 'Indie', image_url: null, symbol: 'GLAS',
    metrics_verified: false, latest: 11.25, pct: -1.4, gap: -2, spark: [12, 11.5, 11.25] },
]

async function mock(page) {
  await page.route('**/*.supabase.co/**', route => {
    const u = route.request().url()
    if (u.includes('/rpc/market_overview')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ARTISTS) })
    }
    if (u.includes('/auth/v1/settings')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ external: { google: true } }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
}

const dialog = page => page.getByRole('dialog', { name: 'Search and commands' })

/** The global key listener is attached on mount, so wait for the app before pressing keys. */
async function ready(page) {
  await expect(page.getByRole('button', { name: 'Search artists or jump to a page' })).toBeVisible()
}

test('opens with the keyboard shortcut and closes on Escape', async ({ page }) => {
  await mock(page)
  await page.goto('/')
  await ready(page)

  await expect(dialog(page)).toHaveCount(0)
  await page.keyboard.press('Control+k')
  await expect(dialog(page)).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog(page)).toHaveCount(0)
})

test('opens from the visible header control, so it is discoverable without the shortcut', async ({ page }) => {
  await mock(page)
  await page.goto('/')
  await ready(page)

  await page.getByRole('button', { name: 'Search artists or jump to a page' }).click()
  await expect(dialog(page)).toBeVisible()
})

test('"/" opens it, but never while the user is typing', async ({ page }) => {
  await mock(page)
  await page.goto('/')
  await ready(page)

  await page.keyboard.press('/')
  await expect(dialog(page)).toBeVisible()
  await page.keyboard.press('Escape')

  // Inside a text field "/" is just a slash.
  const search = page.getByPlaceholder('Search artists or genres')
  await search.click()
  await search.type('hip/hop')
  await expect(dialog(page)).toHaveCount(0)
  await expect(search).toHaveValue('hip/hop')
})

test('searches artists and opens the highlighted one with Enter', async ({ page }) => {
  await mock(page)
  await page.goto('/')
  await ready(page)
  await page.keyboard.press('Control+k')

  await page.keyboard.type('glass')
  const options = dialog(page).getByRole('option')
  await expect(options.first()).toContainText('Glasshouse')

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/artist\/2$/)
})

test('arrow keys move the selection and the input keeps focus', async ({ page }) => {
  await mock(page)
  await page.goto('/')
  await ready(page)
  await page.keyboard.press('Control+k')

  const input = dialog(page).getByRole('combobox')
  await expect(input).toBeFocused()

  const first = await input.getAttribute('aria-activedescendant')
  await page.keyboard.press('ArrowDown')
  const second = await input.getAttribute('aria-activedescendant')

  expect(second).not.toBe(first)
  // The ARIA combobox pattern requires focus to stay on the input while steering.
  await expect(input).toBeFocused()
})

test('a query with no matches says so instead of showing an empty box', async ({ page }) => {
  await mock(page)
  await page.goto('/')
  await ready(page)
  await page.keyboard.press('Control+k')
  await page.keyboard.type('zzzzzz')

  await expect(dialog(page).getByText(/Nothing matches/)).toBeVisible()
})

test('with no history it leads with movers rather than an empty state', async ({ page }) => {
  await mock(page)
  await page.goto('/')
  await ready(page)
  await page.keyboard.press('Control+k')

  await expect(dialog(page).getByText("Today's movers")).toBeVisible()
  await expect(dialog(page).getByRole('option').first()).toContainText('Nova Reign')
})

test('quick actions navigate', async ({ page }) => {
  await mock(page)
  await page.goto('/')
  await ready(page)
  await page.keyboard.press('Control+k')
  await page.keyboard.type('leaderb')

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/leaderboard$/)
})
