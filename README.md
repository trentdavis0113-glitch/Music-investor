# Signal Chain

A reference library of vocal chains, taken from published interviews with the engineers who
recorded and mixed the records — stage by stage, with the sourcing shown, free and stock
alternatives for every plugin, and an inventory of what you own so any chain can be rebuilt
out of tools you actually have.

Static site. No backend, no accounts, no network calls at runtime.

## Why it exists

Search for any artist's vocal chain and you get a dozen confident lists with no citation,
most of them selling a preset pack. This catalog does the opposite: every stage is labelled
with how well sourced it is, and where nobody has published anything, the entry says so
instead of filling the gap.

Three levels, shown on every stage and summarised per chain:

| Level | Means |
| --- | --- |
| **Documented** | The engineer or producer said this on the record, in the source cited on the entry. |
| **Reported** | Trade press or a manufacturer's artist feature states it, but not in the engineer's own words. |
| **Reconstructed** | Nobody published this. An informed reconstruction from the record and the era's tools. |

Settings carry the same distinction one level down. A stage marked **From the source**
quotes values the engineer gave. A stage marked **Our starting point** is a suggestion for
getting in the neighbourhood — most engineers do not publish knob positions, so most
settings here are ours, and they say so.

## What's in it

15 chains: Michael Jackson (Bruce Swedien), Adele and Amy Winehouse (Tom Elmhirst), Drake
(Noah "40" Shebib), Beyoncé (Stuart White), Billie Eilish (FINNEAS / Rob Kinelski), SZA (Rob
Bisel), Post Malone (Louis Bell), Bon Iver (Chris Messina), Daft Punk (Mick Guzauski),
Kendrick Lamar (MixedByAli), The Weeknd (Illangelo), Tame Impala (Kevin Parker), Travis
Scott (Alex Tumay / Mike Dean), Taylor Swift (Serban Ghenea).

Around 90 pieces of gear, from an SM7 to a Fairchild 660, each with the plugins that model
it and the free alternatives that get close.

## Features

- **Chain pages** — the recording chain and the mix chain in order. Each stage expands to
  the engineer's reasoning, the settings, and what you can use instead.
- **My rack** — mark what you own; every chain rewrites itself around it and shows how much
  of it you can build. localStorage only, per-device, nothing leaves the browser.
- **DAW awareness** — pick your DAW and every stage names the stock plugin that covers the
  same job, alongside the free option.
- **What to get next** — ranks unowned plugins by how many stages they'd cover that nothing
  in your rack already covers, so it stops recommending compressors once you own one.
- **Plugin index** — every item ordered by how many stages it appears in, which is a better
  guide to what's worth buying than any review.
- **Compare** — two chains aligned by what each stage *does* rather than by position, plus
  a sourcing bar for each.
- **Learn** — the default stage order and why, the places these records deliberately break
  it, and a glossary.
- **Recipe export** — copy or download any chain as Markdown, sourcing and citations intact.

## Local dev

```sh
npm install
npm run dev          # vite dev server
npm run build        # static bundle into dist/
npm test             # vitest — data integrity, substitution logic, export format
npm run test:e2e     # playwright, desktop + mobile
```

Deploy `dist/` anywhere that serves static files. Configure the host to rewrite unknown
paths to `/index.html`, since routing is client-side. Set `SITE_URL` at build time so the
`og:`/`twitter:` tags carry absolute URLs for the real domain.

## Layout

```
src/data/plugins.js    gear registry — tiers, prices, emulations, alternatives, per-DAW stock
src/data/chains.js     the catalog — one object per artist, with sources and confidence
src/data/glossary.js   stage order, the documented exceptions to it, and terms
src/lib/build.js       resolves a stage into something the reader can actually use
src/lib/recipe.js      Markdown export
src/lib/store.js       localStorage for the rack and DAW choice
src/components/        StageCard and the shared badges
src/pages/             Library, Chain, Plugins, Rack, Compare, Learn, About
```

### Adding a chain

Append an object to `CHAINS` in `src/data/chains.js`. Every plugin id must exist in
`PLUGINS`; every stage needs a `confidence`; any settings list needs a `settingsOrigin`; and
if any stage is less than `documented`, the chain needs a `caveat` explaining what isn't
known. `npm test` enforces all of that, plus that every referenced plugin has a free or
stock route, so a new entry can't quietly become an uncited list.

### Corrections

If you engineered one of these records and something here is wrong, it is wrong. Every
entry is a plain object with a `sources` array — a correction with a citation beats
anything on the site.

## Disclaimer

Not affiliated with, endorsed by, or connected to any artist, engineer, studio or plugin
manufacturer named. All trademarks belong to their owners; product names identify equipment
described in published interviews. Prices are approximate USD list prices and go stale fast.
Nothing here is for sale.
