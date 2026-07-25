# Moving Greenroom Exchange to Cloudflare

The repo is deploy-ready for Cloudflare Workers. Nothing here has been deployed yet —
this environment has no network access to `api.cloudflare.com`, and the connected
Cloudflare account currently has **zero Workers**. Everything below is the exact sequence
to run.

**Netlify is untouched and still live.** Cut over deliberately, then delete `netlify.toml`.

---

## What changed in the repo

| File | Purpose |
|---|---|
| `wrangler.jsonc` | Workers + static assets config |
| `worker/index.ts` | Per-artist Open Graph injection (port of the Netlify edge function) |
| `vite.config.js` | Injects `SITE_URL` into the absolute `og:`/`twitter:` tags at build time |
| `index.html` | Hardcoded `netlify.app` URLs replaced with `%SITE_URL%` |
| `netlify.toml` | Pins `SITE_URL` to the Netlify domain so the live site stays correct until cutover |
| `package.json` | `cf:dev`, `cf:check`, `cf:deploy` scripts + `wrangler` devDependency |

### How routing works

```jsonc
"assets": {
  "directory": "./dist",
  "binding": "ASSETS",
  "not_found_handling": "single-page-application",  // /portfolio, /terms survive refresh
  "run_worker_first": ["/artist/*"]                 // only artist pages invoke the Worker
}
```

Everything except `/artist/*` is served straight from Cloudflare's cache with **no Worker
invocation** — so the Worker costs nothing on the hot paths. On `/artist/123` the Worker
fetches the artist and latest price from Supabase and rewrites the share tags with
`HTMLRewriter` (streaming, order-independent — an improvement on the Netlify version's
string replacement). If Supabase is slow or errors, it returns the unmodified page rather
than failing.

The Worker also rewrites `og:url` / `og:image` from the **live request origin**, so artist
links unfurl correctly on `workers.dev`, a custom domain, or a preview URL without a rebuild.

---

## Step 1 — API token

Dashboard → **My Profile → API Tokens → Create Token** → use the **"Edit Cloudflare Workers"**
template.

That template is broader than strictly necessary, but it is the supported choice: deploying
static assets touches several scopes (script upload, asset upload sessions, account read),
and hand-trimming it commonly fails at the asset-upload step with an opaque 403.

Set **Account Resources** to the account holding this project. Zone resources are only
needed if you attach a custom domain (Step 5).

You also need your **Account ID**: Dashboard → Workers & Pages → right sidebar.

```bash
export CLOUDFLARE_API_TOKEN="<token>"
export CLOUDFLARE_ACCOUNT_ID="<account id>"

# verify the token before using it
curl -s https://api.cloudflare.com/client/v4/user/tokens/verify \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq .
```

Expect `"status": "active"`.

---

## Step 2 — Deploy

### Option A — Git-connected (recommended)

Mirrors what Netlify does now: every push to the branch builds and deploys, and Cloudflare
manages its own API token.

Dashboard → **Workers & Pages → Create → Workers → Import a repository**

| Setting | Value |
|---|---|
| Repository | `trentdavis0113-glitch/Music-investor` |
| Branch | `claude/github-website-sync-addaah` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Build variable | `SITE_URL` = your final URL (see Step 4) |

### Option B — From your machine

```bash
git clone https://github.com/trentdavis0113-glitch/Music-investor
cd Music-investor
git checkout claude/github-website-sync-addaah
npm ci

npx wrangler login              # or use the env vars from Step 1
npm run cf:check                # dry run: validates config, bundles the Worker
SITE_URL="https://greenroom-exchange.<your-subdomain>.workers.dev" npm run cf:deploy
```

`cf:check` has already been run here and passes: 13 assets, Worker bundle 2.92 KiB,
`ASSETS` binding present.

### Option C — Raw REST API

Only worth it if you are scripting outside wrangler. Uploading a Worker **with static
assets** is a three-call handshake, not a single PUT:

