import type { Quote } from "./types";

// Short-lived quote cache so rapid refreshes, retries, and multiple tiles of the
// same asset share one network call — this is the main defense against 429s.
const CACHE_TTL = 12_000;
const quoteCache = new Map<string, { at: number; quote: Quote }>();

function cached(key: string): Quote | undefined {
  const hit = quoteCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    return hit.quote;
  }
  return undefined;
}
function store(key: string, quote: Quote): Quote {
  quoteCache.set(key, { at: Date.now(), quote });
  return quote;
}

/** fetch() with a hard timeout so a stalled request surfaces as an error. */
async function fetchJson(url: URL, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a stock/ETF/index quote from Yahoo Finance — no API key required.
 * The v8 chart endpoint returns price + prior close in its `meta` block and,
 * unlike the v7 quote endpoint, doesn't require a crumb/cookie.
 */
export async function fetchStockQuote(symbol: string, withHistory = false): Promise<Quote> {
  const sym = symbol.toUpperCase();
  const key = `stock:${sym}:${withHistory ? 1 : 0}`;
  const hit = cached(key);
  if (hit) {
    return hit;
  }

  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}`);
  // A finer interval yields intraday points for the sparkline; 1d is one point.
  url.searchParams.set("interval", withHistory ? "5m" : "1d");
  url.searchParams.set("range", "1d");

  // A browser-like UA avoids Yahoo's default-agent blocking.
  const res = await fetchJson(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) {
    throw new Error(`Yahoo ${res.status}`);
  }

  const data = (await res.json()) as {
    chart?: {
      result?: Array<{
        meta?: {
          symbol?: string;
          regularMarketPrice?: number;
          chartPreviousClose?: number;
          previousClose?: number;
          currency?: string;
        };
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>;
    };
  };

  const result = data.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta || meta.regularMarketPrice === undefined) {
    throw new Error(`Unknown symbol "${symbol}"`);
  }

  const prev = meta.chartPreviousClose ?? meta.previousClose;
  const changePct = prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : null;
  const history = withHistory
    ? (result?.indicators?.quote?.[0]?.close ?? []).filter((n): n is number => typeof n === "number")
    : undefined;

  return store(key, {
    price: meta.regularMarketPrice,
    changePct,
    symbol: (meta.symbol ?? sym).toUpperCase(),
    currency: (meta.currency ?? "USD").toLowerCase(),
    history,
    // Best-effort keyless logo; the fetch falls back to no logo if unavailable.
    logoUrl: `https://financialmodelingprep.com/image-stock/${encodeURIComponent(sym)}.png`
  });
}

/**
 * Fetch a crypto quote from CoinGecko's public API — no API key required.
 * /coins/markets returns the ticker symbol alongside price + 24h change.
 * Docs: https://docs.coingecko.com/reference/coins-markets
 */
export async function fetchCryptoQuote(
  id: string,
  currency: string,
  withHistory = false
): Promise<Quote> {
  const vs = currency.toLowerCase();
  const coin = id.toLowerCase();
  const key = `crypto:${coin}:${vs}:${withHistory ? 1 : 0}`;
  const hit = cached(key);
  if (hit) {
    return hit;
  }

  const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
  url.searchParams.set("vs_currency", vs);
  url.searchParams.set("ids", coin);

  const res = await fetchJson(url);
  if (res.status === 429) {
    throw new Error("Rate limited"); // CoinGecko public tier — back off, keep last price
  }
  if (!res.ok) {
    throw new Error(`CoinGecko ${res.status}`);
  }

  const data = (await res.json()) as Array<{
    symbol?: string;
    current_price?: number;
    price_change_percentage_24h?: number;
    image?: string;
  }>;
  const row = data[0];
  if (!row || row.current_price === undefined) {
    throw new Error(`Unknown coin "${id}"`);
  }

  return store(key, {
    price: row.current_price,
    changePct: row.price_change_percentage_24h ?? null,
    symbol: (row.symbol ?? id).toUpperCase(),
    currency: vs,
    history: withHistory ? await fetchCryptoHistory(coin, vs) : undefined,
    logoUrl: row.image
  });
}

// History changes slowly, so cache it well beyond the price TTL and reuse the
// last-known series when a refetch fails — this keeps the sparkline from
// flickering off on transient 429s (and cuts how often we call market_chart).
const HISTORY_TTL = 5 * 60_000;
const historyCache = new Map<string, { at: number; data: number[] }>();

/** 24h price series from CoinGecko for the sparkline. Best-effort, sticky. */
async function fetchCryptoHistory(coin: string, vs: string): Promise<number[] | undefined> {
  const key = `${coin}:${vs}`;
  const prev = historyCache.get(key);
  if (prev && Date.now() - prev.at < HISTORY_TTL) {
    return prev.data;
  }

  try {
    const url = new URL(`https://api.coingecko.com/api/v3/coins/${coin}/market_chart`);
    url.searchParams.set("vs_currency", vs);
    url.searchParams.set("days", "1");
    const res = await fetchJson(url);
    if (!res.ok) {
      return prev?.data; // keep the last good series through a 429
    }
    const data = (await res.json()) as { prices?: Array<[number, number]> };
    const series = data.prices?.map(([, p]) => p);
    if (series && series.length >= 2) {
      historyCache.set(key, { at: Date.now(), data: series });
      return series;
    }
    return prev?.data;
  } catch {
    return prev?.data;
  }
}
