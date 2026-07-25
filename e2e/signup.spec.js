import { test, expect } from '@playwright/test'

const SIGNUP = '**/functions/v1/signup'
const TOKEN = '**/auth/v1/token**'

/** Block every Supabase call by default so tests never depend on the network. */
async function isolate(page) {
  await page.route('**/*.supabase.co/**', route => route.fulfill({
    status: 200, contentType: 'application/json', body: '[]',
  }))
}

async function gotoSignup(page) {
  await isolate(page)
  await page.goto('/auth')
  await page.getByRole('button', { name: 'Create an account' }).click()
}

test('signup form shows every field a tester needs', async ({ page }) => {
  await gotoSignup(page)

  await expect(page.getByLabel('Username')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible()
  await expect(page.getByText('Use at least 8 characters.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
})

test('beta status and simulated-money wording are stated up front', async ({ page }) => {
  await gotoSignup(page)

  await expect(page.getByText('Private Columbus Beta')).toBeVisible()
  await expect(page.getByText(/simulated cash/i)).toBeVisible()
  await expect(page.getByText(/No real money, no deposits, no securities/i)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Terms' })).toBeVisible()
})

test('password can be revealed and re-hidden', async ({ page }) => {
  await gotoSignup(page)
  const pw = page.getByLabel('Password', { exact: true })

  await pw.fill('hunter2hunter2')
  await expect(pw).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(pw).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Hide password' }).click()
  await expect(pw).toHaveAttribute('type', 'password')
})

test('short password is rejected client-side before any request', async ({ page }) => {
  let calls = 0
  await isolate(page)
  await page.route(SIGNUP, r => { calls++; r.fulfill({ status: 200, body: '{}' }) })
  await page.goto('/auth')
  await page.getByRole('button', { name: 'Create an account' }).click()

  await page.getByLabel('Username').fill('betatester')
  await page.getByLabel('Email').fill('a@example.com')
  await page.getByLabel('Password', { exact: true }).fill('short')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Password needs at least 8 characters.')).toBeVisible()
  expect(calls).toBe(0)
})

test('invalid email never reaches the server', async ({ page }) => {
  // The form is a real <form>, so the browser's native type="email" check fires first and
  // shows its own message. What matters is that no request is sent and the field is invalid.
  let calls = 0
  await isolate(page)
  await page.route(SIGNUP, r => { calls++; r.fulfill({ status: 200, body: '{}' }) })
  await page.goto('/auth')
  await page.getByRole('button', { name: 'Create an account' }).click()

  await page.getByLabel('Username').fill('betatester')
  await page.getByLabel('Email').fill('not-an-email')
  await page.getByLabel('Password', { exact: true }).fill('longenough1')
  await page.getByRole('button', { name: 'Create account' }).click()

  const valid = await page.getByLabel('Email').evaluate(el => el.validity.valid)
  expect(valid).toBe(false)
  expect(calls).toBe(0)
})

test('username charset is explained rather than silently corrected', async ({ page }) => {
  await gotoSignup(page)
  await page.getByLabel('Username').fill('bad name!')
  await expect(page.getByText(/Letters, numbers, and \. _ - only\./)).toBeVisible()
})

test('a taken username is reported before submitting', async ({ page }) => {
  await isolate(page)
  await page.route('**/rest/v1/rpc/username_available', r => r.fulfill({
    status: 200, contentType: 'application/json', body: 'false',
  }))
  await page.goto('/auth')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Username').fill('takenname')

  await expect(page.getByText('That username is taken.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled()
})

test('a double click cannot submit signup twice', async ({ page }) => {
  let calls = 0
  await isolate(page)
  await page.route(SIGNUP, async route => {
    calls++
    await new Promise(r => setTimeout(r, 700))       // hold the request open
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, username: 'betatester', renamed: false }),
    })
  })
  await page.route(TOKEN, r => r.fulfill({ status: 400, contentType: 'application/json', body: '{}' }))

  await page.goto('/auth')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Username').fill('betatester')
  await page.getByLabel('Email').fill('dbl@example.com')
  await page.getByLabel('Password', { exact: true }).fill('longenough1')

  const submit = page.getByRole('button', { name: 'Create account' })
  await submit.click()
  await expect(page.getByRole('button', { name: 'Working…' })).toBeDisabled()
  await page.waitForTimeout(900)

  expect(calls).toBe(1)
})

test('an existing email routes the tester to sign-in with the address kept', async ({ page }) => {
  await isolate(page)
  await page.route(SIGNUP, r => r.fulfill({
    status: 409, contentType: 'application/json',
    body: JSON.stringify({ error: 'That email already has an account. Sign in instead.', code: 'email_taken' }),
  }))

  await page.goto('/auth')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Username').fill('betatester')
  await page.getByLabel('Email').fill('existing@example.com')
  await page.getByLabel('Password', { exact: true }).fill('longenough1')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText(/already has an account/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByLabel('Email')).toHaveValue('existing@example.com')
})

test('an account created but not signed in tells the tester to sign in, not that it failed', async ({ page }) => {
  await isolate(page)
  await page.route(SIGNUP, r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, username: 'betatester', renamed: false, provisioned: true }),
  }))
  await page.route(TOKEN, r => r.fulfill({
    status: 400, contentType: 'application/json',
    body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }),
  }))

  await page.goto('/auth')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Username').fill('betatester')
  await page.getByLabel('Email').fill('created@example.com')
  await page.getByLabel('Password', { exact: true }).fill('longenough1')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByText('Your account was created. Sign in to finish.')).toBeVisible()
  await expect(page.getByText(/Signup failed/i)).toHaveCount(0)
})

test('the signup page does not scroll sideways', async ({ page }) => {
  await gotoSignup(page)
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('keyboard users get a skip link and visible focus', async ({ page }) => {
  await isolate(page)
  await page.goto('/auth')
  await page.keyboard.press('Tab')
  const first = await page.evaluate(() => document.activeElement?.textContent?.trim())
  expect(first).toBe('Skip to content')
})

test('terms page states the simulated-money model', async ({ page }) => {
  await isolate(page)
  await page.goto('/terms')
  await expect(page.getByRole('heading', { name: /Terms/ })).toBeVisible()
  await expect(page.getByText(/No securities, shares or financial instruments/i)).toBeVisible()
  await expect(page.getByText(/have no cash value/i)).toBeVisible()
})

test('an unknown URL shows a 404 rather than an empty page', async ({ page }) => {
  await isolate(page)
  await page.goto('/definitely-not-a-page')
  await expect(page.getByText('Nothing trades here.')).toBeVisible()
})
