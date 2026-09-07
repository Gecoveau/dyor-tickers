/** Per-action settings, stored by the property inspector. */
export type TickerSettings = {
  /** Symbol to look up, e.g. "AAPL" or "bitcoin". */
  ticker?: string;
  /** Which market the ticker belongs to. */
  assetType?: "stock" | "crypto";
  /** Optional label to show instead of the resolved symbol, e.g. "GOLD". */
  displayName?: string;
  /** Fiat currency for the displayed price. */
  currency?: string;
  /** Seconds between refreshes (stored as a string by the text field). */
  refresh?: number | string;
  /** Draw a 24h sparkline (and shrink the text to fit). */
  sparkline?: boolean;
  /** Show the asset's logo next to the ticker. */
  showLogo?: boolean;
  /** Price at/above which a fireworks reaction fires. */
  highLevel?: number | string;
  /** Price at/below which a nuke reaction fires. */
  lowLevel?: number | string;
};

/** Normalized quote returned by both providers. */
export type Quote = {
  price: number;
  /** Percentage change over the reference window (day for stocks, 24h for crypto). */
  changePct: number | null;
  /** Short display symbol, e.g. "AAPL" or "BTC". */
  symbol: string;
  /** Currency the price is quoted in, lowercased (e.g. "usd"). */
  currency: string;
  /** Recent price points for the sparkline (oldest → newest), when requested. */
  history?: number[];
  /** URL of the asset's logo, if a source is available. */
  logoUrl?: string;
};
