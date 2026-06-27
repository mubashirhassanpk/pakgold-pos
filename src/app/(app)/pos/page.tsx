import { getCurrentRates, getCurrentSilverRates, getInventory, getActiveTaxRule, getSettings, listHeldBills } from "@/lib/queries";
import { customersForPicker } from "@/lib/customers";
import { PosClient } from "./PosClient";
import type { Metal } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function PosPage() {
  const rates = getCurrentRates();
  const silverRates = getCurrentSilverRates();
  const customers = customersForPicker();
  const heldBills = listHeldBills();
  const inventory = getInventory().map((it) => ({
    id: it.id,
    barcode: it.barcode ?? "",
    nameEn: it.nameEn,
    nameUr: it.nameUr ?? "",
    metal: (it.metal ?? "gold") as Metal,
    karat: it.karat,
    silverPurity: it.silverPurity ?? null,
    netWeight: it.netWeight,
    makingType: it.makingType as "per_gram" | "fixed" | "percent",
    makingValue: it.makingValue,
    wastageType: it.wastageType as "weight_pct" | "charge_pct" | "fixed",
    wastageValue: it.wastageValue,
    otherCharges: it.stonesValue + it.otherCharges,
    quantity: it.quantity,
  }));
  const taxRule = getActiveTaxRule();
  const settings = getSettings();

  return (
    <PosClient
      rates={rates}
      silverRates={silverRates}
      inventory={inventory}
      customers={customers}
      heldBills={heldBills}
      taxRule={
        taxRule
          ? {
              name: taxRule.name,
              basis: taxRule.basis as "making_only" | "gold_plus_making" | "total" | "fixed",
              ratePct: taxRule.ratePct ?? undefined,
              fixedAmount: taxRule.fixedAmount ?? undefined,
            }
          : null
      }
      settings={settings}
    />
  );
}
