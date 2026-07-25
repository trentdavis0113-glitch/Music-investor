import { describe, it, expect, vi, afterEach } from 'vitest'
import { callFunction } from './supabase'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('callFunction', () => {
  // Regression guard. Sending a publishable key as `Authorization: Bearer` is rejected by
  // Supabase's gateway as "Invalid JWT" — that mistake broke signup once already.
  it('sends the key on apikey and never as Authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await callFunction('signup', { email: 'a@b.co' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/functions\/v1\/signup$/)
    expect(init.headers.apikey).toBeTruthy()
    expect(init.headers.Authorization).toBeUndefined()
    expect(init.headers.authorization).toBeUndefined()
  })

  it('returns the parsed body on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ ok: true, username: 'ada_1', renamed: true })))

    const { data, error } = await callFunction('signup', {})

    expect(error).toBeNull()
    expect(data).toEqual({ ok: true, username: 'ada_1', renamed: true })
  })

  // Account creation is not idempotent: a timed-out request may already have succeeded,
  // so retrying it would create the account twice.
  it('does NOT retry after a timeout', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const fetchMock = vi.fn().mockRejectedValue(abort)
    vi.stubGlobal('fetch', fetchMock)

    const { data, error } = await callFunction('signup', {}, { retries: 3 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(data).toBeNull()
    expect(error.code).toBe('timeout')
  })

  it('does not retry a 4xx, and passes the server code through', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: 'That email already has an account.', code: 'email_taken' }, 409))
    vi.stubGlobal('fetch', fetchMock)

    const { error } = await callFunction('signup', {}, { retries: 3 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(error.code).toBe('email_taken')
    expect(error.status).toBe(409)
  })

  it('retries a 5xx up to the limit', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'boom' }, 502))
    vi.stubGlobal('fetch', fetchMock)

    const { error } = await callFunction('signup', {}, { retries: 1 })

    expect(fetchMock).toHaveBeenCalledTimes(2)   // initial + 1 retry
    expect(error.status).toBe(502)
  })

  it('retries a connection failure that never reached the server', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    const { error } = await callFunction('signup', {}, { retries: 1 })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(error.code).toBe('network')
  })
})
