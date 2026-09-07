import type { Quote } from "./types";

const BG = "#000000";
const UP = "#00D15A"; // deep vivid green (text / arrow / sparkline)
const DOWN = "#FF453A"; // vivid red
const NEUTRAL = "#8a8a8f";

// Deeper tones used for the background gradient so it reads rich, not washed.
const FADE_UP = "#008F3C";
const FADE_DOWN = "#B71C1C";
const BASELINE = "#e8e8ee";

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: "$",
  eur: "€",
  gbp: "£",
  jpy: "¥",
  aud: "A$",
  cad: "C$"
};

function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency.toLowerCase()] ?? "";
  // Show more decimals for sub-dollar coins so small prices stay readable.
  const decimals = price >= 1000 ? 0 : price >= 1 ? 2 : price >= 0.01 ? 4 : 6;
  const value = price.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return `${symbol}${value}`;
}

/** Rough per-character advance (in em) for bold Arial, for width fitting. */
function charEm(c: string): number {
  if (c === "." || c === ",") return 0.28;
  if (c === " ") return 0.3;
  if (/[0-9$€£¥]/.test(c)) return 0.56;
  return 0.62;
}
function measureEm(text: string): number {
  let w = 0;
  for (const c of text) w += charEm(c);
  return w || 1;
}
/** Largest font size (≤ base, ≥ min) that fits `text` within `maxWidth` px. */
function fitFont(text: string, maxWidth: number, base: number, min: number): number {
  return Math.max(min, Math.min(base, maxWidth / measureEm(text)));
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;"
  );
}

/** Base64 data URI — the format Stream Deck reliably accepts for setImage. */
function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/**
 * Sparkline with a dashed baseline at `baseline` (the reference price the % is
 * measured from) so up/down is obvious. Line is colored by direction.
 */
function sparkline(
  history: number[],
  baseline: number | null,
  color: string,
  x0: number,
  y0: number,
  w: number,
  h: number
): string {
  const pts = history.length > 120 ? history.slice(-120) : history;
  // Include the baseline in the scale so it's always visible.
  const scaleVals = baseline !== null ? [...pts, baseline] : pts;
  let min = Math.min(...scaleVals);
  let max = Math.max(...scaleVals);
  // Headroom so the line and baseline never sit flush against the box edges.
  const pad = (max - min || 1) * 0.22;
  min -= pad;
  max += pad;
  const span = max - min || 1;
  const yFor = (v: number) => y0 + h - ((v - min) / span) * h; // higher price → higher up
  const step = w / Math.max(1, pts.length - 1);

  const poly = pts.map((v, i) => `${(x0 + i * step).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");
  const base =
    baseline !== null
      ? `<line x1="${x0}" y1="${yFor(baseline).toFixed(1)}" x2="${x0 + w}" y2="${yFor(baseline).toFixed(1)}" stroke="${BASELINE}" stroke-width="1.4" stroke-dasharray="4 3" opacity="0.85"/>`
      : "";

  return `${base}<polyline points="${poly}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
}

type RenderOpts = { sparkline?: boolean; logo?: string | null };

/** Build a 144x144 SVG data URI for a live quote. */
export function renderQuote(label: string, quote: Quote, currency: string, opts: RenderOpts = {}): string {
  const hasChange = quote.changePct !== null;
  const up = (quote.changePct ?? 0) >= 0;
  const accent = !hasChange ? NEUTRAL : up ? UP : DOWN;
  const arrow = !hasChange ? "" : up ? "▲" : "▼";
  const changeText = !hasChange ? "" : `${arrow} ${Math.abs(quote.changePct as number).toFixed(2)}%`;

  const fadeColor = !hasChange ? NEUTRAL : up ? FADE_UP : FADE_DOWN;
  const showSpark = !!opts.sparkline && !!quote.history && quote.history.length >= 2;

  // Longer, deeper gradient in the direction color.
  const fade = !hasChange
    ? ""
    : `<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${fadeColor}" stop-opacity="0"/>
      <stop offset="1" stop-color="${fadeColor}" stop-opacity="0.85"/>
    </linearGradient></defs>
  <rect x="0" y="16" width="144" height="128" fill="url(#fade)"/>`;

  // Text is larger when the sparkline is off; there the price is the centered hero.
  const L = showSpark
    ? { sym: { y: 30, s: 25 }, price: { y: 67, s: 27 }, chg: { y: 95, s: 19 } }
    : { sym: { y: 44, s: 29 }, price: { y: 87, s: 32 }, chg: { y: 121, s: 24 } };

  // Shrink the price to fit the tile width (e.g. 6-figure prices).
  const priceStr = formatPrice(quote.price, currency);
  const priceSize = fitFont(priceStr, 132, L.price.s, showSpark ? 17 : 20);

  // Baseline = the reference price the % change is measured from, so the
  // sparkline direction matches the displayed %.
  const baseline =
    hasChange && quote.changePct !== 0
      ? quote.price / (1 + (quote.changePct as number) / 100)
      : hasChange
        ? quote.price
        : null;
  const spark = showSpark
    ? sparkline(quote.history as number[], baseline, accent, 10, 108, 124, 30)
    : "";

  // Symbol row: when a logo is shown, center "symbol + logo" as a group and
  // vertically align the logo to the middle of the text (not its baseline).
  const symbolRow = (() => {
    const s = L.sym.s;
    if (!opts.logo) {
      return `<text x="72" y="${L.sym.y}" font-family="Arial, sans-serif" font-size="${s}" font-weight="700" fill="#f2f2f7" text-anchor="middle">${escapeXml(label)}</text>`;
    }
    const logoSize = showSpark ? 20 : 22;
    const gap = 12;
    const textW = Math.min(96, label.length * 0.7 * s); // rough bold-Arial advance
    const groupW = textW + gap + logoSize;
    const left = Math.max(6, 72 - groupW / 2);
    const logoX = left + textW + gap;
    const logoY = L.sym.y - 0.34 * s - logoSize / 2; // ~visual middle of the text
    return `<text x="${left.toFixed(1)}" y="${L.sym.y}" font-family="Arial, sans-serif" font-size="${s}" font-weight="700" fill="#f2f2f7" text-anchor="start">${escapeXml(label)}</text>
  <image href="${opts.logo}" x="${logoX.toFixed(1)}" y="${logoY.toFixed(1)}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`;
  })();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" fill="${BG}"/>
  ${fade}
  ${symbolRow}
  <text x="72" y="${L.price.y}" font-family="Arial, sans-serif" font-size="${priceSize.toFixed(1)}" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(priceStr)}</text>
  <text x="72" y="${L.chg.y}" font-family="Arial, sans-serif" font-size="${L.chg.s}" font-weight="800" fill="${accent}" text-anchor="middle">${escapeXml(changeText)}</text>
  ${spark}
</svg>`;

  return svgToDataUri(svg);
}

/** Build a 144x144 SVG data URI for an error / not-configured state. */
export function renderMessage(title: string, subtitle: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" fill="${BG}"/>
  <text x="72" y="66" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#ffd60a" text-anchor="middle">${escapeXml(title)}</text>
  <text x="72" y="96" font-family="Arial, sans-serif" font-size="15" fill="#c7c7cc" text-anchor="middle">${escapeXml(subtitle)}</text>
</svg>`;
  return svgToDataUri(svg);
}

