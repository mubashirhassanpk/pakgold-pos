/** Server-only queries for the standalone Buy-Old-Gold module. */
import "server-only";
import { db, schema } from "./db";
import { desc, eq, sql, ne } from "drizzle-orm";

export function nextVoucherNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const c = db.select({ c: sql<number>`count(*)` }).from(schema.oldGoldPurchases).get()?.c ?? 0;
  return `OG-${ymd}-${String(c + 1).padStart(4, "0")}`;
}

export function listPurchases(limit = 100) {
  return db
    .select({
      id: schema.oldGoldPurchases.id,
      voucherNo: schema.oldGoldPurchases.voucherNo,
      customerName: schema.oldGoldPurchases.customerName,
      totalWeight: schema.oldGoldPurchases.totalWeight,
      totalValue: schema.oldGoldPurchases.totalValue,
      createdAt: schema.oldGoldPurchases.createdAt,
    })
    .from(schema.oldGoldPurchases)
    .where(ne(schema.oldGoldPurchases.status, "void"))
    .orderBy(desc(schema.oldGoldPurchases.createdAt))
    .limit(limit)
    .all();
}

export function getPurchase(id: number) {
  const purchase = db.select().from(schema.oldGoldPurchases).where(eq(schema.oldGoldPurchases.id, id)).get();
  if (!purchase) return null;
  const items = db
    .select()
    .from(schema.oldGoldPurchaseItems)
    .where(eq(schema.oldGoldPurchaseItems.purchaseId, id))
    .all();
  return { purchase, items };
}
