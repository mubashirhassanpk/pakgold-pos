/**
 * ============================================================================
 *  PakGold POS — Gold Price Calculation Engine
 * ============================================================================
 *  Pure functions only. Zero side effects. This file is the single source of
 *  truth for every rupee the shop charges, so it must be 100% correct and
 *  fully unit-testable.
 *
 *  Pakistani jeweller billing model for ONE line item:
 *
 *     Gold Value   = net weight (in tola) × rate-per-tola for that purity
 *     Making       = per-gram × weight   OR   fixed amount   OR   % of gold value
 *     Wastage      = extra weight valued at rate  OR  % of gold value  OR  fixed
 *     Other        = polish + hallmark + certificate + stones, etc.
 *     ---------------------------------------------------------------
 *     Line Total   = Gold Value + Making + Wastage + Other
 *
 *  Invoice level:
 *     Subtotal     = Σ line totals
 *     Tax          = configurable basis × configurable rate  (NEVER hardcoded)
 *     Old Gold     = customer's old gold valued at BUYBACK rate (deducted)
 *     Grand Total  = Subtotal + Tax − Discount − Old Gold Value
 * ============================================================================
 */
import { gramsToTola } from "./units";
import type { MakingType, WastageType, TaxBasis } from "./constants";

/** Round money to 2 decimals (paisa). Use everywhere money is produced. */
export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/** Round to the nearest whole rupee — common on printed slips. */
export const roundRupee = (n: number): number => Math.round(n);

// ---------------------------------------------------------------------------
// 1. Gold value
// ---------------------------------------------------------------------------

/**
 * Value of the metal itself.
 * @param weightGrams  net gold weight in grams
 * @param ratePerTola  rate for THIS purity, per tola (already purity-adjusted)
 */
export function computeGoldValue(weightGrams: number, ratePerTola: number): number {
  return round2(gramsToTola(weightGrams) * ratePerTola);
}

/**
 * Derive a per-purity tola rate from a base 24K rate using the karat factor.
 * Used when the shop enters only a 24K rate and wants other karats auto-filled.
 */
export function purityAdjustedRate(base24kRatePerTola: number, purityFactor: number): number {
  return round2(base24kRatePerTola * purityFactor);
}

// ---------------------------------------------------------------------------
// 2. Making charges (مزدوری)
// ---------------------------------------------------------------------------

export function computeMaking(
  type: MakingType,
  value: number,
  weightGrams: number,
  goldValue: number
): number {
  switch (type) {
    case "per_gram":
      return round2(value * weightGrams);
    case "fixed":
      return round2(value);
    case "percent":
      return round2((goldValue * value) / 100);
  }
}

// ---------------------------------------------------------------------------
// 3. Wastage (کاٹ / پلائی)
// ---------------------------------------------------------------------------

/**
 * @returns { extraWeightGrams, amount }
 *   extraWeightGrams is non-zero only for the "weight_pct" method, where the
 *   shop effectively bills the customer for slightly more gold than the net
 *   weight (a long-standing Pakistani practice to cover melting loss).
 */
export function computeWastage(
  type: WastageType,
  value: number,
  weightGrams: number,
  ratePerTola: number,
  goldValue: number
): { extraWeightGrams: number; amount: number } {
  switch (type) {
    case "weight_pct": {
      const extraWeightGrams = (weightGrams * value) / 100;
      return { extraWeightGrams, amount: computeGoldValue(extraWeightGrams, ratePerTola) };
    }
    case "charge_pct":
      return { extraWeightGrams: 0, amount: round2((goldValue * value) / 100) };
    case "fixed":
      return { extraWeightGrams: 0, amount: round2(value) };
  }
}

// ---------------------------------------------------------------------------
// 4. Full line item
// ---------------------------------------------------------------------------

export interface LineItemInput {
  weightGrams: number; // net gold weight
  ratePerTola: number; // purity-adjusted sell rate
  makingType: MakingType;
  makingValue: number;
  wastageType: WastageType;
  wastageValue: number;
  otherCharges?: number; // polish, hallmark, stones, certificate, etc.
  quantity?: number; // default 1
}

export interface LineItemResult {
  goldValue: number;
  making: number;
  wastage: number;
  wastageExtraWeightGrams: number;
  other: number;
  /** total for ONE piece */
  unitTotal: number;
  /** unitTotal × quantity */
  lineTotal: number;
  quantity: number;
}