// ── Threshold reactions ─────────────────────────────────────────────

/** One animation frame for a fireworks (high) or nuke (low) reaction. */
export function renderReaction(kind: "fireworks" | "nuke", frame: number, label: string): string {
  const inner = kind === "fireworks" ? fireworksFrame(frame) : nukeFrame(frame);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" fill="${BG}"/>
  ${inner}
  <text x="72" y="134" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#ffffff" text-anchor="middle">${escapeXml(label)}</text>
</svg>`;
  return svgToDataUri(svg);
}

const BURST_COLORS = ["#FFD60A", "#00E676", "#00E5FF", "#FF6BD6", "#FFFFFF"];

function burst(cx: number, cy: number, r: number, rays: number, color: string, seed = 0): string {
  let out = "";
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + seed;
    const x2 = cx + Math.cos(a) * r;
    const y2 = cy + Math.sin(a) * r;
    out += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.9"/>`;
    out += `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="2.4" fill="${color}"/>`;
  }
  return out;
}

function fireworksFrame(frame: number): string {
  const r = 10 + frame * 8; // expands over time
  const fade = Math.max(0.25, 1 - frame * 0.14);
  return `<g opacity="${fade.toFixed(2)}">
    ${burst(46, 52, r, 10, BURST_COLORS[frame % BURST_COLORS.length], 0.2)}
    ${burst(100, 44, r * 0.8, 9, BURST_COLORS[(frame + 2) % BURST_COLORS.length], 0.6)}
    ${burst(74, 78, r * 0.6, 8, BURST_COLORS[(frame + 4) % BURST_COLORS.length], 1.1)}
  </g>`;
}

function nukeFrame(frame: number): string {
  const ring = 8 + frame * 12; // shockwave grows
  const core = Math.max(4, 26 - frame * 3);
  return `<g>
    <circle cx="72" cy="60" r="${ring}" fill="none" stroke="#FF6B00" stroke-width="3" opacity="${Math.max(0, 0.9 - frame * 0.15).toFixed(2)}"/>
    <circle cx="72" cy="60" r="${(core + 10).toFixed(1)}" fill="#FF3B00" opacity="0.5"/>
    <circle cx="72" cy="60" r="${core.toFixed(1)}" fill="#FFD60A" opacity="0.95"/>
    <circle cx="72" cy="60" r="${(core * 0.5).toFixed(1)}" fill="#FFFFFF" opacity="0.9"/>
  </g>`;
}
