import { Link } from 'react-router-dom'
import { useSession } from '../App'

export default function HowItWorks() {
  const session = useSession()

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">How Greenroom works</h1>
        <p className="mt-2 text-fog">
          A stock market for rising artists. You trade with simulated cash, prices move on real
          momentum, and the best traders top the leaderboard every season.
        </p>
      </div>

      <Step n="01" title="You start with $10,000">
        Create an account and Season 1 hands you $10,000 in simulated cash. It is not real money,
        you can't deposit or withdraw anything, and going broke costs you nothing but pride.
        Everyone starts equal, so the leaderboard is pure skill.
      </Step>

      <Step n="02" title="Every artist has a share price">
        Each listed artist trades like a stock. Buy shares when you think they're about to blow up,
        sell when you think the hype is ahead of reality. You buy and sell instantly at the current
        market price. No order books, no waiting.
      </Step>

      <Step n="03" title="Two forces move the price">
        <span className="text-paper">Real momentum:</span> every artist's monthly listener count feeds
        their underlying value. When those numbers refresh each Monday, prices gap up or down like
        an earnings report.
        <br /><br />
        <span className="text-paper">Trader demand:</span> between refreshes, buying pushes the
        price up and selling pushes it down. Heavy buying can run a price well past what the
        numbers justify, and gravity eventually shows up.
      </Step>

      <Step n="04" title="Fair value is your edge">
        On every artist's chart there's a dashed purple line: fair value, what the artist's real
        listener numbers say they're worth. Price below the line means the market may be sleeping on
        them. Price way above it means you're paying for hype. The "Vs. price" stat does the math
        for you. Prices constantly drift back toward fair value, so the gap is the whole game.
      </Step>

      <Step n="05" title="Prices update every 15 minutes">
        The engine reprices the whole market every 15 minutes, and daily moves are capped at 20%
        in either direction, so nobody can moonshot an artist in an afternoon. Big conviction plays
        take days to pay off, exactly like they should.
      </Step>

      <Step n="06" title="Seasons crown a winner">
        Seasons run about 90 days. Your total portfolio value (cash plus holdings) ranks you on the
        leaderboard, then everything resets and everyone gets a fresh $10,000. Being early on an
        artist nobody was watching is how legends get made here.
      </Step>

      <div className="rounded-xl border border-stage/40 bg-stage/10 p-4">
        <p className="font-display font-bold">A few honest ways to play it</p>
        <p className="mt-2 text-sm text-fog">
          <span className="text-paper">Value:</span> buy artists trading under fair value and wait
          for the drift. <span className="text-paper">Momentum:</span> catch artists whose followers
          are climbing before Monday's refresh reprices them. <span className="text-paper">Scout:</span>{' '}
          the real edge is off-platform. If you heard a song blowing up locally before their Spotify
          numbers show it, that's information the market doesn't have yet. Star artists on your
          watchlist and check their updates. When an artist posts "new single Friday," you know
          what Monday might bring.
        </p>
      </div>

      <Step n="07" title="Artists get backed, not billed">
        Artists claim their profile or apply to get listed, free, always. A verified artist gets a
        market page fans genuinely check on, a holder count that grows with their momentum, and a
        direct line to post updates to the people most invested in their rise.{' '}
        <Link to="/for-artists" className="text-stage underline underline-offset-4">More for artists here.</Link>
      </Step>

      <div className="rounded-xl border border-edge bg-panel p-4 text-sm text-fog">
        <p className="font-semibold text-paper">The fine print, in plain words</p>
        <p className="mt-1">
          All trading on Greenroom uses simulated currency with no cash value. Nothing here is an
          investment, a security, or financial advice, and no real money changes hands. It's a game
          of skill about spotting rising artists early.
        </p>
      </div>

      {!session && (
        <Link to="/auth"
          className="block rounded-lg bg-stage py-3 text-center font-semibold text-ink">
          Claim your $10,000 and start trading
        </Link>
      )}
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <div className="flex gap-4">
      <span className="num shrink-0 pt-0.5 text-sm text-stage">{n}</span>
      <div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-fog">{children}</p>
      </div>
    </div>
  )
}