export function computeLineItem(input: LineItemInput): LineItemResult {
  const qty = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const goldValue = computeGoldValue(input.weightGrams, input.ratePerTola);
  const making = computeMaking(input.makingType, input.makingValue, input.weightGrams, goldValue);
  const { extraWeightGrams, amount: wastage } = computeWastage(
    input.wastageType,
    input.wastageValue,
    input.weightGrams,
    input.ratePerTola,
    goldValue
  );
  const other = round2(input.otherCharges ?? 0);
  const unitTotal = round2(goldValue + making + wastage + other);
  return {
    goldValue,
    making,
    wastage,
    wastageExtraWeightGrams: extraWeightGrams,
    other,
    unitTotal,
    lineTotal: round2(unitTotal * qty),
    quantity: qty,
  };
}

// ---------------------------------------------------------------------------
// 5. Old gold / buyback (پرانا سونا)
// ---------------------------------------------------------------------------

/**
 * Value of old gold the customer brings in, calculated at the BUYBACK rate
 * (always lower than the sell rate). This amount is deducted from the bill.
 */
export function computeOldGoldValue(weightGrams: number, buyRatePerTola: number): number {
  return computeGoldValue(weightGrams, buyRatePerTola);
}

// ---------------------------------------------------------------------------
// 6. Tax (configurable — basis is fixed, rate/amount comes from DB)
// ---------------------------------------------------------------------------

export interface TaxRule {
  basis: TaxBasis;
  ratePct?: number; // used for percentage bases
  fixedAmount?: number; // used for "fixed" basis
}

export function computeTax(
  rule: TaxRule | null | undefined,
  parts: { goldValue: number; making: number; taxableSubtotal: number }
): number {
  if (!rule) return 0;
  switch (rule.basis) {
    case "making_only":
      return round2((parts.making * (rule.ratePct ?? 0)) / 100);
    case "gold_plus_making":
      return round2(((parts.goldValue + parts.making) * (rule.ratePct ?? 0)) / 100);
    case "total":
      return round2((parts.taxableSubtotal * (rule.ratePct ?? 0)) / 100);
    case "fixed":
      return round2(rule.fixedAmount ?? 0);
  }
}

// ---------------------------------------------------------------------------
// 7. Whole invoice
// ---------------------------------------------------------------------------

export interface OldGoldInput {
  weightGrams: number;
  buyRatePerTola: number;
}

export interface InvoiceInput {
  lines: LineItemResult[];
  oldGold?: OldGoldInput[];
  taxRule?: TaxRule | null;
  discount?: number; // rupee amount off
}

export interface InvoiceTotals {
  goldValueTotal: number;
  makingTotal: number;
  wastageTotal: number;
  otherTotal: number;
  subtotal: number; // sum of line totals
  tax: number;
  discount: number;
  oldGoldTotal: number; // deducted
  grandTotal: number;
}

export function computeInvoiceTotals(input: InvoiceInput): InvoiceTotals {
  const goldValueTotal = round2(
    input.lines.reduce((s, l) => s + l.goldValue * l.quantity, 0)
  );
  const makingTotal = round2(input.lines.reduce((s, l) => s + l.making * l.quantity, 0));
  const wastageTotal = round2(input.lines.reduce((s, l) => s + l.wastage * l.quantity, 0));
  const otherTotal = round2(input.lines.reduce((s, l) => s + l.other * l.quantity, 0));
  const subtotal = round2(input.lines.reduce((s, l) => s + l.lineTotal, 0));

  const tax = computeTax(input.taxRule, {
    goldValue: goldValueTotal,
    making: makingTotal,
    taxableSubtotal: subtotal,
  });

  const discount = round2(input.discount ?? 0);
  const oldGoldTotal = round2(
    (input.oldGold ?? []).reduce(
      (s, g) => s + computeOldGoldValue(g.weightGrams, g.buyRatePerTola),
      0
    )
  );

  const grandTotal = round2(subtotal + tax - discount - oldGoldTotal);

  return {
    goldValueTotal,
    makingTotal,
    wastageTotal,
    otherTotal,
    subtotal,
    tax,
    discount,
    oldGoldTotal,
    grandTotal,
  };
}

// ---------------------------------------------------------------------------
// 8. Payments / balance
// ---------------------------------------------------------------------------

export function computeBalance(grandTotal: number, payments: number[]): number {
  const paid = payments.reduce((s, p) => s + p, 0);
  return round2(grandTotal - paid);
}
