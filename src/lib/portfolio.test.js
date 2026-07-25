import { describe, it, expect } from 'vitest'
import { computePortfolio, summarise, money, pct } from './portfolio'

const artistOf = {
  1: { name: 'Nova Reign', symbol: 'NOVA', genre: 'Hip-Hop', pct: 2.5 },
  2: { name: 'Glasshouse', symbol: 'GLAS', genre: 'Indie', pct: -1.2 },
  3: { name: 'Mira Vale', symbol: 'MIRA', genre: 'R&B', pct: 0.4 },
}

// 10 shares @ 10 -> now 15  = +50 value, +50% return
// 20 shares @  5 -> now  4  = -20 value, -20% return
// 4 shares  @ 25 -> now 25  = flat
const HOLDINGS = [
  { artist_id: 1, shares: 10, avg_cost: 10 },
  { artist_id: 2, shares: 20, avg_cost: 5 },
  { artist_id: 3, shares: 4, avg_cost: 25 },
]
const PRICES = { 1: 15, 2: 4, 3: 25 }

const base = () => computePortfolio({
  cash: 500, holdings: HOLDINGS, priceOf: PRICES, artistOf, startingBankroll: 10000,
})

describe('money / pct helpers', () => {
  it('rounds money to 2dp and never yields -0', () => {
    expect(money(1.005)).toBe(1.01)
    expect(money(-0.001)).toBe(0)
    expect(money(99.999)).toBe(100)
  })

  it('returns null rather than Infinity when the denominator is zero', () => {
    expect(pct(5, 0)).toBeNull()
    expect(pct(0, 0)).toBeNull()
    expect(pct(25, 100)).toBe(25)
  })
})

describe('core totals', () => {
  const p = base()

  it('computes position value from shares x current price', () => {
    const nova = p.positions.find(x => x.artist_id === 1)
    expect(nova.value).toBe(150)   // 10 x 15
    expect(nova.costBasis).toBe(100)
  })

  it('computes total holdings value', () => {
    expect(p.invested).toBe(330)   // 150 + 80 + 100
  })

  it('computes total portfolio value as cash plus holdings', () => {
    expect(p.total).toBe(830)      // 500 + 330
  })

  it('reports available cash unchanged', () => {
    expect(p.cash).toBe(500)
  })

  it('computes cost basis across positions', () => {
    expect(p.costBasis).toBe(300)  // 100 + 100 + 100
  })

  it('computes unrealised gain and its percentage', () => {
    expect(p.openPl).toBe(30)                // +50 - 20 + 0
    expect(p.openPlPct).toBe(10)             // 30 / 300 cost basis
  })

  it('computes per-position return percentage', () => {
    expect(p.positions.find(x => x.artist_id === 1).plPct).toBe(50)
    expect(p.positions.find(x => x.artist_id === 2).plPct).toBe(-20)
    expect(p.positions.find(x => x.artist_id === 3).plPct).toBe(0)
  })
})

describe('season return captures realised gains, which open P/L cannot', () => {
  it('measures against the starting bankroll, not cost basis', () => {
    const p = base()
    expect(p.seasonReturn).toBe(-9170)          // 830 - 10000
    expect(p.seasonReturnPct).toBe(-91.7)
  })

  it('counts a profit that has already been sold into cash', () => {
    // Sold everything for more than the 10,000 start. Open P/L is 0 — season return is not.
    const p = computePortfolio({ cash: 12000, holdings: [], priceOf: {}, artistOf, startingBankroll: 10000 })
    expect(p.openPl).toBe(0)
    expect(p.seasonReturn).toBe(2000)
    expect(p.seasonReturnPct).toBe(20)
  })
})

describe('allocation and concentration', () => {
  const p = base()

  it('allocates against total value including cash', () => {
    const nova = p.positions.find(x => x.artist_id === 1)
    expect(nova.allocation).toBe(pct(150, 830))
  })

  it('also exposes share-of-invested, which is a different question', () => {
    const nova = p.positions.find(x => x.artist_id === 1)
    expect(nova.allocationOfInvested).toBe(pct(150, 330))
  })

  it('splits cash against invested', () => {
    expect(p.cashPct).toBe(pct(500, 830))
    expect(p.investedPct).toBe(pct(330, 830))
  })

  it('reports concentration as the largest position share of total', () => {
    expect(p.concentration).toBe(p.positions[0].allocation)
  })
})

