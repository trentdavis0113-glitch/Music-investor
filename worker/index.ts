/**
 * Cloudflare Worker: per-artist Open Graph tags.
 *
 * Port of netlify/edge-functions/artist-og.ts. Shared artist links need the artist's
 * name, ticker, price and photo in the unfurl, but the SPA shell is a single static
 * index.html — so the tags have to be rewritten at the edge.
 *
 * Uses HTMLRewriter rather than the string replacement the Netlify version used: it
 * streams, it cannot corrupt the document, and it does not depend on attribute order.
 *
 * Only runs for /artist/* (see run_worker_first in wrangler.jsonc).
 */

interface Env {
  ASSETS: Fetcher
}

const SUPABASE_URL = 'https://uajheoltstvftdmnigaw.supabase.co/rest/v1'
// Publishable key: public by design, identical to the one compiled into the bundle.
const SUPABASE_KEY = 'sb_publishable_tW2mUsRFGSogR6LshkLzNw_TIy292yE'

interface Artist {
  name: string
  symbol: string
  genre: string | null
  image_url: string | null
}

/** Rewrites a meta tag's content attribute. */
class SetContent {
  constructor(private value: string) {}
  element(el: Element) {
    el.setAttribute('content', this.value)
  }
}

/** Replaces the document title. */
class SetTitle {
  constructor(private value: string) {}
  element(el: Element) {
    el.setInnerContent(this.value)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // not_found_handling: single-page-application means this returns index.html.
    const assetResponse = await env.ASSETS.fetch(request)

    const match = new URL(request.url).pathname.match(/^\/artist\/(\d+)/)
    if (!match) return assetResponse

    // Never let a metadata problem stop the page from rendering.
    let artist: Artist | undefined
    let price: string | undefined
    try {
      const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      const [artistRes, tickRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/artists?id=eq.${match[1]}&select=name,symbol,genre,image_url`, { headers }),
        fetch(`${SUPABASE_URL}/price_ticks?artist_id=eq.${match[1]}&select=price&order=ts.desc&limit=1`, { headers }),
      ])
      if (!artistRes.ok || !tickRes.ok) return assetResponse

      artist = (await artistRes.json<Artist[]>())[0]
      const tick = (await tickRes.json<{ price: string }[]>())[0]
      if (tick) price = `$${Number(tick.price).toFixed(2)}`
    } catch {
      return assetResponse
    }

    if (!artist) return assetResponse

    const title = `${artist.name} ($${artist.symbol})${price ? ' · ' + price : ''} — Greenroom Exchange`
    const description =
      `Trade shares of ${artist.name}${artist.genre ? ' (' + artist.genre + ')' : ''}. ` +
      `Prices move on real monthly listeners and trader demand. Simulated cash, real momentum.`

    // Absolute and derived from the live request, so the same build unfurls correctly on
    // workers.dev, a custom domain, or a preview URL without rebuilding.
    const origin = new URL(request.url).origin
    const canonical = new URL(request.url).toString()
    const image = artist.image_url || `${origin}/icon-512.png`

    let rewriter = new HTMLRewriter()
      .on('title', new SetTitle(title))
      .on('meta[name="description"]', new SetContent(description))
      .on('meta[property="og:title"]', new SetContent(title))
      .on('meta[property="og:description"]', new SetContent(description))
      .on('meta[property="og:image"]', new SetContent(image))
      .on('meta[property="og:url"]', new SetContent(canonical))
      .on('meta[name="twitter:title"]', new SetContent(title))
      .on('meta[name="twitter:description"]', new SetContent(description))
      .on('meta[name="twitter:image"]', new SetContent(image))

    const out = rewriter.transform(assetResponse)

    // Let crawlers and the CDN cache the rendered shell briefly; prices move every 15 min.
    const headers = new Headers(out.headers)
    headers.set('Cache-Control', 'public, max-age=0, s-maxage=300')
    return new Response(out.body, { status: assetResponse.status, headers })
  },
} satisfies ExportedHandler<Env>
