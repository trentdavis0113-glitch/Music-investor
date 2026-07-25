# Signup troubleshooting

When a tester says "signup didn't work", work down this list in order. Each step names
exactly where to look and what a healthy result looks like.

## 0. What to ask the tester for

- The **exact wording** of the on-screen message (screenshot preferred).
- The email address they used, and the username they typed.
- Device + browser.

The app never shows raw database errors, so whatever they read is one of the messages
listed in step 3.

## 1. Is the right code deployed?

Netlify → **greenroom-exchange-app** → *Deploys*.

- The most recent deploy should be **Published**, and its commit should match the tip of
  `claude/github-website-sync-addaah` in `trentdavis0113-glitch/Music-investor`.
- If the newest deploy says "Deploy triggered by upload" / no commit, the site is running a
  manually uploaded ZIP, not the repo. That is the most likely cause of stale behaviour.
- Build settings should be: build command `npm run build`, publish directory `dist`.
- No environment variables are required. Supabase URL and the publishable key are compiled
  in from `src/lib/supabase.js`. `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` only need
  setting if the project or key ever changes.

## 2. What did the browser actually send?

Tester's browser → DevTools → *Network* → filter `signup`.

Healthy request:

| | |
|---|---|
| URL | `https://uajheoltstvftdmnigaw.supabase.co/functions/v1/signup` |
| Method | `POST` |
| Header | `apikey: sb_publishable_…` |
| Status | `200` |

Common failures:

- **401 `unauthorized`** — the request carried no usable key. The function accepts the key on
  either `apikey` or `Authorization: Bearer`, so this generally means a proxy stripped the
  header, or a very stale bundle is cached. Hard-refresh.
- **No request at all** — client-side validation stopped it. Check the password is 8+
  characters and the email contains `@`.
- **CORS error** — the function is down or was redeployed mid-request. See step 4.

## 3. Message-to-cause map

| Tester sees | Meaning | Action |
|---|---|---|
| "That email already has an account. Sign in instead." | Address already registered. The form switches to sign-in and keeps the email. | Have them sign in, or use "Forgot password?" |
| "Your account was created. Sign in to finish." | Account exists, automatic sign-in didn't complete. **Not a failure.** | They sign in normally. |
| "That username is taken." | Live availability check. | Pick another; the button is disabled until they do. |
| "Too many signups right now." | Supabase auth rate limit. | Wait a few minutes. |
| "That took too long…" | Request timed out. Deliberately **not** retried, because the account may already exist. | Try signing in first; if that fails, sign up again. |
| "You appear to be offline." | Network/transport failure. | Check connection. |
| "Could not create your account." | Server-side failure. | Go to step 4. |

## 4. Supabase Edge Function logs

Supabase → **artist-exchange** → *Edge Functions* → `signup` → *Logs*.

Every line is structured JSON with an `evt` field. No passwords or tokens are ever logged.

| `evt` | Meaning |
|---|---|
| `signup.received` | Request accepted; shows email domain and username length only |
| `signup.unauthorized` | Key missing/unrecognised (see step 2) |
| `signup.validation_failed` | `reason` gives the field |
| `signup.auth_user_created` | Auth user exists — from here it is a sign-in problem, not signup |
| `signup.provisioned` | Shows assigned username, whether renamed, and season account count |
| `signup.provisioning_incomplete` | **Investigate.** Profile or season account missing |
| `signup.auth_user_failed` | `reason` = email_taken / rate_limited / password_rejected / unexpected |
| `signup.referral_failed` | Harmless; referral attribution only |

## 5. Did the account actually get created?

Supabase → *Authentication* → *Users*, search the email. If present, the auth user exists
and the problem is sign-in, not signup.

Then confirm the supporting rows (SQL editor):

```sql
select u.email, p.username,
       (select count(*) from public.profiles       x where x.id = u.id)       as profiles,
       (select count(*) from public.season_accounts s where s.user_id = u.id) as accounts,
       (select s.cash from public.season_accounts s where s.user_id = u.id)   as cash
  from auth.users u
  left join public.profiles p on p.id = u.id
 where u.email = 'THEIR@EMAIL.HERE';
```

Healthy: `profiles = 1`, `accounts = 1`, `cash = 10000.00`.

If `accounts = 0`, the user can sign in but has no bankroll. Repair:

```sql
insert into public.season_accounts (user_id, season_id, cash)
select u.id, s.id, s.starting_bankroll
  from auth.users u
 cross join lateral (
   select id, starting_bankroll from public.seasons
    where now() between starts_at and ends_at
    order by starts_at desc limit 1) s
 where u.email = 'THEIR@EMAIL.HERE'
on conflict (user_id, season_id) do nothing;
```

## 6. Season sanity

Everything depends on one active season. If this returns no row, **no one** can get a
balance and `ensure_account()` raises "No active season":

```sql
select id, name, starts_at, ends_at from public.seasons
 where now() between starts_at and ends_at;
```

Season 1 runs until **2 October 2026**. `public.ensure_season()` opens the next one but is
not called by the app — run it manually if the season lapses.

## 7. Full re-verification

`supabase/tests/signup_smoke.sql` creates two throwaway users, asserts provisioning and
permissions, exercises a trade, and cleans up. Run it whenever the trigger, the RLS
policies, or the grants change.
