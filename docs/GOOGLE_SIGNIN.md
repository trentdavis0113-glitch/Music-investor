# Enabling Google sign-in

The app code is finished and deployed. Google sign-in is currently **switched off at the
provider level**, and turning it on needs two things I have no access to: a Google Cloud
OAuth client, and the Supabase Auth provider settings. Both are dashboard-only — there is
no Supabase MCP tool or API surface available here for either.

Once you complete Steps 1–3 the button works with no code change.

---

## Already done (no action needed)

| Change | Effect |
|---|---|
| `handle_new_user()` reads OAuth metadata | Google users get a real username from `full_name` / `name`, falling back to the email local part, instead of `trader_a1b2c3d4` |
| Avatar captured | `picture` / `avatar_url` from Google is stored on `profiles.avatar_url` |
| Season account provisioned | Google users get their $10,000 exactly like email users |
| `claim_referral()` RPC + client call | A `?ref=` invite is now attributed for OAuth signups, which bypass the signup Edge Function entirely |
| `prompt=select_account` | Testers with several Google accounts get to choose, rather than silently reusing whichever one the browser is signed into |
| Button disabled while redirecting | No double-click |

Verified against the live database with Google-shaped metadata:

| Google sends | Username assigned | Avatar | Account |
|---|---|---|---|
| `full_name: "Trent Davis"`, `picture` | `TrentDavis` | ✅ | $10,000 |
| nothing, email `jane.doe99@…` | `jane.doe99` | — | $10,000 |
| `full_name: "李雷"` | `zz_g3` (email local part) | ✅ | $10,000 |
| `full_name: "Trent Davis"` (collision) | `TrentDavis_1` | — | $10,000 |
| email signup `username: "PickedMyOwn"` | `PickedMyOwn` (unchanged) | — | $10,000 |

---

## Step 1 — Google Cloud OAuth client

<https://console.cloud.google.com/>

1. **Create or pick a project.**
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `Greenroom Exchange`
   - User support email + developer contact: your address
   - Scopes: the defaults (`email`, `profile`, `openid`) are enough — add nothing else
   - **Leave publishing status as "Testing".** In Testing mode you add up to 100 named
     test users and Google does **not** require app verification. For a four-person beta
     this is exactly what you want; publishing would trigger a review you don't need.
   - **Test users → Add users**: add the Google address of each of your four testers.
     Anyone not on that list gets "app is blocked" — this is the single most common
     reason a beta tester can't sign in.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins** — every origin the app is served from:
     ```
     https://greenroom-exchange-app.netlify.app
     https://greenroom-exchange.<your-subdomain>.workers.dev
     http://localhost:5173
     ```
   - **Authorized redirect URIs** — exactly one, and it is Supabase's callback, **not**
     your site:
     ```
     https://uajheoltstvftdmnigaw.supabase.co/auth/v1/callback
     ```
4. Copy the **Client ID** and **Client secret**.

> The redirect URI is the field people get wrong. It points at Supabase, which handles the
> exchange and *then* redirects to your app. Putting your own domain here produces
> `redirect_uri_mismatch`.

---

## Step 2 — Supabase provider

Supabase → **Authentication → Sign In / Providers → Google**

- Toggle **Enable Sign in with Google**
- Paste the **Client ID** and **Client Secret**
- Save

---

## Step 3 — Redirect allowlist

Supabase → **Authentication → URL Configuration**

- **Site URL**: your canonical URL (currently `https://greenroom-exchange-app.netlify.app`)
- **Redirect URLs**: the app sends users to `/portfolio` after sign-in, so add each origin
  it may be served from:
  ```
  https://greenroom-exchange-app.netlify.app/**
  https://greenroom-exchange.<your-subdomain>.workers.dev/**
  http://localhost:5173/**
  ```

Missing an entry here is the second most common failure: Google succeeds, then Supabase
refuses the final hop and dumps the user on the Site URL instead of `/portfolio`.

**Re-check this after the Cloudflare migration** — a new hostname needs adding in both
Step 1 and Step 3.

---

## Step 4 — Verify

1. Open `/auth` in a private window.
2. Click **Continue with Google**. You should get an account chooser.
3. Pick a test-user account, approve.
4. You should land on `/portfolio` with **$10,000** and a username derived from your
   Google name.
5. Confirm the profile row:

```sql
select u.email, p.username, p.avatar_url is not null as has_avatar,
       i.provider,
       (select count(*) from public.season_accounts s where s.user_id = u.id) as accounts,
       (select s.cash from public.season_accounts s where s.user_id = u.id)   as cash
  from auth.users u
  join auth.identities i on i.user_id = u.id
  left join public.profiles p on p.id = u.id
 where u.email = 'YOUR@GMAIL.COM';
```

Expect `provider = google`, `accounts = 1`, `cash = 10000.00`.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| "Google sign-in is not switched on yet." | Provider not enabled — Step 2 |
| `redirect_uri_mismatch` | Authorized redirect URI must be the **Supabase** callback, not your site — Step 1.3 |
| "Access blocked: app has not completed verification" | The account isn't in **Test users** — Step 1.2 |
| Signs in but lands on `/` instead of `/portfolio` | Origin missing from Redirect URLs — Step 3 |
| Signs in, but username is `trader_xxxxxxxx` | Google returned no name and the email local part was under 3 characters. Expected; the user can rename from Portfolio |
| Works on Netlify, fails on Cloudflare | New origin not added to Steps 1 and 3 |

## A note on account linking

Supabase links a Google identity to an existing user when the **email matches and is
verified**. So a tester who signed up with email/password and later uses Google with the
same Gmail address gets the same account, not a duplicate. If they used a *different*
address, they get a second, separate account — worth telling testers to pick one method
and stick with it.
