# DYOR Tickers

[![Elgato Marketplace](https://img.shields.io/badge/Elgato%20Marketplace-coming%20soon-8A2BE2?logo=elgato&logoColor=white)](https://marketplace.elgato.com/)
[![Plugin version](https://img.shields.io/github/package-json/v/Gecoveau/dyor-tickers?label=plugin&color=1E90FF)](https://github.com/Gecoveau/dyor-tickers/releases)
[![License: MIT](https://img.shields.io/github/license/Gecoveau/dyor-tickers?color=success)](LICENSE)
[![Stream Deck 6.5+](https://img.shields.io/badge/Stream%20Deck-6.5%2B-2A2A2A?logo=elgato&logoColor=white)](https://www.elgato.com/stream-deck)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?logo=buymeacoffee&logoColor=black)](https://www.buymeacoffee.com/gecoveau)

A Stream Deck plugin that shows **live stock and crypto prices** on your keys.
Type a ticker, flip the stock/crypto switch — the tile draws the price and the
day/24h change (green up, red down), an optional mini sparkline and logo, and
refreshes on an interval.

**No API keys required.** Prices come from free, public endpoints:

- **Stocks / ETFs / indices** → [Yahoo Finance](https://finance.yahoo.com) (keyless chart endpoint)
- **Crypto** → [CoinGecko](https://www.coingecko.com/en/api) public API

## The "Ticker Price" action

The property inspector (the settings panel in the Stream Deck app) has:

| Field | Notes |
|-------|-------|
| **Type** | Stock or Crypto toggle |
| **Ticker** | Stock: exchange symbol (`AAPL`, `SPY`). Crypto: CoinGecko **id** (`bitcoin`, `ethereum`, `solana`) — not the symbol. |
| **Display as** | Optional label shown instead of the resolved symbol (e.g. `GOLD`). |
| **Currency** | Display currency for crypto (USD, EUR, GBP, JPY, AUD, CAD). Stocks quote in their native currency. |
| **Refresh** | 15–300s. Kept ≥15s to protect the free public endpoints. |
| **Asset logo** | Show the asset's logo next to the ticker. |
| **24h sparkline** | Draw a mini price chart with a dashed reference baseline. |
| **Alert high 🎆** | Plays a fireworks animation when the price hits/exceeds this level (≤ once/hour). |
| **Alert low 💥** | Plays a "nuke" animation when the price falls to/below this level (≤ once/hour). |

Press a key any time to force an immediate refresh. Quotes are briefly cached so
multiple tiles of the same asset — and rapid refreshes — share one network call.

## How it's built

- **TypeScript**, bundled with **Rollup** into a single self-contained
  `bin/plugin.js` so the plugin ships without `node_modules`. Built on Elgato's
  official [`@elgato/streamdeck`](https://www.npmjs.com/package/@elgato/streamdeck) SDK.
- **Keyless data.** Stock quotes come from Yahoo Finance's public v8 chart
  endpoint (price + prior close in one call, no crumb/cookie); crypto from
  CoinGecko's public API. No keys, no accounts, no per-user rate-limit setup.
- **Tiles are rendered SVG.** Each key is drawn as a 144×144 SVG — price,
  colored change, optional sparkline with a dashed reference baseline, and the
  asset logo — then handed to Stream Deck as a base64 data URI.
- **Shared quote cache.** A short-lived in-memory cache means multiple tiles of
  the same asset, rapid refreshes, and manual presses collapse into one network
  call — the main defense against upstream `429`s. A transient error keeps the
  last good price on screen instead of blanking the tile.
- **Reaction animations.** Crossing a high/low alert level plays a short
  fireworks 🎆 or "nuke" 💥 sequence, throttled to once per hour per direction.

### Build from source

```bash
npm install
npm run build   # bundle src -> com.skizd.deckedstream.sdPlugin/bin/plugin.js
npm run watch   # rebuild + hot-restart the plugin in Stream Deck on change
```

## Project layout

```
src/
  plugin.ts                entry point, registers the action
  actions/ticker-price.ts  the tile: polling, key press, settings, alerts
  providers.ts             Yahoo Finance + CoinGecko fetchers (keyless)
  render.ts                SVG tile renderer (price, change, sparkline, alerts)
  logos.ts                 fetches + caches asset logos as data URIs
  types.ts                 settings + quote types
com.skizd.deckedstream.sdPlugin/
  manifest.json            plugin + action definition
  ui/ticker.html           property inspector (settings panel)
  imgs/                     plugin + action icons (the rocket-O logo)
  bin/plugin.js            bundled output (git-ignored)
scripts/gen-icons.mjs      generates the icon PNGs from assets/rocket.mjs
```

## License

[MIT](LICENSE) © Gecoveau

---

If this saved you a browser tab, you can [buy me a coffee ☕](https://www.buymeacoffee.com/gecoveau).
