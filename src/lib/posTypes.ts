/** Shared POS types (client-safe — no server-only imports). */
import type { MakingType, WastageType, Metal } from "./constants";

export interface PickCustomer {
  id: number;
  name: string;
  phone: string | null;
  balance: number;
}

export interface CartLine {
  key: string;
  itemId: number | null;
  type: "item" | "custom";
  description: string;
  metal: Metal;
  karat: number;
  /** Millesimal fineness (e.g. 925) when metal === "silver". */
  silverPurity: number | null;
  weightGrams: number;
  ratePerTola: number;
  makingType: MakingType;
  makingValue: number;
  wastageType: WastageType;
  wastageValue: number;
  other: number;
  quantity: number;
}

export interface OldGoldRow {
  key: string;
  metal: Metal;
  weightGrams: number;
  karat: number;
  silverPurity: number | null;
  buyRatePerTola: number;
  notes: string;
}

/** The full POS state that gets parked when a bill is held. */
export interface HeldBillPayload {
  customer: PickCustomer | null;
  lines: CartLine[];
  oldGold: OldGoldRow[];
  discount: number;
  method: string;
  received: number | null;
}

export interface HeldBillSummary {
  id: number;
  label: string;
  createdAt: number;
}
