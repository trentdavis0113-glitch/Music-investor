/**
 * Portfolio maths, kept pure and free of React or Supabase so every formula is directly
 * testable.
 *
 * A note on what this can and cannot know, because it matters for honesty in the UI:
 *
 *  - execute_trade() keeps a weighted-average cost basis on holdings.avg_cost, and does
 *    NOT adjust it on a sell. That is correct average-cost accounting, and it means
 *    unrealised P/L is exact for any position still open.
 *  - Realised P/L is never stored anywhere. Selling moves value into cash and the gain
 *    disappears from any unrealised figure. So "open P/L" is NOT season performance —
 *    presenting it as such understates or overstates a trader who has sold anything.
 *  - The one figure that captures realised and unrealised together is
 *    (cash + holdings value) - starting_bankroll, because every trader starts a season
 *    with exactly starting_bankroll and no positions. That is the headline number.
 */

/** Money: 2dp, and never returns -0. */
export const money = n => {
  const v = Math.round((Number(n) + Number.EPSILON) * 100) / 100
  return Object.is(v, -0) ? 0 : v
}

/** Percentage: 2dp, null when the denominator makes it meaningless. */
export const pct = (part, whole) => {
  const w = Number(whole)
  if (!w) return null
  const v = Math.round(((Number(part) / w) * 100 + Number.EPSILON) * 100) / 100
  return Object.is(v, -0) ? 0 : v
}

/**
 * @param cash             available simulated cash for the current season
 * @param holdings         [{ artist_id, shares, avg_cost }] — season-scoped, shares > 0
 * @param priceOf          artist_id -> latest price (may be missing)
 * @param artistOf         artist_id -> { name, symbol, genre, image_url, pct, metrics_verified }
 * @param startingBankroll the season's starting cash
 */
export function computePortfolio({
  cash = 0,
  holdings = [],
  priceOf = {},
  artistOf = {},
  startingBankroll = 0,
} = {}) {
  const cashNum = Number(cash) || 0

  const positions = holdings
    .filter(h => Number(h.shares) > 0)
    .map(h => {
      const shares = Number(h.shares)
      const avgCost = Number(h.avg_cost) || 0
      // A missing price is unknown, not zero. Zero would report a total loss on a
      // position that is merely awaiting a tick.
      const rawPrice = priceOf[h.artist_id]
      const known = rawPrice != null && Number.isFinite(Number(rawPrice))
      const price = known ? Number(rawPrice) : null

      const costBasis = shares * avgCost
      const value = known ? shares * price : null
      const pl = known ? value - costBasis : null

      const meta = artistOf[h.artist_id] || {}
      return {
        artist_id: h.artist_id,
        name: meta.name || '—',
        symbol: meta.symbol || null,
        genre: meta.genre || null,
        image_url: meta.image_url || null,
        dayPct: meta.pct ?? null,
        verified: !!meta.metrics_verified,
        shares,
        avgCost,
        price,
        priceKnown: known,
        costBasis,
        value,
        pl,
        plPct: known ? pct(pl, costBasis) : null,
      }
    })

  // Positions with an unknown price are excluded from totals rather than counted as 0,
  // and surfaced separately so the UI can say so instead of quietly under-reporting.
  const priced = positions.filter(p => p.priceKnown)
  const unpriced = positions.filter(p => !p.priceKnown)

  const invested = priced.reduce((s, p) => s + p.value, 0)
  const costBasis = priced.reduce((s, p) => s + p.costBasis, 0)
  const openPl = priced.reduce((s, p) => s + p.pl, 0)
  const total = cashNum + invested

  // Realised + unrealised. Everyone starts a season at exactly startingBankroll.
  const seasonReturn = startingBankroll ? total - Number(startingBankroll) : null
  const seasonReturnPct = startingBankroll ? pct(total - startingBankroll, startingBankroll) : null

  const withAllocation = positions.map(p => ({
    ...p,
    // Share of everything the trader holds, cash included — the number that answers
    // "how concentrated am I?". Share-of-invested is a different question and is
    // computed where it is actually shown.
    allocation: p.priceKnown ? pct(p.value, total) : null,
    allocationOfInvested: p.priceKnown ? pct(p.value, invested) : null,
  })).sort((a, b) => (b.value ?? -1) - (a.value ?? -1))

  const ranked = withAllocation.filter(p => p.priceKnown && p.plPct != null)
  const byReturn = [...ranked].sort((a, b) => b.plPct - a.plPct)

  const best = byReturn.length ? byReturn[0] : null
  const worst = byReturn.length > 1 ? byReturn[byReturn.length - 1] : null
  const largest = withAllocation.find(p => p.priceKnown) || null

  return {
    positions: withAllocation,
    unpricedCount: unpriced.length,
    cash: money(cashNum),
    invested: money(invested),
    costBasis: money(costBasis),
    total: money(total),
    openPl: money(openPl),
    openPlPct: pct(openPl, costBasis),
    seasonReturn: seasonReturn == null ? null : money(seasonReturn),
    seasonReturnPct,
    cashPct: pct(cashNum, total),
    investedPct: pct(invested, total),
    // Only meaningful when the trader actually holds more than one thing.
    best: best && best !== worst ? best : best,
    worst,
    largest,
    concentration: largest?.allocation ?? null,
  }
}

/**
 * A deterministic, factual summary. No model, no adjectives that imply advice, and
 * every clause is dropped unless the data supports it.
 */
export function summarise(p) {
  if (!p || !p.positions.length) return null
  const parts = []

  if (p.seasonReturnPct != null) {
    const dir = p.seasonReturnPct > 0 ? 'up' : p.seasonReturnPct < 0 ? 'down' : 'flat'
    parts.push(dir === 'flat'
      ? 'Your simulated portfolio is level with where you started this season.'
      : `Your simulated portfolio is ${dir} ${Math.abs(p.seasonReturnPct).toFixed(1)}% this season.`)
  }

  if (p.best && p.best.plPct > 0) {
    parts.push(`${p.best.name} is your strongest position, ${p.best.plPct.toFixed(1)}% above cost.`)
  }

  // 40%, not 30%: with three positions an even split is ~33% each, and calling that
  // "concentrated" would be noise rather than information.
  if (p.concentration != null && p.concentration >= 40 && p.largest && p.positions.length > 1) {
    parts.push(`${p.largest.name} accounts for ${p.concentration.toFixed(0)}% of your total simulated value.`)
  }

  return parts.length ? parts.join(' ') : null
}
