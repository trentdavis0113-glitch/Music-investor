import { describe, it, expect } from 'vitest'
import {
  priceSignal, valueGapSentence, pressureSentence,
  participationSentence, exposureSentence, quote,
} from './artistIntel'

describe('priceSignal thresholds are explicit', () => {
  it('classifies by magnitude, not by opinion', () => {
    expect(priceSignal(6).key).toBe('sharp')
    expect(priceSignal(-6).key).toBe('sharp')
    expect(priceSignal(3).key).toBe('notable')
    expect(priceSignal(0.4).key).toBe('flat')
    expect(priceSignal(null)).toBeNull()
  })

  it('names direction in words, not only colour', () => {
    expect(priceSignal(6).label).toMatch(/Up sharply/)
    expect(priceSignal(-6).label).toMatch(/Down sharply/)
  })
})

describe('value gap is stated as comparison, never as advice', () => {
  it('describes both directions factually', () => {
    expect(valueGapSentence(9)).toMatch(/9% below the price its listener count implies/)
    expect(valueGapSentence(-9)).toMatch(/9% above the price its listener count implies/)
    expect(valueGapSentence(1)).toMatch(/close to/)
    expect(valueGapSentence(null)).toBeNull()
  })

  it('never uses valuation or recommendation language', () => {
    for (const g of [-40, -5, 0, 5, 40]) {
      const s = valueGapSentence(g) || ''
      expect(s).not.toMatch(/undervalued|overvalued|cheap|bargain|buy|sell|should|safe|risk/i)
    }
  })
})

describe('pressure reports the ledger, nothing more', () => {
  it('handles no activity', () => {
    expect(pressureSentence({ net_shares: 0, traders: 0 })).toMatch(/No trades in the last 24 hours/)
  })

  it('reports net buying and selling with trader counts', () => {
    expect(pressureSentence({ net_shares: 120, traders: 3 })).toMatch(/3 traders net bought 120 shares/)
    expect(pressureSentence({ net_shares: -40, traders: 1 })).toMatch(/1 trader net sold 40 shares/)
  })

  it('calls a balanced book balanced rather than implying direction', () => {
    expect(pressureSentence({ net_shares: 0, traders: 4 })).toMatch(/roughly even/)
  })
})

describe('participation never names a private holder', () => {
  it('counts holders without naming them', () => {
    expect(participationSentence({ holders: 14, shares_held: 900, private_count: 14 }))
      .toMatch(/Held by 14 traders this season, 900 simulated shares/)
  })

  it('handles an artist nobody holds', () => {
    expect(participationSentence({ holders: 0, shares_held: 0 })).toMatch(/No traders hold this artist yet/)
  })
})

describe('personal exposure', () => {
  it('states shares, value and portfolio share', () => {
    const s = exposureSentence({ shares: 6, price: 23.8, portfolioTotal: 800 })
    expect(s).toMatch(/You hold 6 shares, worth \$142\.80/)
    expect(exposureSentence({ shares: 400, price: 24.51, portfolioTotal: 20000 }))
      .toMatch(/worth \$9,804\.00/)   // thousands separated, like every other figure
    expect(s).toMatch(/18% of your total simulated value/)
  })

  it('omits the portfolio clause when the total is unknown', () => {
    expect(exposureSentence({ shares: 6, price: 23.8 })).not.toMatch(/% of your total/)
  })

  it('returns nothing when the user holds nothing', () => {
    expect(exposureSentence({ shares: 0, price: 10, portfolioTotal: 100 })).toBeNull()
  })
})

describe('quote validates before anything is submitted', () => {
  it('computes the simulated total and resulting balances', () => {
    const q = quote({ side: 'buy', shares: 5, price: 24.8, cash: 1000, held: 2 })
    expect(q.total).toBe(124)
    expect(q.ok).toBe(true)
    expect(q.cashAfter).toBe(876)
    expect(q.sharesAfter).toBe(7)
  })

  it('blocks a buy beyond available cash', () => {
    const q = quote({ side: 'buy', shares: 100, price: 24.8, cash: 50, held: 0 })
    expect(q.ok).toBe(false)
    expect(q.problem).toMatch(/more than your available simulated cash/)
  })

  it('blocks a sell beyond shares held', () => {
    const q = quote({ side: 'sell', shares: 10, price: 24.8, cash: 0, held: 3 })
    expect(q.ok).toBe(false)
    expect(q.problem).toMatch(/do not hold that many shares/)
  })

  it('never projects a balance for a trade that cannot execute', () => {
    // A negative share count is not a possible outcome, so it must not be displayed.
    const oversell = quote({ side: 'sell', shares: 400, price: 24.51, cash: 0, held: 110 })
    expect(oversell.sharesAfter).toBeNull()

    const overspend = quote({ side: 'buy', shares: 400, price: 24.51, cash: 100, held: 0 })
    expect(overspend.cashAfter).toBeNull()
    expect(overspend.sharesAfter).toBeNull()
  })

  it('blocks a non-positive quantity', () => {
    expect(quote({ side: 'buy', shares: 0, price: 10, cash: 100 }).ok).toBe(false)
    expect(quote({ side: 'buy', shares: -3, price: 10, cash: 100 }).ok).toBe(false)
    expect(quote({ side: 'buy', shares: 'abc', price: 10, cash: 100 }).ok).toBe(false)
  })

  it('blocks trading entirely when there is no price, rather than treating it as zero', () => {
    const q = quote({ side: 'buy', shares: 5, price: null, cash: 1000 })
    expect(q.ok).toBe(false)
    expect(q.total).toBeNull()
    expect(q.problem).toMatch(/No current price/)
  })

  it('computes the sell proceeds and remaining shares', () => {
    const q = quote({ side: 'sell', shares: 3, price: 27.1, cash: 0, held: 10 })
    expect(q.total).toBe(81.3)
    expect(q.sharesAfter).toBe(7)
    expect(q.ok).toBe(true)
  })
})
