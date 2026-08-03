import { test, expect } from '@playwright/test'

test.describe('library', () => {
  test('lists chains and opens one', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('vocal')

    const first = page.getByRole('link', { name: /Adele|Billie Eilish|Michael Jackson/ }).first()
    await first.click()

    await expect(page).toHaveURL(/\/chain\//)
    await expect(page.getByRole('heading', { name: 'Signal chain' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
  })

  test('filters by search text', async ({ page }) => {
    await page.goto('/')
    const cards = page.locator('ul.grid > li')
    await expect(cards.first()).toBeVisible()

    await page.getByLabel('Filter chains').fill('Elmhirst')
    // Elmhirst mixed two records in the catalog; searching a credit should find both.
    await expect(cards).toHaveCount(2)
  })

  test('shows an empty state and recovers from it', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Filter chains').fill('zzzzzz')
    await expect(page.getByText('Nothing matches that.')).toBeVisible()
    await page.getByRole('button', { name: 'Clear the filters' }).click()
    await expect(page.locator('ul.grid > li').first()).toBeVisible()
  })
})

test('unknown routes land on the not-found page', async ({ page }) => {
  await page.goto('/chain/not-a-real-artist')
  await expect(page.getByText('No signal.')).toBeVisible()
})
