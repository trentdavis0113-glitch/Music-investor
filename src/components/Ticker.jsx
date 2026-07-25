import { money } from '../lib/supabase'
import { useMarket } from '../lib/market'

/**
 * Reads the shared market store, so the ticker costs zero extra requests. It previously
 * ran its own 60s poll pulling a day of raw price_ticks (~258 kB) purely to compute the
 * numbers the market page had already computed.
 */
export default function Ticker() {
  const { rows } = useMarket()

  if (!rows?.length) return null
  const row = rows.concat(rows) // duplicate for a seamless loop

  return (
    <div className="overflow-hidden border-b border-edge bg-panel/60">
      <div className="marquee-track flex w-max gap-8 px-4 py-1.5" aria-hidden="true">
        {row.map((i, idx) => (
          <span key={idx} className="num flex items-center gap-2 text-xs whitespace-nowrap">
            <span className="text-fog">${i.symbol}</span>
            <span>{money(i.latest)}</span>
            {/* An artist with no recorded price has no day change either — showing
                "▲ 0.00%" would state a fact the data does not support. */}
            {i.latest != null && i.pct != null && (
              <span className={i.pct >= 0 ? 'text-gain' : 'text-loss'}>
                {i.pct >= 0 ? '▲' : '▼'} {Math.abs(i.pct).toFixed(2)}%
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
