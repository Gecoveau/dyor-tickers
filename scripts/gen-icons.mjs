// Renders assets/logo.png into every PNG the plugin needs, at exact sizes.
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

const TILE_BG = "#1c1c1e"; // dark background for the default key image + marketplace tile

const logoB64 = readFileSync("assets/logo.png").toString("base64");
const logoUri = `data:image/png;base64,${logoB64}`;

/** SVG wrapper placing the logo with padding, optionally on a background. */
function logoSvg({ bg, pad = 0.08 } = {}) {
  const p = pad * 100;
  const size = 100 - p * 2;
  const bgRect = bg ? `<rect width="100" height="100" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  ${bgRect}
  <image href="${logoUri}" x="${p}" y="${p}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
}

/** Rasterize an SVG string to a PNG buffer at the given pixel width. */
function render(svg, size) {
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
}

const base = "com.skizd.deckedstream.sdPlugin/imgs";

const iconSvg = logoSvg({ pad: 0.06 }); // transparent, tight — for UI icons
const keySvg = logoSvg({ bg: TILE_BG, pad: 0.16 }); // on a dark tile
const marketSvg = logoSvg({ bg: TILE_BG, pad: 0.12 });

const targets = [
  [`${base}/plugin/marketplace.png`, 288, marketSvg],
  [`${base}/plugin/marketplace@2x.png`, 576, marketSvg],
  [`${base}/plugin/category.png`, 28, iconSvg],
  [`${base}/plugin/category@2x.png`, 56, iconSvg],
  [`${base}/actions/ticker/icon.png`, 20, iconSvg],
  [`${base}/actions/ticker/icon@2x.png`, 40, iconSvg],
  [`${base}/actions/ticker/key.png`, 72, keySvg],
  [`${base}/actions/ticker/key@2x.png`, 144, keySvg]
];

for (const [path, size, svg] of targets) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, render(svg, size));
  console.log(`wrote ${path} (${size}x${size})`);
}
