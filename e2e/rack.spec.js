import { test, expect } from '@playwright/test'

/**
 * The rack is the feature that makes the catalog personal, and it is entirely
 * localStorage — so these tests are also the check that nothing needs a network or an
 * account to work.
 */

test.describe('rack', () => {
  test('a preset changes what the chains say you can build', async ({ page }) => {
    await page.goto('/rack')
    await expect(page.getByText('plugins owned')).toBeVisible()

    await page.getByRole('button', { name: /The free rack/ }).click()
    await expect(page.getByText('at list price')).toBeVisible()
    // Every plugin in the free preset costs nothing, so the total must be exactly $0.
    await expect(page.getByText('$0', { exact: true })).toBeVisible()

    await page.goto('/chain/kendrick-lamar')
    await expect(page.getByText('from your rack')).toBeVisible()
  })

  test('owning a plugin is reflected on the chain page', async ({ page }) => {
    await page.goto('/plugins?item=valhalla-vintageverb')
    await page.getByRole('button', { name: /Add ValhallaVerb|Add VintageVerb/ }).click()

    await page.goto('/chain/kendrick-lamar')
    await expect(page.getByText('You own this').first()).toBeVisible()
  })

  test('the rack survives a reload', async ({ page }) => {
    await page.goto('/rack')
    await page.getByRole('button', { name: /The free rack/ }).click()
    const count = await page.locator('.num').first().textContent()

    await page.reload()
    await expect(page.locator('.num').first()).toHaveText(count)
  })

  test('picking a DAW names its stock plugins on every stage', async ({ page }) => {
    await page.goto('/chain/drake')
    // Nothing DAW-specific before a DAW is chosen.
    await expect(page.getByText('or Parametric EQ 2')).toHaveCount(0)

    await page.getByLabel('My DAW').selectOption('flstudio')
    await expect(page.getByText('or Parametric EQ 2').first()).toBeVisible()

    await page.getByLabel('My DAW').selectOption('ableton')
    await expect(page.getByText('or EQ Eight').first()).toBeVisible()
    await expect(page.getByText('or Parametric EQ 2')).toHaveCount(0)
  })

  test('clearing the rack empties it', async ({ page }) => {
    await page.goto('/rack')
    await page.getByRole('button', { name: /The free rack/ }).click()
    await page.getByRole('button', { name: 'Clear the rack' }).click()
    await expect(page.getByText('Nothing yet.')).toBeVisible()
  })
})

test('search finds an engineer, not just an artist', async ({ page }) => {
  await page.goto('/')
  // The "/" shortcut is a window listener React attaches on mount, so a keypress fired
  // before hydration is simply lost. Wait for proof the app is interactive first.
  await expect(page.getByRole('button', { name: 'Open search' })).toBeVisible()

  await page.keyboard.press('/')
  // The page has several selects that are also comboboxes; target the palette's input.
  await page.getByLabel('Search artists, engineers and plugins').fill('Guzauski')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/chain\/daft-punk/)
})
