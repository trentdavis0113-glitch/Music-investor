/**
 * Deterministic artist signals.
 *
 * Every label here has an explicit numeric rule, stated in one place so it can be tested
 * and audited. Nothing is inferred, scored or modelled. Deliberately absent: any label
 * implying quality, safety or a recommendation — "undervalued", "strong buy", "low risk"
 * and the like. The gap figure is stated as a factual comparison to the listener-implied
 * price, never as a verdict.
 */

/** Price movement over the last 24h, as reported by market_overview(). */
export const MOVE_STRONG = 5   // |pct| >= 5  -> "Moving sharply"
export const MOVE_NOTABLE = 2  // |pct| >= 2  -> "Moving"

/** Share of 24h net trading pressure that counts as one-sided. */
export const PRESSURE_MIN_SHARES = 1

export function priceSignal(pct) {
  if (pct == null) return null
  const a = Math.abs(pct)
  if (a >= MOVE_STRONG) return { key: 'sharp', label: pct > 0 ? 'Up sharply today' : 'Down sharply today' }
  if (a >= MOVE_NOTABLE) return { key: 'notable', label: pct > 0 ? 'Up today' : 'Down today' }
  return { key: 'flat', label: 'Little movement today' }
}

/**
 * Fair value is what the artist's recorded monthly listeners imply, using the same
 * formula the pricing engine uses. Reported as a plain comparison — the market may be
 * right and the formula wrong.
 */
export function valueGapSentence(gap) {
  if (gap == null) return null
  const a = Math.abs(gap)
  if (a < 3) return 'Trading close to the price its listener count implies.'
  return gap > 0
    ? `Trading ${a.toFixed(0)}% below the price its listener count implies.`
    : `Trading ${a.toFixed(0)}% above the price its listener count implies.`
}

/** 24h buy/sell imbalance from artist_pressure(). Facts only, no interpretation. */
export function pressureSentence(p) {
  if (!p) return null
  const net = Number(p.net_shares ?? 0)
  const traders = Number(p.traders ?? 0)
  if (!traders) return 'No trades in the last 24 hours.'
  const who = `${traders} trader${traders === 1 ? '' : 's'}`
  if (Math.abs(net) < PRESSURE_MIN_SHARES) return `${who} traded this artist in the last 24 hours, with buys and sells roughly even.`
  return net > 0
    ? `${who} net bought ${Math.abs(net).toLocaleString()} shares in the last 24 hours.`
    : `${who} net sold ${Math.abs(net).toLocaleString()} shares in the last 24 hours.`
}

/**
 * Holder participation. Named holders are only those who made their portfolio public;
 * everyone else is counted but never named.
 */
export function participationSentence(h) {
  if (!h) return null
  const holders = Number(h.holders ?? 0)
  if (!holders) return 'No traders hold this artist yet this season.'
  const shares = Number(h.shares_held ?? 0)
  return `Held by ${holders} trader${holders === 1 ? '' : 's'} this season, ` +
         `${shares.toLocaleString()} simulated shares in total.`
}

/** The signed-in user's own exposure. */
export function exposureSentence({ shares, price, portfolioTotal }) {
  if (!shares || price == null) return null
  const value = shares * price
  const shown = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const base = `You hold ${shares.toLocaleString()} share${shares === 1 ? '' : 's'}, ` +
               `worth $${shown} in simulated value.`
  if (!portfolioTotal) return base
  const share = (value / portfolioTotal) * 100
  return `${base} That is ${share.toFixed(0)}% of your total simulated value.`
}

/** Estimated cost/proceeds of a trade at the quoted price. */
export function quote({ side, shares, price, cash = 0, held = 0 }) {
  const n = Number(shares)
  const valid = Number.isFinite(n) && n > 0 && price != null
  const total = valid ? Math.round(n * price * 100) / 100 : null

  let problem = null
  if (!Number.isFinite(n) || n <= 0) problem = 'Enter a share amount above zero.'
  else if (price == null) problem = 'No current price for this artist, so trading is unavailable.'
  else if (side === 'buy' && total > cash) problem = 'That costs more than your available simulated cash.'
  else if (side === 'sell' && n > held) problem = 'You do not hold that many shares.'

  // Resulting balances are only projected for a trade that could actually execute.
  // Otherwise an oversized sell reported "Shares after −290", stating an impossible
  // outcome with the same confidence as a real one.
  const ok = problem == null
  return {
    total,
    problem,
    ok,
    cashAfter: ok && side === 'buy' ? Math.round((cash - total) * 100) / 100 : null,
    sharesAfter: ok ? (side === 'buy' ? held + n : held - n) : null,
  }
}
