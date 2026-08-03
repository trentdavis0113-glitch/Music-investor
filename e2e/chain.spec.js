import { test, expect } from '@playwright/test'

test.describe('chain detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chain/adele')
  })

  test('expands a stage to reveal reasoning and settings', async ({ page }) => {
    const stage = page.getByRole('button', { name: /Fairchild 660/ })
    await expect(stage).toBeVisible()

    // Collapsed: the explanation is not in the DOM at all.
    await expect(page.getByText('Settings', { exact: true })).toHaveCount(0)

    await stage.click()
    await expect(stage).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText(/slower attack and release/)).toBeVisible()
  })

  test('expand all opens every stage at once', async ({ page }) => {
    await page.getByRole('button', { name: 'Expand all' }).click()
    // Adele has five stages; all of them should now report themselves as expanded.
    await expect(page.locator('[aria-expanded="true"]')).toHaveCount(5)
    await expect(page.getByRole('button', { name: 'Collapse all' })).toBeVisible()
  })

  test('labels engineer settings differently from ours', async ({ page }) => {
    await page.getByRole('button', { name: 'Expand all' }).click()
    await expect(page.getByText('From the source').first()).toBeVisible()
    await expect(page.getByText('Our starting point').first()).toBeVisible()
  })

  test('links out to every source', async ({ page }) => {
    const sources = page.locator('a[target="_blank"]')
    // A retrying assertion, not .count(): the chain route is lazy-loaded, so a one-shot
    // query can land while Suspense is still showing the fallback.
    await expect(sources.first()).toBeVisible()

    for (const link of await sources.all()) {
      await expect(link).toHaveAttribute('rel', /noopener/)
      await expect(link).toHaveAttribute('href', /^https:\/\//)
    }
  })

  test('always shows what is not known', async ({ page }) => {
    await expect(page.getByText("What we don't know")).toBeVisible()
  })
})
