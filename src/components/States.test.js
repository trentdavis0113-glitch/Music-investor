import { describe, it, expect } from 'vitest'
import { humanize } from './States'

describe('humanize', () => {
  it('turns transport noise into something a tester can act on', () => {
    expect(humanize('TypeError: Failed to fetch')).toMatch(/offline/i)
    expect(humanize('NetworkError when attempting to fetch')).toMatch(/offline/i)
  })

  it('explains an expired session', () => {
    expect(humanize('JWT expired')).toMatch(/sign in again/i)
  })

  it('explains the no-active-season case in plain language', () => {
    expect(humanize('No active season')).toMatch(/season is being set up/i)
  })

  it('passes through messages already written for humans', () => {
    const msg = 'That email already has an account. Sign in instead.'
    expect(humanize(msg)).toBe(msg)
  })

  it('leaves non-strings alone', () => {
    expect(humanize(undefined)).toBeUndefined()
    expect(humanize(null)).toBeNull()
  })
})
