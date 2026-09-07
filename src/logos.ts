// Fetches asset logos and caches them as base64 data URIs. Best-effort:
// any failure resolves to null so the tile still renders without a logo.

const cache = new Map<string, string | null>();
const MAX_BYTES = 300_000;

export async function fetchLogoDataUri(url: string): Promise<string | null> {
  const cached = cache.get(url);
  if (cached !== undefined) {
    return cached;
  }

  let result: string | null = null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: ctrl.signal
    });
    clearTimeout(timer);

    const type = (res.headers.get("content-type") ?? "").split(";")[0];
    // Stream Deck's SVG <image> reliably renders raster; skip SVG/other logos.
    if (res.ok && (type === "image/png" || type === "image/jpeg" || type === "image/webp")) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 0 && buf.length <= MAX_BYTES) {
        result = `data:${type};base64,${buf.toString("base64")}`;
      }
    }
  } catch {
    result = null;
  }

  cache.set(url, result);
  return result;
}
