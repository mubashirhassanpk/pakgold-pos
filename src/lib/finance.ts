/** Server-only: expenses, day-close (roznamcha) and audit-log queries. */
import "server-only";
import { db, schema } from "./db";
import { and, desc, eq, gte, lte, sql, isNull, isNotNull, like, inArray, ne } from "drizzle-orm";

// --- Expenses ----------------------------------------------------------------
export function listExpenses(from?: number, to?: number) {
  const conds = [];
  if (from) conds.push(gte(schema.expenses.expenseDate, from));
  if (to) conds.push(lte(schema.expenses.expenseDate, to));
  const q = db.select().from(schema.expenses);
  return (conds.length ? q.where(and(...conds)) : q).orderBy(desc(schema.expenses.expenseDate)).all();
}

// --- Day close (roznamcha) ---------------------------------------------------
export interface DayClose {
  salesCount: number;
  salesTotal: number;
  salesByMethod: { method: string; amount: number }[];
  udhaarByMethod: { method: string; amount: number }[];
  oldGoldByMethod: { method: string; amount: number }[];
  oldGoldWeight: number;
  expensesByCategory: { category: string; amount: number }[];
  expensesByMethod: { method: string; amount: number }[];
  karigarPayouts: { name: string; amount: number }[];
  karigarPayoutTotal: number;
  cashIn: number;
  cashOut: number;
  netCash: number;
}

function sumByMethod(rows: { method: string; amount: number }[], method = "cash") {
  return rows.filter((r) => r.method === method).reduce((s, r) => s + r.amount, 0);
}

