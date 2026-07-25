import type { Context, Config } from "@netlify/edge-functions";

// Injects per-artist Open Graph tags so shared artist links unfurl with the
// artist's photo, name, ticker, and live price in iMessage/Instagram/Discord.

const SUPABASE = "https://uajheoltstvftdmnigaw.supabase.co/rest/v1";
const ANON = "sb_publishable_tW2mUsRFGSogR6LshkLzNw_TIy292yE";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export default async (req: Request, context: Context) => {
  const res = await context.next();
  const match = new URL(req.url).pathname.match(/^\/artist\/(\d+)/);
  if (!match) return res;

  const html = await res.text();
  try {
    const headers = { apikey: ANON, Authorization: `Bearer ${ANON}` };
    const [artistRes, tickRes] = await Promise.all([
      fetch(`${SUPABASE}/artists?id=eq.${match[1]}&select=name,symbol,genre,image_url`, { headers }),
      fetch(`${SUPABASE}/price_ticks?artist_id=eq.${match[1]}&select=price&order=ts.desc&limit=1`, { headers }),
    ]);
    const [artist] = await artistRes.json();
    const [tick] = await tickRes.json();
    if (!artist) return new Response(html, res);

    const price = tick ? `$${Number(tick.price).toFixed(2)}` : "";
    const title = esc(`${artist.name} ($${artist.symbol}) ${price ? "· " + price : ""} — Greenroom Exchange`);
    const desc = esc(
      `Trade shares of ${artist.name}${artist.genre ? " (" + artist.genre + ")" : ""}. ` +
      `Prices move on real monthly listeners and trader demand. Simulated cash, real momentum.`
    );

    let out = html
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      .replace(/(property="og:title" content=")[^"]*(")/, `$1${title}$2`)
      .replace(/(property="og:description" content=")[^"]*(")/, `$1${desc}$2`)
      .replace(/(name="description" content=")[^"]*(")/, `$1${desc}$2`);
    if (artist.image_url) {
      out = out.replace(/(property="og:image" content=")[^"]*(")/, `$1${esc(artist.image_url)}$2`);
    }
    return new Response(out, { status: res.status, headers: res.headers });
  } catch {
    return new Response(html, res);
  }
};

export const config: Config = {
  path: "/artist/*",
};
