import {
  action,
  SingletonAction,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  type WillAppearEvent,
  type WillDisappearEvent
} from "@elgato/streamdeck";

import { fetchLogoDataUri } from "../logos";
import { fetchCryptoQuote, fetchStockQuote } from "../providers";
import { renderMessage, renderQuote, renderReaction } from "../render";
import type { Quote, TickerSettings } from "../types";

const MIN_REFRESH = 15; // seconds — protects free-tier rate limits.
const MAX_REFRESH = 300; // seconds
const REACTION_COOLDOWN = 60 * 60 * 1000; // once per hour, per direction, per tile

type Target = {
  id: string;
  setImage(img: string): Promise<void>;
  setTitle(title: string): Promise<void>;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@action({ UUID: "com.skizd.deckedstream.ticker" })
export class TickerPrice extends SingletonAction<TickerSettings> {
  /** One refresh timer per visible tile, keyed by action id. */
  private readonly timers = new Map<string, NodeJS.Timeout>();
  /** Last reaction times per tile so bouncing levels don't spam. */
  private readonly lastReaction = new Map<string, { high: number; low: number }>();
  /** Tiles currently playing a reaction animation (skip refreshes meanwhile). */
  private readonly animating = new Set<string>();
  /** Last successful quote per tile, kept so a transient error doesn't blank it. */
  private readonly lastGood = new Map<string, Quote>();
  /** Debounce timers so typing a ticker doesn't fire a request per keystroke. */
  private readonly settle = new Map<string, NodeJS.Timeout>();

  override onWillAppear(ev: WillAppearEvent<TickerSettings>): void | Promise<void> {
    return this.start(ev.action, ev.payload.settings);
  }

  override onWillDisappear(ev: WillDisappearEvent<TickerSettings>): void {
    this.stop(ev.action.id);
  }

  override onDidReceiveSettings(ev: DidReceiveSettingsEvent<TickerSettings>): void {
    // Debounce: the PI can fire this on every keystroke; wait for it to settle.
    const existing = this.settle.get(ev.action.id);
    if (existing) {
      clearTimeout(existing);
    }
    this.settle.set(
      ev.action.id,
      setTimeout(() => {
        this.settle.delete(ev.action.id);
        void this.start(ev.action, ev.payload.settings);
      }, 700)
    );
  }

  override onKeyDown(ev: KeyDownEvent<TickerSettings>): void | Promise<void> {
    // Pressing the key forces an immediate refresh.
    return this.update(ev.action, ev.payload.settings);
  }

  private async start(act: Target, settings: TickerSettings): Promise<void> {
    this.stop(act.id);
    await this.update(act, settings);

    const requested = Number(settings.refresh) || 60;
    const seconds = Math.min(MAX_REFRESH, Math.max(MIN_REFRESH, requested));
    const timer = setInterval(() => {
      void this.update(act, settings);
    }, seconds * 1000);
    this.timers.set(act.id, timer);
  }

  private stop(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }
    const settle = this.settle.get(id);
    if (settle) {
      clearTimeout(settle);
      this.settle.delete(id);
    }
  }

  private async update(act: Target, settings: TickerSettings): Promise<void> {
    if (this.animating.has(act.id)) {
      return; // don't stomp a reaction in progress
    }

    const ticker = settings.ticker?.trim();
    const assetType = settings.assetType ?? "stock";
    const currency = (settings.currency || "usd").toLowerCase();
    const wantSpark = !!settings.sparkline;

    if (!ticker) {
      await act.setTitle("");
      await act.setImage(renderMessage("Set ticker", "Open settings →"));
      return;
    }

    try {
      const quote =
        assetType === "stock"
          ? await fetchStockQuote(ticker, wantSpark)
          : await fetchCryptoQuote(ticker, currency, wantSpark);

      this.lastGood.set(act.id, quote);
      const label = settings.displayName?.trim() || quote.symbol;
      const logo =
        settings.showLogo && quote.logoUrl ? await fetchLogoDataUri(quote.logoUrl) : null;
      await act.setTitle("");
      await act.setImage(renderQuote(label, quote, quote.currency, { sparkline: wantSpark, logo }));

      await this.maybeReact(act, settings, quote.price, label);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      // Keep showing the last good price through transient errors (e.g. 429s);
      // only surface an error if we've never had a value for this tile.
      if (this.lastGood.has(act.id)) {
        return;
      }
      await act.setImage(renderMessage("Error", msg.slice(0, 18)));
      await act.setTitle(msg.slice(0, 40));
    }
  }

  /** Fire a fireworks/nuke reaction when a level is crossed (≤ once/hour each). */
  private async maybeReact(
    act: Target,
    settings: TickerSettings,
    price: number,
    label: string
  ): Promise<void> {
    const high = Number(settings.highLevel);
    const low = Number(settings.lowLevel);
    const now = Date.now();
    const last = this.lastReaction.get(act.id) ?? { high: 0, low: 0 };

    if (Number.isFinite(high) && high > 0 && price >= high && now - last.high > REACTION_COOLDOWN) {
      this.lastReaction.set(act.id, { ...last, high: now });
      await this.playReaction(act, "fireworks", label);
    } else if (Number.isFinite(low) && low > 0 && price <= low && now - last.low > REACTION_COOLDOWN) {
      this.lastReaction.set(act.id, { ...last, low: now });
      await this.playReaction(act, "nuke", label);
    }
  }

  private async playReaction(act: Target, kind: "fireworks" | "nuke", label: string): Promise<void> {
    this.animating.add(act.id);
    try {
      await act.setTitle("");
      for (let cycle = 0; cycle < 2; cycle++) {
        for (let f = 0; f < 6; f++) {
          await act.setImage(renderReaction(kind, f, label));
          await sleep(120);
        }
      }
    } finally {
      this.animating.delete(act.id);
    }
  }
}
