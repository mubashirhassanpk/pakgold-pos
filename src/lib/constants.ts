/**
 * Core constants for PakGold POS.
 *
 * Pakistani gold trade uses TOLA as the primary unit, but international
 * rates are increasingly quoted per 10 grams. We store everything in
 * GRAMS internally (highest precision) and convert at the edges.
 */

// 1 Tola = 11.664 grams (the legally/traditionally accepted value in Pakistan).
export const GRAMS_PER_TOLA = 11.664;

// 1 Tola = 12 Masha, so 1 Masha = 0.972 grams.
export const MASHA_PER_TOLA = 12;
export const GRAMS_PER_MASHA = GRAMS_PER_TOLA / MASHA_PER_TOLA; // 0.972

// 1 Masha = 8 Ratti (kept for completeness; not used in billing yet).
export const RATTI_PER_MASHA = 8;

export const GRAMS_PER_TEN_GRAM = 10;

// 1 kilogram = 1000 grams. Chandi (silver) is frequently quoted PER KG in
// Pakistani Sarafa markets, so kg is a first-class display/entry unit for silver.
export const GRAMS_PER_KG = 1000;
// Tola per kg — exact, derived from GRAMS_PER_TOLA so it never drifts.
// 1000 / 11.664 ≈ 85.7339 tola.
export const TOLA_PER_KG = GRAMS_PER_KG / GRAMS_PER_TOLA;

// 1 troy ounce = 31.1034768 grams — the unit international gold/silver spot is quoted in.
export const TROY_OUNCE_GRAMS = 31.1034768;

/**
 * Standard karat purities used in Pakistan with their fineness factor
 * relative to pure (24K) gold. The factor is what you multiply a 24K
 * rate by to get the value of lower-karat gold.
 *
 *   22K is the dominant purity for jewellery in Pakistan ("916").
 *   24K (999) is used for coins/bars (bullion).
 */
export const KARAT_PURITY: Record<number, { factor: number; label: string; hallmark: string }> = {
  24: { factor: 0.999, label: "24K", hallmark: "999" },
  22: { factor: 0.916, label: "22K", hallmark: "916" },
  21: { factor: 0.875, label: "21K", hallmark: "875" },
  18: { factor: 0.75, label: "18K", hallmark: "750" },
};

/**
 * Metal discriminator. Gold is graded by KARAT (integer); silver/chandi is
 * graded by PURITY/millesimal fineness (999, 925, …) and is priced off a
 * separate silver rate. Every inventory item, sale line, old-metal row and
 * rate row carries one of these.
 */
export type Metal = "gold" | "silver";
export const METALS = ["gold", "silver"] as const;

/**
 * Common silver (chandi) purities stocked in Pakistan, by millesimal fineness.
 * Unlike gold, the shop often deals in mixed/local purity, so this is a set of
 * CONVENIENCE PRESETS only — the actual purity is typed per item/line (a free
 * millesimal 0–1000). `factor` is fineness ÷ 1000, used exactly like a karat
 * factor to value lower-purity silver off the pure (999) rate.
 *   999  → fine / pure silver (coins, bullion)
 *   925  → sterling
 *   900  → coin silver
 *   835/800 → older/continental
 */
export const SILVER_PURITY_PRESETS: { fineness: number; factor: number; label: string }[] = [
  { fineness: 999, factor: 0.999, label: "999 (Fine)" },
  { fineness: 925, factor: 0.925, label: "925 (Sterling)" },
  { fineness: 900, factor: 0.9, label: "900 (Coin)" },
  { fineness: 835, factor: 0.835, label: "835" },
  { fineness: 800, factor: 0.8, label: "800" },
];

/** Fineness (e.g. 925) → factor (0.925). Falls back to fineness/1000. */
export function silverPurityFactor(fineness: number): number {
  return (fineness > 0 ? fineness : 999) / 1000;
}

export type WeightUnit = "tola" | "masha" | "gram" | "kg";

/** How making charges can be expressed on an item/line. */
export type MakingType = "per_gram" | "fixed" | "percent";

/**
 * How wastage ("kaat" / "polai") is handled.
 *  - weight_pct : extra gold weight added (% of net weight), valued at the gold rate.
 *  - charge_pct : a flat % of the gold value, taken as a charge (no extra weight).
 *  - fixed      : a fixed rupee amount.
 */
export type WastageType = "weight_pct" | "charge_pct" | "fixed";

/**
 * Tax basis — NEVER hardcode the rate; only the *basis* is an enum.
 * FBR rules for jewellers change often, so the actual % / amount lives in DB.
 *  - making_only      : tax applied only on making charges (common reduced-rate scheme).
 *  - gold_plus_making : tax on gold value + making (full value addition).
 *  - total            : tax on the full taxable subtotal.
 *  - fixed            : a fixed rupee amount per invoice (small-shop fixed tax).
 */
export type TaxBasis = "making_only" | "gold_plus_making" | "total" | "fixed";