describe('best, weakest and largest', () => {
  const p = base()

  it('picks best and weakest by return percentage, not absolute value', () => {
    expect(p.best.artist_id).toBe(1)    // +50%
    expect(p.worst.artist_id).toBe(2)   // -20%
  })

  it('picks largest by position value', () => {
    expect(p.largest.artist_id).toBe(1) // 150 is the biggest holding
  })

  it('does not name a weakest when only one position is held', () => {
    const one = computePortfolio({
      cash: 0, holdings: [HOLDINGS[0]], priceOf: PRICES, artistOf, startingBankroll: 10000,
    })
    expect(one.best.artist_id).toBe(1)
    expect(one.worst).toBeNull()
  })

  it('sorts positions by value, largest first', () => {
    expect(p.positions.map(x => x.artist_id)).toEqual([1, 3, 2])
  })
})

describe('edge cases that would otherwise misreport', () => {
  it('handles an empty portfolio without dividing by zero', () => {
    const p = computePortfolio({ cash: 10000, holdings: [], priceOf: {}, artistOf, startingBankroll: 10000 })
    expect(p.total).toBe(10000)
    expect(p.invested).toBe(0)
    expect(p.openPlPct).toBeNull()
    expect(p.best).toBeNull()
    expect(p.largest).toBeNull()
    expect(p.concentration).toBeNull()
    expect(p.seasonReturn).toBe(0)
  })

  it('excludes fully sold positions', () => {
    const p = computePortfolio({
      cash: 100,
      holdings: [...HOLDINGS, { artist_id: 9, shares: 0, avg_cost: 40 }],
      priceOf: { ...PRICES, 9: 40 }, artistOf, startingBankroll: 10000,
    })
    expect(p.positions.find(x => x.artist_id === 9)).toBeUndefined()
    expect(p.positions).toHaveLength(3)
  })

  it('treats a missing price as unknown rather than zero', () => {
    // A price of 0 would report a 100% loss on a position merely awaiting a tick.
    const p = computePortfolio({
      cash: 0, holdings: [{ artist_id: 1, shares: 10, avg_cost: 10 }],
      priceOf: {}, artistOf, startingBankroll: 10000,
    })
    expect(p.unpricedCount).toBe(1)
    expect(p.positions[0].value).toBeNull()
    expect(p.positions[0].pl).toBeNull()
    expect(p.invested).toBe(0)      // excluded from totals, not counted as 0
    expect(p.total).toBe(0)
  })

  it('handles fractional shares to the precision execute_trade allows', () => {
    const p = computePortfolio({
      cash: 0, holdings: [{ artist_id: 1, shares: 0.5, avg_cost: 10.25 }],
      priceOf: { 1: 11.5 }, artistOf, startingBankroll: 10000,
    })
    expect(p.positions[0].value).toBe(5.75)
    expect(p.invested).toBe(5.75)
    expect(p.positions[0].plPct).toBe(pct(5.75 - 5.125, 5.125))
  })

  it('does not crash when cost basis is zero', () => {
    const p = computePortfolio({
      cash: 0, holdings: [{ artist_id: 1, shares: 5, avg_cost: 0 }],
      priceOf: { 1: 10 }, artistOf, startingBankroll: 10000,
    })
    expect(p.positions[0].plPct).toBeNull()
    expect(p.openPlPct).toBeNull()
  })
})

describe('summary is deterministic and only states what is supported', () => {
  it('returns null with no positions', () => {
    expect(summarise(computePortfolio({ cash: 10000, holdings: [] }))).toBeNull()
  })

  it('states direction, strongest position and concentration', () => {
    const p = computePortfolio({
      cash: 0,
      holdings: [{ artist_id: 1, shares: 100, avg_cost: 10 }, { artist_id: 2, shares: 1, avg_cost: 5 }],
      priceOf: { 1: 150, 2: 5 }, artistOf, startingBankroll: 10000,
    })
    const s = summarise(p)
    expect(s).toMatch(/up .*% this season/)
    expect(s).toContain('Nova Reign')
    expect(s).toMatch(/accounts for \d+% of your total simulated value/)
  })

  it('omits the concentration clause when the book is spread out', () => {
    const p = computePortfolio({
      cash: 0,
      holdings: [
        { artist_id: 1, shares: 10, avg_cost: 10 },
        { artist_id: 2, shares: 25, avg_cost: 4 },
        { artist_id: 3, shares: 4, avg_cost: 25 },
      ],
      priceOf: { 1: 10, 2: 4, 3: 25 }, artistOf, startingBankroll: 10000,
    })
    expect(p.concentration).toBeLessThan(40)
    expect(summarise(p)).not.toMatch(/accounts for/)
  })

  it('never implies advice', () => {
    const p = base()
    const s = summarise(p) || ''
    expect(s).not.toMatch(/should|buy|sell|recommend|consider/i)
  })
})
