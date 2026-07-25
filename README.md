# Greenroom Exchange

A simulated stock market for rising Ohio artists. Fans get $10,000 in simulated cash each season and trade shares of real, verified artists. Prices move on two real forces: each artist's actual Spotify monthly listeners (fundamentals) and trader supply and demand (pressure). Live at https://greenroom-exchange-app.netlify.app

## What the app is

Greenroom is the scoreboard for a local music scene. It makes believing in an artist early into something visible, priced, and competitive. Artists benefit even if they never trade: claiming a profile unlocks a free growth dashboard. The platform runs entirely on simulated currency. Nothing has cash value, there are no purchases, and no prizes. This keeps it cleanly outside securities, gambling, and money transmission law while the architecture stays ready for a future compliant evolution.

## The market (50 artists)

Fifty real Ohio artists, each verified against a live Spotify artist profile, spanning hip-hop, alt rock, indie folk, funk, country, electro-pop, prog, jam, and indie pop. Range: Doe Boy and Snarls and MG Sleepy at the top (100K+ monthly listeners) down to zero-listener lottery tickets. Fourteen artists are priced on hand-verified listener counts; the rest carry tiered estimates and display an "est." badge until real numbers are entered, at which point a database trigger marks them verified and gaps their price toward true value.

### Pricing model
- Momentum score = min(100, 14 x log10(monthly_listeners + 1))
- Fair value = 1 + (momentum/100) x 49 + min(sqrt(listeners)/100, 25)
- Engine (every 15 min): price += 2% mean reversion toward fair value + demand pressure (net bought shares / 500, capped at 1% per tick) + small jitter, clamped to +/-20% of the daily open, floor $0.05
- Weekly "earnings": admin enters fresh listener counts every Monday; prices gap on the new fundamentals

## Feature inventory

Trader side
- Market page: live ticker tape, pulse bar (next reprice countdown, season clock), movers, search, sort by price/change/fair-value gap, watchlists, activity feed
- The Tape: auto-generated weekly market recap (top gainer, loser, most traded, deepest value gap, trader count), published by cron every Sunday
- Monday Gap-Up Challenge: pick the artist whose listeners jump most at Monday's refresh; resolved by cron Tuesdays; winners earn The Oracle badge (feature-flagged)
- Artist pages: price chart, fair-value analysis, "Why it's moving" intelligence line built from 24h order flow and the fair-value gap, top backers, artist updates, sticky mobile trade bar, animated trade toasts
- Portfolio: positions with P/L, performance snapshots, achievements (8 badges computed live from the ledger), daily streak counter, public/private profile toggle
- Public portfolios: every leaderboard name links to /trader/:username showing live positions (opt-in)
- Leaderboard: season ranking with medal tiers
- Referrals: ?ref=username links attribute signups
- Share cards: a Netlify edge function injects per-artist Open Graph tags, so any shared artist link unfurls with name, ticker, live price, and artist photo
- PWA: installable to home screen, safe-area aware, page transitions, press feedback, reduced-motion respected

Artist side (Greenroom Studio)
- Claim flow with admin review; claimed artists get a verified badge
- Dashboard: current price, day change, holders, total fan investment
- Monthly listeners growth chart with running delta, fed by weekly metric history
- Editable bio and genre; post updates to fans (shown on artist page)

Admin (one-person operating model)
- Monday metrics editor: enter each artist's current monthly listeners; prices gap instantly; verification auto-flips
- Add Artist: paste a Spotify link plus listener count; ticker generation, snapshot, and 7-day chart backfill are automatic
- Claim review queue, fan artist-request inbox, command center stats

## Architecture

Frontend: React 18 + Vite + Tailwind SPA on Netlify (site id 71f828be-6d23-4a49-98c2-0e0f270dd771). Code-split vendor/charts/supabase chunks. netlify.toml builds `npm run build`, publishes `dist`. Edge function: netlify/edge-functions/artist-og.ts (OG injection on /artist/*).

Backend: Supabase project `uajheoltstvftdmnigaw` (Postgres, us-east-2, ~$10/mo).

Tables: artists, metric_snapshots, price_ticks, seasons, season_accounts, holdings, transactions (append-only ledger), profiles, watchlists, artist_updates, artist_claims, artist_requests, portfolio_snapshots, market_posts, predictions, feature_flags, audit_events (append-only, trigger-fed)

RPCs: execute_trade (row-locked, 20 trades/min throttle), ensure_account, get_leaderboard, artist_stats, top_holders, recent_activity, submit_claim, review_claim, update_my_artist, set_artist_metrics, admin_add_artist, admin_stats, touch_streak, get_achievements, get_public_portfolio, artist_pressure, submit_prediction, prediction_status, generate_market_recap (internal), resolve_predictions (internal), plus internal price engine, snapshot, and season rollover functions revoked from client roles

Cron: price engine every 15 min; portfolio snapshots daily 00:05 UTC; season rollover daily 00:30 UTC; weekly market recap Sundays 23:00 UTC; prediction resolution Tuesdays 16:00 UTC

Edge functions (Supabase): `signup` (admin-creates pre-confirmed accounts, bypasses the built-in 2-email/hour ceiling), `refresh-metrics` (dormant slot for future licensed-data automation)

Security: RLS on every table with initplan-optimized policies; clients cannot write market tables directly; all mutations flow through security-definer RPCs; immutable transaction ledger; append-only audit trail recording listings, claim decisions, metric changes, and delistings with actor identity; trade throttling; daily price clamps; feature flags for safe rollouts. The only key in this repo is the publishable anon key, which is designed to be public.

## Local dev
    npm install
    npm run dev

## Deploy
Netlify CLI (`netlify deploy --prod`), git integration, or drag-and-drop `dist`.

## Weekly operations
Monday: admin panel -> Monday metrics -> enter each artist's monthly listeners from the Spotify app (about 15 to 20 minutes for 50 artists). This single ritual powers prices, The Tape, Studio growth charts, prediction resolution, and est.-badge verification.

## Roadmap pointers
Next builds, in order: web push notifications (install the PWA to a real device first), investment clubs (flag exists), licensed metrics data (Chartmetric) replacing the manual pass, prizes gated on sweepstakes compliance at ~150 weekly actives. Full strategy, security assessment, compliance flags, and 12-month metrics live in the companion document greenroom-strategy-audit.md.
