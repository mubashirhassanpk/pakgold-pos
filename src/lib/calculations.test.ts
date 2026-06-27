import { describe, it, expect } from "vitest";
import {
  computeGoldValue,
  computeMaking,
  computeWastage,
  computeLineItem,
  computeOldGoldValue,
  computeTax,
  computeInvoiceTotals,
  purityAdjustedRate,
} from "./calculations";
import { GRAMS_PER_TOLA, KARAT_PURITY } from "./constants";

describe("gold value", () => {
  it("values exactly 1 tola at the tola rate", () => {
    expect(computeGoldValue(GRAMS_PER_TOLA, 250000)).toBe(250000);
  });
  it("values 5.832 g (half tola) at half the rate", () => {
    expect(computeGoldValue(GRAMS_PER_TOLA / 2, 250000)).toBe(125000);
  });
});

describe("purity-adjusted rate", () => {
  it("derives 22K from 24K using the 916 factor", () => {
    const r = purityAdjustedRate(250000, KARAT_PURITY[22].factor);
    expect(r).toBe(229000);
  });
});

describe("making charges", () => {
  it("per gram", () => expect(computeMaking("per_gram", 800, 11.664, 0)).toBe(9331.2));
  it("fixed", () => expect(computeMaking("fixed", 5000, 11.664, 0)).toBe(5000));
  it("percent of gold value", () =>
    expect(computeMaking("percent", 10, 11.664, 250000)).toBe(25000));
});

describe("wastage", () => {
  it("weight_pct adds extra gold value", () => {
    const w = computeWastage("weight_pct", 5, GRAMS_PER_TOLA, 250000, 250000);
    expect(w.extraWeightGrams).toBeCloseTo(0.5832, 4);
    expect(w.amount).toBe(12500); // 5% of 1 tola = 0.05 tola × 250000
  });
  it("charge_pct is a flat % of gold value", () => {
    expect(computeWastage("charge_pct", 4, 11.664, 250000, 250000).amount).toBe(10000);
  });
});

describe("full line item — typical 22K bangle", () => {
  it("sums gold + making + wastage + other correctly", () => {
    // 1 tola 22K, rate 229000/tola, making 800/g, wastage 3% charge, 1500 polish
    const r = computeLineItem({
      weightGrams: GRAMS_PER_TOLA,
      ratePerTola: 229000,
      makingType: "per_gram",
      makingValue: 800,
      wastageType: "charge_pct",
      wastageValue: 3,
      otherCharges: 1500,
    });
    expect(r.goldValue).toBe(229000);
    expect(r.making).toBe(9331.2);
    expect(r.wastage).toBe(6870); // 3% of 229000
    expect(r.other).toBe(1500);
    expect(r.unitTotal).toBe(246701.2);
    expect(r.lineTotal).toBe(246701.2);
  });
});

describe("old gold buyback", () => {
  it("values old gold at the lower buy rate", () => {
    expect(computeOldGoldValue(GRAMS_PER_TOLA, 220000)).toBe(220000);
  });
});

describe("tax — configurable basis", () => {
  const parts = { goldValue: 229000, making: 9331.2, taxableSubtotal: 246701.2 };
  it("making only", () =>
    expect(computeTax({ basis: "making_only", ratePct: 3 }, parts)).toBe(279.94));
  it("gold + making", () =>
    expect(computeTax({ basis: "gold_plus_making", ratePct: 1 }, parts)).toBe(2383.31));
  it("fixed", () =>
    expect(computeTax({ basis: "fixed", fixedAmount: 500 }, parts)).toBe(500));
  it("no rule = no tax", () => expect(computeTax(null, parts)).toBe(0));
});

describe("invoice totals with old-gold exchange", () => {
  it("deducts old gold and discount from grand total", () => {
    const line = computeLineItem({
      weightGrams: GRAMS_PER_TOLA,
      ratePerTola: 229000,
      makingType: "per_gram",
      makingValue: 800,
      wastageType: "charge_pct",
      wastageValue: 3,
      otherCharges: 1500,
    });
    const totals = computeInvoiceTotals({
      lines: [line],
      oldGold: [{ weightGrams: GRAMS_PER_TOLA / 2, buyRatePerTola: 220000 }],
      taxRule: { basis: "making_only", ratePct: 3 },
      discount: 1000,
    });
    expect(totals.subtotal).toBe(246701.2);
    expect(totals.tax).toBe(279.94);
    expect(totals.oldGoldTotal).toBe(110000); // half tola at buy rate
    expect(totals.grandTotal).toBe(135981.14); // 246701.2 + 279.94 - 1000 - 110000
  });
});