/** Repair / job-work enums (kept here so client components can import them). */
export const JOB_TYPES = ["alteration", "polish", "stone_setting", "resize", "repair", "other"] as const;
export const JOB_STATUSES = ["received", "in_progress", "ready", "delivered", "cancelled"] as const;

/** Karigar ledger kinds (client-safe). Earnings increase what the shop owes. */
export const EARNING_KINDS = ["salary", "dehari", "commission", "bonus"] as const;
export const PAYMENT_KINDS = ["payout", "advance", "deduction"] as const;
export const ALL_KINDS = [...EARNING_KINDS, ...PAYMENT_KINDS] as const;

/** Advance-booking (bayana) statuses. */
export const BOOKING_STATUSES = ["booked", "in_progress", "ready", "delivered", "cancelled"] as const;

/** Supplier ledger kinds. ADD = shop owes more; SUB = reduces what's owed. */
export const SUPPLIER_ADD_KINDS = ["purchase", "opening"] as const;
export const SUPPLIER_SUB_KINDS = ["payment", "return"] as const;
export const SUPPLIER_KINDS = [...SUPPLIER_ADD_KINDS, ...SUPPLIER_SUB_KINDS] as const;

// --- Stone & diamond detail (client-safe enums) ------------------------------
export const STONE_TYPES = [
  "diamond",
  "ruby",
  "emerald",
  "sapphire",
  "polki",
  "pearl",
  "zircon",
  "other",
] as const;
export type StoneType = (typeof STONE_TYPES)[number];

export const STONE_SHAPES = [
  "round",
  "princess",
  "oval",
  "emerald",
  "pear",
  "marquise",
  "cushion",
  "heart",
  "other",
] as const;

/** Common assay / hallmark certificate labs used in Pakistan & abroad. */
export const HALLMARK_LABS = ["PCSIR", "SGS", "Bureau Veritas", "Intertek", "GIA", "IGI", "HRD", "Other"] as const;

// --- Committee / BC (client-safe) -------------------------------------------
export const COMMITTEE_TYPES = ["gold", "cash"] as const;
export type CommitteeType = (typeof COMMITTEE_TYPES)[number];
export const COMMITTEE_STATUSES = ["active", "completed", "cancelled"] as const;

// --- Label / printer profiles ------------------------------------------------
/**
 * Presets for common Pakistani jewellery tags and thermal label rolls.
 * `kind` "tag" = dumbbell/butterfly jewellery tag (two flaps + barcode bridge);
 * "label" = a simple rectangular sticker. Dimensions are in millimetres.
 */
export interface LabelProfile {
  id: string;
  name: string;
  kind: "tag" | "label";
  widthMm: number;
  heightMm: number;
  columns: number; // labels per row on the print sheet
  barcodeHeight: number; // px
  moduleWidth: number; // px per barcode module
  fontPt: number;
  showShop: boolean;
  showWeight: boolean;
  showPrice: boolean;
}

export const LABEL_PROFILES: LabelProfile[] = [
  {
    id: "tag-dumbbell-75x10",
    name: 'Jewellery Tag — Dumbbell 75 × 10 mm (rabbit)',
    kind: "tag",
    widthMm: 75,
    heightMm: 10,
    columns: 2,
    barcodeHeight: 26,
    moduleWidth: 0.9,
    fontPt: 6,
    showShop: false,
    showWeight: true,
    showPrice: false,
  },
  {
    id: "tag-butterfly-58x12",
    name: "Jewellery Tag — Butterfly 58 × 12 mm",
    kind: "tag",
    widthMm: 58,
    heightMm: 12,
    columns: 3,
    barcodeHeight: 24,
    moduleWidth: 0.85,
    fontPt: 6,
    showShop: false,
    showWeight: true,
    showPrice: false,
  },
  {
    id: "label-38x25",
    name: "Thermal Label — 38 × 25 mm (2-up)",
    kind: "label",
    widthMm: 38,
    heightMm: 25,
    columns: 2,
    barcodeHeight: 30,
    moduleWidth: 1.0,
    fontPt: 7,
    showShop: true,
    showWeight: true,
    showPrice: false,
  },
  {
    id: "label-50x25",
    name: "Thermal Label — 50 × 25 mm",
    kind: "label",
    widthMm: 50,
    heightMm: 25,
    columns: 2,
    barcodeHeight: 30,
    moduleWidth: 1.1,
    fontPt: 7,
    showShop: true,
    showWeight: true,
    showPrice: false,
  },
  {
    id: "label-48x30",
    name: "Thermal Label — 48 × 30 mm (classic)",
    kind: "label",
    widthMm: 48,
    heightMm: 30,
    columns: 2,
    barcodeHeight: 34,
    moduleWidth: 1.2,
    fontPt: 8,
    showShop: true,
    showWeight: true,
    showPrice: false,
  },
];

export function getLabelProfile(id: string | undefined): LabelProfile {
  return LABEL_PROFILES.find((p) => p.id === id) ?? LABEL_PROFILES[2];
}
