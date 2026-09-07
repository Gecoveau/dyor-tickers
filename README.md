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

## Develop

```bash
npm install
npm run build          # bundle src -> com.skizd.deckedstream.sdPlugin/bin/plugin.js
npm run watch          # rebuild + restart the plugin in Stream Deck on change
```

Link the plugin into the Stream Deck app for local testing (installs the folder,
not the packed file):

```bash
npx streamdeck link com.skizd.deckedstream.sdPlugin
npx streamdeck restart com.skizd.deckedstream
```

## Package for the Marketplace

```bash
npx streamdeck validate com.skizd.deckedstream.sdPlugin
npx streamdeck pack com.skizd.deckedstream.sdPlugin
```

Produces `com.skizd.deckedstream.streamDeckPlugin`. Submit it at
<https://marketplace.elgato.com/> (a free Maker account is required).

> **Icons:** the art in `imgs/` is flat placeholder graphics — replace it with
> real artwork before submitting to the Marketplace, which reviews listing art.
> `scripts/gen-icons.mjs` regenerates the placeholders.

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
  imgs/                     icons (placeholders — replace before submitting)
  bin/plugin.js            bundled output (git-ignored)
scripts/gen-icons.mjs      regenerates placeholder PNGs
```

## License

[MIT](LICENSE) © Gecoveau

---

If this saved you a browser tab, you can [buy me a coffee ☕](https://www.buymeacoffee.com/gecoveau).
