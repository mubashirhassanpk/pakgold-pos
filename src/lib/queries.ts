/** Server-only read queries. Used by Server Components. */
import "server-only";
import { db, schema } from "./db";
import { desc, eq, sql, gte, lte, and, or, like, gt } from "drizzle-orm";

export interface CurrentRate {
  karat: number;
  purityFactor: number;
  sellPerTola: number;
  buyPerTola: number;
  effectiveAt: number;
}

/** Latest rate row per karat = the "current" rate. */
export function getCurrentRates(): CurrentRate[] {
  const rows = db
    .select()
    .from(schema.goldRates)
    .orderBy(desc(schema.goldRates.effectiveAt))
    .all();
  const byKarat = new Map<number, CurrentRate>();
  for (const r of rows) {
    if (!byKarat.has(r.karat)) {
      byKarat.set(r.karat, {
        karat: r.karat,
        purityFactor: r.purityFactor,
        sellPerTola: r.sellPerTola,
        buyPerTola: r.buyPerTola,
        effectiveAt: r.effectiveAt,
      });
    }
  }
  return [...byKarat.values()].sort((a, b) => b.karat - a.karat);
}

export interface CurrentSilverRate {
  fineness: number;
  purityFactor: number;
  sellPerTola: number;
  buyPerTola: number;
  sellPerKg: number;
  buyPerKg: number;
  effectiveAt: number;
}

/** Latest silver rate row per fineness = the "current" silver rate. */
export function getCurrentSilverRates(): CurrentSilverRate[] {
  const rows = db
    .select()
    .from(schema.silverRates)
    .orderBy(desc(schema.silverRates.effectiveAt))
    .all();
  const byFineness = new Map<number, CurrentSilverRate>();
  for (const r of rows) {
    if (!byFineness.has(r.fineness)) {
      byFineness.set(r.fineness, {
        fineness: r.fineness,
        purityFactor: r.purityFactor,
        sellPerTola: r.sellPerTola,
        buyPerTola: r.buyPerTola,
        sellPerKg: r.sellPerKg,
        buyPerKg: r.buyPerKg,
        effectiveAt: r.effectiveAt,
      });
    }
  }
  return [...byFineness.values()].sort((a, b) => b.fineness - a.fineness);
}

export function getActiveTaxRule() {
  return db.select().from(schema.taxRules).where(eq(schema.taxRules.active, true)).get() ?? null;
}

export function getTaxRules() {
  return db.select().from(schema.taxRules).orderBy(schema.taxRules.id).all();
}

export function getUsers() {
  return db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      role: schema.users.role,
      active: schema.users.active,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(schema.users.id)
    .all();
}

export function getSettings(): Record<string, string> {
  const rows = db.select().from(schema.settings).all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
}

export function getInventory() {
  return db
    .select()
    .from(schema.inventoryItems)
    .where(eq(schema.inventoryItems.status, "in_stock"))
    .orderBy(desc(schema.inventoryItems.createdAt))
    .all();
}

export function getCategories() {
  return db.select().from(schema.categories).all();
}

/** Searchable sales list for the Invoices / reprint page. */
export function listSales(opts: { q?: string; from?: number; to?: number; limit?: number } = {}) {
  const conds = [eq(schema.sales.status, "completed")];
  if (opts.from) conds.push(gte(schema.sales.createdAt, opts.from));
  if (opts.to) conds.push(lte(schema.sales.createdAt, opts.to));
  const q = opts.q?.trim();
  if (q) {
    conds.push(
      or(
        like(schema.sales.invoiceNo, `%${q}%`),
        like(schema.customers.name, `%${q}%`),
        like(schema.customers.phone, `%${q}%`)
      )!
    );
  }
  return db
    .select({
      id: schema.sales.id,
      invoiceNo: schema.sales.invoiceNo,
      createdAt: schema.sales.createdAt,
      grandTotal: schema.sales.grandTotal,
      paidTotal: schema.sales.paidTotal,
      oldGoldTotal: schema.sales.oldGoldTotal,
      customerName: schema.customers.name,
    })
    .from(schema.sales)
    .leftJoin(schema.customers, eq(schema.sales.customerId, schema.customers.id))
    .where(and(...conds))
    .orderBy(desc(schema.sales.createdAt))
    .limit(opts.limit ?? 100)
    .all();
}

/** Customers who owe money, with aging (oldest unpaid invoice date). */
export function getReceivables() {
  return db
    .select({
      id: schema.customers.id,
      name: schema.customers.name,
      phone: schema.customers.phone,
      balance: schema.customers.balance,
      oldestUnpaid: sql<number | null>`(
        select min(${schema.sales.createdAt}) from ${schema.sales}
        where ${schema.sales.customerId} = ${schema.customers.id}
          and ${schema.sales.paidTotal} < ${schema.sales.grandTotal}
      )`,
    })
    .from(schema.customers)
    .where(gt(schema.customers.balance, 0))
    .orderBy(desc(schema.customers.balance))
    .all();
}

export function listHeldBills() {
  return db
    .select({
      id: schema.heldBills.id,
      label: schema.heldBills.label,
      createdAt: schema.heldBills.createdAt,
    })
    .from(schema.heldBills)
    .orderBy(desc(schema.heldBills.createdAt))
    .all();
}

export function getItem(id: number) {
  return db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.id, id)).get() ?? null;
}

/** Stone/diamond rows attached to an inventory item. */
export function getItemStones(itemId: number) {
  return db
    .select()
    .from(schema.itemStones)
    .where(eq(schema.itemStones.itemId, itemId))
    .orderBy(schema.itemStones.id)
    .all();
}

/** Next sequential barcode like PG00006, based on the highest existing number. */
export function nextBarcodeNumber(prefix = "PG"): string {
  const rows = db
    .select({ barcode: schema.inventoryItems.barcode })
    .from(schema.inventoryItems)
    .all();
  let max = 0;
  for (const r of rows) {
    const m = r.barcode?.match(new RegExp(`^${prefix}(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${String(max + 1).padStart(5, "0")}`;
}

export function getDashboardStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayMs = startOfDay.getTime();

  const today = db
    .select({
      count: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(${schema.sales.grandTotal}), 0)`,
    })
    .from(schema.sales)
    .where(gte(schema.sales.createdAt, todayMs))
    .get();

  const stock = db
    .select({
      pieces: sql<number>`coalesce(sum(${schema.inventoryItems.quantity}), 0)`,
      netGrams: sql<number>`coalesce(sum(${schema.inventoryItems.netWeight} * ${schema.inventoryItems.quantity}), 0)`,
    })
    .from(schema.inventoryItems)
    .where(eq(schema.inventoryItems.status, "in_stock"))
    .get();

  return {
    todaySalesCount: today?.count ?? 0,
    todaySalesTotal: today?.total ?? 0,
    stockPieces: stock?.pieces ?? 0,
    stockNetGrams: stock?.netGrams ?? 0,
  };
}

/** Next invoice number: PG-YYYYMMDD-#### */
export function nextInvoiceNo(prefix = "PG"): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const count =
    db.select({ c: sql<number>`count(*)` }).from(schema.sales).get()?.c ?? 0;
  return `${prefix}-${ymd}-${String(count + 1).padStart(4, "0")}`;
}