1. `POST /accounts/{account_id}/workers/scripts/{script_name}/assets-upload-session`
   with a manifest of `{path: {hash, size}}` → returns an upload JWT and the list of
   hashes Cloudflare doesn't already have.
2. `POST /accounts/{account_id}/workers/assets/upload?base64=true` with that JWT, in
   batches, until it returns a **completion JWT**.
3. `PUT /accounts/{account_id}/workers/scripts/{script_name}` — multipart, with the Worker
   module plus a metadata part containing
   `{"main_module":"index.js","assets":{"jwt":"<completion JWT>","config":{...}},"compatibility_date":"2026-07-25"}`.

Getting hashing, batching and the JWT lifetime right is fiddly, and wrangler implements
exactly this. Use `npx wrangler deploy` unless you have a specific reason not to.

To inspect what is deployed:

```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq '.result[].id'
```

---

## Step 3 — Verify before cutover

The Worker gets a `*.workers.dev` URL immediately. Check it before touching DNS:

- [ ] `/` loads and the market renders
- [ ] `/portfolio` **on a hard refresh** (proves `not_found_handling`)
- [ ] `/terms` and a bogus URL → 404 page
- [ ] `/artist/1` loads, and `curl -s <url>/artist/1 | grep 'og:title'` shows the artist's
      name and price rather than the generic title (proves the Worker + `run_worker_first`)
- [ ] Sign up with a throwaway address → lands in the app with $10,000
- [ ] Sign out, sign back in

Supabase needs **no changes**: the publishable key is domain-agnostic and there is no
allowed-origins list in play. The signup Edge Function's CORS is `*`.

---

## Step 4 — SITE_URL

Absolute URLs are required in `og:`/`twitter:` tags, so the canonical origin is baked in at
build time. Set `SITE_URL` in the Cloudflare build environment to your final URL. If it is
unset the build falls back to `https://greenroom-exchange.workers.dev`, which is wrong for
any other hostname — the page still works, but share cards point at the wrong host.

Artist pages self-correct at runtime; the home page does not.

---

## Step 5 — Custom domain (optional)

Workers & Pages → your Worker → **Settings → Domains & Routes → Add custom domain**.
Cloudflare provisions the certificate and DNS record. Then rebuild with `SITE_URL` set to it.

---

## Step 6 — Cutover and cleanup

1. Confirm the Cloudflare URL passes Step 3.
2. Send testers the new link.
3. In Netlify, **stop auto-publishing** (Site config → Build & deploy → Stop builds) —
   leave the site up briefly as a fallback.
4. Delete `netlify.toml`, `public/_redirects` and `netlify/edge-functions/` once you are
   confident. Cloudflare ignores them, so there is no rush.

### Rollback

Netlify still builds from the same branch. Re-enable builds and the previous site returns.
Nothing in this migration changes Supabase, so no data or auth state is at risk.

---

## The application's API

For reference, the frontend talks to exactly one backend — Supabase project
`uajheoltstvftdmnigaw` — using the publishable key `sb_publishable_…` compiled into the
bundle. Both are public by design and safe in client code; access is governed by row-level
security.

| Surface | Endpoint | Notes |
|---|---|---|
| Signup | `POST /functions/v1/signup` | Key on the `apikey` header. Returns `{ok, username, renamed, provisioned}` or `{error, code}` with codes `email_taken` (409), `rate_limited` (429), `bad_email` / `bad_password` / `bad_username` (400) |
| Auth | `/auth/v1/*` | Handled by `@supabase/supabase-js` |
| Data | `/rest/v1/{table}` | PostgREST, RLS-enforced |
| Game logic | `/rest/v1/rpc/{fn}` | `execute_trade`, `ensure_account`, `get_leaderboard`, `username_available`, … |

`verify_jwt` is **off** for the signup function and must stay off — Cloudflare has no
bearing on this. See `supabase/config.toml` for why.
