import { Link } from 'react-router-dom'

/**
 * Minimal, factual statement of what the product currently is during the private beta.
 * Deliberately makes no legal assurances and promises nothing that isn't already true.
 */
export default function Terms() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Terms &amp; Privacy</h1>
        <p className="mt-1 text-xs text-fog">Private beta · last updated 25 July 2026</p>
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-stage">
          This is a simulation
        </h2>
        <p className="text-sm leading-relaxed text-fog">
          Greenroom Exchange is a game. Every balance, price, share and trade is simulated.
          There is no real money involved at any point:
        </p>
        <ul className="ml-5 list-disc space-y-1 text-sm text-fog">
          <li>You are not depositing, transferring or withdrawing money.</li>
          <li>No securities, shares or financial instruments are offered or sold.</li>
          <li>Nothing is for sale and no purchase is required.</li>
          <li>Simulated balances have no cash value and cannot be redeemed.</li>
          <li>Nothing here is financial, investment or legal advice.</li>
        </ul>
        <p className="text-sm leading-relaxed text-fog">
          Artist prices are driven by public popularity data and by what other players in the
          game do. They do not represent any real valuation of any artist.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-stage">
          What we store
        </h2>
        <p className="text-sm leading-relaxed text-fog">
          Your email address, your chosen username, and the activity you generate in the game
          (holdings, trades, watchlist, streak). Authentication and storage are handled by
          Supabase. Your email is used to sign you in and to send password resets.
        </p>
        <p className="text-sm leading-relaxed text-fog">
          Your username, rank and portfolio value are visible to other players on the
          leaderboard. Your individual positions stay private unless you switch on
          “Public portfolio” from your Portfolio page.
        </p>
        <p className="text-sm leading-relaxed text-fog">
          We do not sell your data and there is no third-party advertising or tracking in the app.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-stage">
          Beta expectations
        </h2>
        <p className="text-sm leading-relaxed text-fog">
          This is an invite-only beta run for a small group of testers. Expect bugs. Seasons,
          balances and leaderboards may be reset while the game is being developed, and the
          service may change or stop without notice. Use a password you do not use elsewhere.
        </p>
        <p className="text-sm leading-relaxed text-fog">
          To have your account and data deleted, contact whoever invited you and it will be
          removed.
        </p>
      </section>

      <Link to="/auth" className="inline-block text-sm text-stage underline underline-offset-4">
        Back to sign up
      </Link>
    </div>
  )
}