export function getDayClose(from: number, to: number): DayClose {
  const sales = db
    .select({
      count: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(${schema.sales.grandTotal}),0)`,
    })
    .from(schema.sales)
    .where(and(gte(schema.sales.createdAt, from), lte(schema.sales.createdAt, to), inArray(schema.sales.status, ["completed", "return"])))
    .get();

  // Sale receipts (payments tied to a sale)
  const salesByMethod = db
    .select({ method: schema.payments.method, amount: sql<number>`coalesce(sum(${schema.payments.amount}),0)` })
    .from(schema.payments)
    .where(and(gte(schema.payments.createdAt, from), lte(schema.payments.createdAt, to), isNotNull(schema.payments.saleId)))
    .groupBy(schema.payments.method)
    .all();

  // Udhaar received (standalone customer settlements, saleId null)
  const udhaarByMethod = db
    .select({ method: schema.payments.method, amount: sql<number>`coalesce(sum(${schema.payments.amount}),0)` })
    .from(schema.payments)
    .where(and(gte(schema.payments.createdAt, from), lte(schema.payments.createdAt, to), isNull(schema.payments.saleId)))
    .groupBy(schema.payments.method)
    .all();

  // Old gold bought (cash/bank paid out)
  const oldGoldByMethod = db
    .select({ method: schema.oldGoldPurchases.method, amount: sql<number>`coalesce(sum(${schema.oldGoldPurchases.paid}),0)` })
    .from(schema.oldGoldPurchases)
    .where(and(gte(schema.oldGoldPurchases.createdAt, from), lte(schema.oldGoldPurchases.createdAt, to), ne(schema.oldGoldPurchases.status, "void")))
    .groupBy(schema.oldGoldPurchases.method)
    .all();
  const oldGoldWeight =
    db
      .select({ w: sql<number>`coalesce(sum(${schema.oldGoldPurchases.totalWeight}),0)` })
      .from(schema.oldGoldPurchases)
      .where(and(gte(schema.oldGoldPurchases.createdAt, from), lte(schema.oldGoldPurchases.createdAt, to), ne(schema.oldGoldPurchases.status, "void")))
      .get()?.w ?? 0;

  const expensesByCategory = db
    .select({ category: schema.expenses.category, amount: sql<number>`coalesce(sum(${schema.expenses.amount}),0)` })
    .from(schema.expenses)
    .where(and(gte(schema.expenses.expenseDate, from), lte(schema.expenses.expenseDate, to)))
    .groupBy(schema.expenses.category)
    .all();
  const expensesByMethod = db
    .select({ method: schema.expenses.method, amount: sql<number>`coalesce(sum(${schema.expenses.amount}),0)` })
    .from(schema.expenses)
    .where(and(gte(schema.expenses.expenseDate, from), lte(schema.expenses.expenseDate, to)))
    .groupBy(schema.expenses.method)
    .all();

  // Salary / karigar payouts (cash paid to craftsmen & staff: payouts + advances).
  const karigarPayouts = db
    .select({
      name: schema.karigars.name,
      amount: sql<number>`coalesce(sum(${schema.karigarLedger.amount}),0)`,
    })
    .from(schema.karigarLedger)
    .innerJoin(schema.karigars, eq(schema.karigarLedger.karigarId, schema.karigars.id))
    .where(
      and(
        gte(schema.karigarLedger.entryDate, from),
        lte(schema.karigarLedger.entryDate, to),
        sql`${schema.karigarLedger.kind} in ('payout','advance')`
      )
    )
    .groupBy(schema.karigarLedger.karigarId)
    .all();
  const karigarPayoutTotal = karigarPayouts.reduce((s, r) => s + r.amount, 0);

  // Cash position (cash method only): in = sale cash + udhaar cash; out = old-gold
  // cash + expense cash + karigar/salary payouts.
  const cashIn = sumByMethod(salesByMethod) + sumByMethod(udhaarByMethod);
  const cashOut = sumByMethod(oldGoldByMethod) + sumByMethod(expensesByMethod) + karigarPayoutTotal;

  return {
    salesCount: sales?.count ?? 0,
    salesTotal: sales?.total ?? 0,
    salesByMethod,
    udhaarByMethod,
    oldGoldByMethod,
    oldGoldWeight,
    expensesByCategory,
    expensesByMethod,
    karigarPayouts,
    karigarPayoutTotal,
    cashIn,
    cashOut,
    netCash: cashIn - cashOut,
  };
}

// --- Gold weight ledger (tola in / out / stock) ------------------------------
export interface KaratWeight {
  karat: number;
  grams: number;
}

export interface GoldLedger {
  soldByKarat: KaratWeight[];
  oldGoldInByKarat: KaratWeight[];
  stockInByKarat: KaratWeight[];
  currentStockByKarat: KaratWeight[];
}

export function getGoldLedger(from: number, to: number): GoldLedger {
  const soldByKarat = db
    .select({
      karat: schema.saleItems.karat,
      grams: sql<number>`coalesce(sum(${schema.saleItems.weightGrams} * ${schema.saleItems.quantity}),0)`,
    })
    .from(schema.saleItems)
    .innerJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id))
    .where(and(gte(schema.sales.createdAt, from), lte(schema.sales.createdAt, to), inArray(schema.sales.status, ["completed", "return"]), eq(schema.saleItems.metal, "gold")))
    .groupBy(schema.saleItems.karat)
    .all();

  const oldGoldInByKarat = db
    .select({
      karat: schema.oldGoldPurchaseItems.karat,
      grams: sql<number>`coalesce(sum(${schema.oldGoldPurchaseItems.weightGrams}),0)`,
    })
    .from(schema.oldGoldPurchaseItems)
    .innerJoin(schema.oldGoldPurchases, eq(schema.oldGoldPurchaseItems.purchaseId, schema.oldGoldPurchases.id))
    .where(and(gte(schema.oldGoldPurchases.createdAt, from), lte(schema.oldGoldPurchases.createdAt, to), ne(schema.oldGoldPurchases.status, "void"), eq(schema.oldGoldPurchaseItems.metal, "gold")))
    .groupBy(schema.oldGoldPurchaseItems.karat)
    .all();

  const stockInByKarat = db
    .select({
      karat: schema.inventoryItems.karat,
      grams: sql<number>`coalesce(sum(${schema.inventoryItems.netWeight} * ${schema.inventoryItems.quantity}),0)`,
    })
    .from(schema.inventoryItems)
    .where(and(gte(schema.inventoryItems.createdAt, from), lte(schema.inventoryItems.createdAt, to), eq(schema.inventoryItems.metal, "gold")))
    .groupBy(schema.inventoryItems.karat)
    .all();

  const currentStockByKarat = db
    .select({
      karat: schema.inventoryItems.karat,
      grams: sql<number>`coalesce(sum(${schema.inventoryItems.netWeight} * ${schema.inventoryItems.quantity}),0)`,
    })
    .from(schema.inventoryItems)
    .where(and(eq(schema.inventoryItems.status, "in_stock"), eq(schema.inventoryItems.metal, "gold")))
    .groupBy(schema.inventoryItems.karat)
    .all();

  return { soldByKarat, oldGoldInByKarat, stockInByKarat, currentStockByKarat };
}

// --- Silver (chandi) weight ledger ------------------------------------------
export interface PurityWeight {
  fineness: number;
  grams: number;
}

export interface SilverLedger {
  soldByPurity: PurityWeight[];
  oldSilverInByPurity: PurityWeight[];
  stockInByPurity: PurityWeight[];
  currentStockByPurity: PurityWeight[];
}

export function getSilverLedger(from: number, to: number): SilverLedger {
  const soldByPurity = db
    .select({
      fineness: sql<number>`coalesce(${schema.saleItems.silverPurity}, 999)`,
      grams: sql<number>`coalesce(sum(${schema.saleItems.weightGrams} * ${schema.saleItems.quantity}),0)`,
    })
    .from(schema.saleItems)
    .innerJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id))
    .where(and(gte(schema.sales.createdAt, from), lte(schema.sales.createdAt, to), inArray(schema.sales.status, ["completed", "return"]), eq(schema.saleItems.metal, "silver")))
    .groupBy(schema.saleItems.silverPurity)
    .all();

  const oldSilverInByPurity = db
    .select({
      fineness: sql<number>`coalesce(${schema.oldGoldPurchaseItems.silverPurity}, 999)`,
      grams: sql<number>`coalesce(sum(${schema.oldGoldPurchaseItems.weightGrams}),0)`,
    })
    .from(schema.oldGoldPurchaseItems)
    .innerJoin(schema.oldGoldPurchases, eq(schema.oldGoldPurchaseItems.purchaseId, schema.oldGoldPurchases.id))
    .where(and(gte(schema.oldGoldPurchases.createdAt, from), lte(schema.oldGoldPurchases.createdAt, to), ne(schema.oldGoldPurchases.status, "void"), eq(schema.oldGoldPurchaseItems.metal, "silver")))
    .groupBy(schema.oldGoldPurchaseItems.silverPurity)
    .all();

  const stockInByPurity = db
    .select({
      fineness: sql<number>`coalesce(${schema.inventoryItems.silverPurity}, 999)`,
      grams: sql<number>`coalesce(sum(${schema.inventoryItems.netWeight} * ${schema.inventoryItems.quantity}),0)`,
    })
    .from(schema.inventoryItems)
    .where(and(gte(schema.inventoryItems.createdAt, from), lte(schema.inventoryItems.createdAt, to), eq(schema.inventoryItems.metal, "silver")))
    .groupBy(schema.inventoryItems.silverPurity)
    .all();

  const currentStockByPurity = db
    .select({
      fineness: sql<number>`coalesce(${schema.inventoryItems.silverPurity}, 999)`,
      grams: sql<number>`coalesce(sum(${schema.inventoryItems.netWeight} * ${schema.inventoryItems.quantity}),0)`,
    })
    .from(schema.inventoryItems)
    .where(and(eq(schema.inventoryItems.status, "in_stock"), eq(schema.inventoryItems.metal, "silver")))
    .groupBy(schema.inventoryItems.silverPurity)
    .all();

  return { soldByPurity, oldSilverInByPurity, stockInByPurity, currentStockByPurity };
}

// --- Audit log ---------------------------------------------------------------
export function listAuditLog(opts: { action?: string; limit?: number } = {}) {
  const conds = [];
  if (opts.action) conds.push(like(schema.auditLog.action, `%${opts.action}%`));
  const q = db
    .select({
      id: schema.auditLog.id,
      action: schema.auditLog.action,
      entity: schema.auditLog.entity,
      entityId: schema.auditLog.entityId,
      detail: schema.auditLog.detail,
      createdAt: schema.auditLog.createdAt,
      userName: schema.users.name,
    })
    .from(schema.auditLog)
    .leftJoin(schema.users, eq(schema.auditLog.userId, schema.users.id));
  return (conds.length ? q.where(and(...conds)) : q)
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(opts.limit ?? 200)
    .all();
}
