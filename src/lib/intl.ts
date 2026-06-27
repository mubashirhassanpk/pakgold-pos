/**
 * International / multi-currency gold-rate helpers (client-safe — pure math).
 *
 * International spot gold is quoted in USD per troy ounce of pure (24K) gold.
 * Pakistani Sarafa markets quote PKR per tola, and the local rate carries a
 * premium over international spot (import duty, local demand). These helpers
 * convert spot + USD/PKR into a suggested PKR/tola for each karat.
 */
import { TROY_OUNCE_GRAMS, GRAMS_PER_TOLA, GRAMS_PER_KG, KARAT_PURITY } from "./constants";

/** Default public endpoints (no API key). Both are overridable in Settings. */
export const DEFAULT_SPOT_URL = "https://api.gold-api.com/price/XAU";
export const DEFAULT_FX_URL = "https://open.er-api.com/v6/latest/USD";
/** International SILVER spot (XAG), USD per troy ounce. Overridable in Settings. */
export const DEFAULT_SILVER_SPOT_URL = "https://api.gold-api.com/price/XAG";

export interface IntlSnapshot {
  usdPerOz: number;
  usdPkr: number;
  premiumPct: number;
  fetchedAt: number | null; // ms
}

/** PKR per gram of PURE gold from spot + FX. */
export function pkrPerGramPure(usdPerOz: number, usdPkr: number): number {
  if (!usdPerOz || !usdPkr) return 0;
  return (usdPerOz / TROY_OUNCE_GRAMS) * usdPkr;
}

/** Suggested PKR/tola SELL for a karat, including the local premium %. */
export function intlKaratSellPerTola(
  usdPerOz: number,
  usdPkr: number,
  karat: number,
  premiumPct = 0
): number {
  const pure = pkrPerGramPure(usdPerOz, usdPkr);
  const factor = KARAT_PURITY[karat]?.factor ?? karat / 24;
  return pure * GRAMS_PER_TOLA * factor * (1 + premiumPct / 100);
}

/** USD/oz expressed as PKR/tola of 24K (no premium) — for the side-by-side display. */
export function intlPkrPerTola24k(usdPerOz: number, usdPkr: number): number {
  return intlKaratSellPerTola(usdPerOz, usdPkr, 24, 0);
}

/** Suggested rows for all standard karats (rounded), premium applied. */
export function intlAllKaratRows(usdPerOz: number, usdPkr: number, premiumPct = 0) {
  return [24, 22, 21, 18].map((karat) => {
    const sell = Math.round(intlKaratSellPerTola(usdPerOz, usdPkr, karat, premiumPct));
    return { karat, sellPerTola: sell, buyPerTola: Math.round(sell * 0.984) };
  });
}

// --- Silver (XAG) -----------------------------------------------------------

/** PKR per gram of PURE (999) silver from XAG spot + FX. */
export function pkrPerGramSilver(usdPerOzXag: number, usdPkr: number): number {
  if (!usdPerOzXag || !usdPkr) return 0;
  return (usdPerOzXag / TROY_OUNCE_GRAMS) * usdPkr;
}

/** Suggested PKR/tola SELL for silver of a given fineness, premium applied. */
export function intlSilverSellPerTola(
  usdPerOzXag: number,
  usdPkr: number,
  fineness = 999,
  premiumPct = 0
): number {
  const pure = pkrPerGramSilver(usdPerOzXag, usdPkr);
  const factor = (fineness > 0 ? fineness : 999) / 1000;
  return pure * GRAMS_PER_TOLA * factor * (1 + premiumPct / 100);
}

/** Suggested PKR/kg SELL for silver of a given fineness, premium applied. */
export function intlSilverSellPerKg(
  usdPerOzXag: number,
  usdPkr: number,
  fineness = 999,
  premiumPct = 0
): number {
  const pure = pkrPerGramSilver(usdPerOzXag, usdPkr);
  const factor = (fineness > 0 ? fineness : 999) / 1000;
  return pure * GRAMS_PER_KG * factor * (1 + premiumPct / 100);
}

/**
 * Suggested silver rows for the common finenesses, premium applied.
 * Returns both per-tola and per-kg (sell + buyback) so the editor can show both.
 */
export function intlSilverRows(usdPerOzXag: number, usdPkr: number, premiumPct = 0) {
  return [999, 925, 900].map((fineness) => {
    const sellTola = Math.round(intlSilverSellPerTola(usdPerOzXag, usdPkr, fineness, premiumPct));
    const sellKg = Math.round(intlSilverSellPerKg(usdPerOzXag, usdPkr, fineness, premiumPct));
    return {
      fineness,
      sellPerTola: sellTola,
      buyPerTola: Math.round(sellTola * 0.97), // silver buyback spread is wider than gold
      sellPerKg: sellKg,
      buyPerKg: Math.round(sellKg * 0.97),
    };
  });
}

/**
 * Tolerant parser for a spot-gold JSON response. Handles gold-api.com
 * ({ price }) and a few common shapes, plus a generic { usdPerOz }.
 */
export function parseSpotUsdPerOz(data: unknown): number | null {
  if (typeof data === "number") return data > 0 ? data : null;
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const candidates = [o.usdPerOz, o.price, o.usd, o.rate, o.value, o.ounce, o.XAU];
  for (const c of candidates) {
    const n = typeof c === "string" ? Number(c) : (c as number);
    if (typeof n === "number" && isFinite(n) && n > 0) return n;
  }
  return null;
}

/**
 * Tolerant parser for a USD->PKR FX response. Handles open.er-api.com
 * ({ rates: { PKR } }), exchangerate-style shapes, and a generic { usdPkr }.
 */
export function parseUsdPkr(data: unknown): number | null {
  if (typeof data === "number") return data > 0 ? data : null;
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const direct = o.usdPkr ?? o.PKR ?? o.pkr;
  const dn = typeof direct === "string" ? Number(direct) : (direct as number);
  if (typeof dn === "number" && isFinite(dn) && dn > 0) return dn;
  for (const key of ["rates", "conversion_rates", "data"]) {
    const r = o[key];
    if (r && typeof r === "object") {
      const v = (r as Record<string, unknown>).PKR ?? (r as Record<string, unknown>).pkr;
      const n = typeof v === "string" ? Number(v) : (v as number);
      if (typeof n === "number" && isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

/** Is the given timestamp from before today (local)? Drives the morning refresh. */
export function isStale(fetchedAtMs: number | null): boolean {
  if (!fetchedAtMs) return true;
  const d = new Date(fetchedAtMs);
  const today = new Date();
  return (
    d.getFullYear() !== today.getFullYear() ||
    d.getMonth() !== today.getMonth() ||
    d.getDate() !== today.getDate()
  );
}
