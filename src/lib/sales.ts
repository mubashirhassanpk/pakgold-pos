/** Server-only: full sale detail for the A4 invoice view. */
import "server-only";
import { db, schema } from "./db";
import { eq, inArray } from "drizzle-orm";

export interface HallmarkLine {
  description: string;
  metal: "gold" | "silver";
  karat: number;
  silverPurity: number | null;
  hallmark: string | null;
  hallmarkLab: string | null;
  certNo: string | null;
  certDate: string | null;
}

export function getSaleDetail(id: number) {
  const sale = db.select().from(schema.sales).where(eq(schema.sales.id, id)).get();
  if (!sale) return null;
  const items = db.select().from(schema.saleItems).where(eq(schema.saleItems.saleId, id)).all();
  const oldGold = db.select().from(schema.oldGoldItems).where(eq(schema.oldGoldItems.saleId, id)).all();
  const payments = db.select().from(schema.payments).where(eq(schema.payments.saleId, id)).all();
  const customer = sale.customerId
    ? db.select().from(schema.customers).where(eq(schema.customers.id, sale.customerId)).get() ?? null
    : null;

  // Collect hallmark / purity certificate details for any sold pieces that
  // carry them (linked inventory items). Printed on the invoice.
  const itemIds = items.map((i) => i.itemId).filter((x): x is number => x != null);
  const hallmarks: HallmarkLine[] = [];
  if (itemIds.length > 0) {
    const rows = db
      .select({
        id: schema.inventoryItems.id,
        nameEn: schema.inventoryItems.nameEn,
        metal: schema.inventoryItems.metal,
        karat: schema.inventoryItems.karat,
        silverPurity: schema.inventoryItems.silverPurity,
        hallmark: schema.inventoryItems.hallmark,
        hallmarkLab: schema.inventoryItems.hallmarkLab,
        certNo: schema.inventoryItems.certNo,
        certDate: schema.inventoryItems.certDate,
      })
      .from(schema.inventoryItems)
      .where(inArray(schema.inventoryItems.id, itemIds))
      .all();
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const it of items) {
      const inv = it.itemId ? byId.get(it.itemId) : undefined;
      if (inv && (inv.hallmark || inv.hallmarkLab || inv.certNo)) {
        hallmarks.push({
          description: it.description,
          metal: (inv.metal ?? "gold") as "gold" | "silver",
          karat: inv.karat,
          silverPurity: inv.silverPurity ?? null,
          hallmark: inv.hallmark,
          hallmarkLab: inv.hallmarkLab,
          certNo: inv.certNo,
          certDate: inv.certDate,
        });
      }
    }
  }

  return { sale, items, oldGold, payments, customer, hallmarks };
}
