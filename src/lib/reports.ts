/** Server-only report aggregations over the sales data. */
import "server-only";
import { db, schema } from "./db";
import { sql, and, gte, lte, eq, desc, inArray } from "drizzle-orm";
import { KARAT_PURITY } from "./constants";

export type RangePreset = "today" | "week" | "month" | "all";

export interface DateRange {
  fromMs: number;
  toMs: number;
  label: string;
}

/** Resolve a preset into concrete millisecond bounds (local time). */
export function resolveRange(preset: RangePreset): DateRange {
  const now = new Date();
  const end = now.getTime();
  const start = new Date(now);
  switch (preset) {
    case "today":
      start.setHours(0, 0, 0, 0);
      return { fromMs: start.getTime(), toMs: end, label: "Today" };
    case "week":
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { fromMs: start.getTime(), toMs: end, label: "Last 7 days" };
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { fromMs: start.getTime(), toMs: end, label: "This month" };
    case "all":
      return { fromMs: 0, toMs: end, label: "All time" };
  }
}

// Returns are stored as sibling "return" sales with negative amounts, so we
// include them here — every aggregate built on this nets refunds out.
const inRange = (r: DateRange) =>
  and(
    gte(schema.sales.createdAt, r.fromMs),
    lte(schema.sales.createdAt, r.toMs),
    inArray(schema.sales.status, ["completed", "return"])
  );

export interface ReportSummary {
  count: number;
  grandTotal: number;
  subtotal: number;
  goldValueTotal: number;
  makingTotal: number;
  wastageTotal: number;
  taxTotal: number;
  discountTotal: number;
  oldGoldTotal: number;
}

export function getReport(r: DateRange) {
  const summaryRow = db
    .select({
      count: sql<number>`count(*)`,
      grandTotal: sql<number>`coalesce(sum(${schema.sales.grandTotal}),0)`,
      subtotal: sql<number>`coalesce(sum(${schema.sales.subtotal}),0)`,
      goldValueTotal: sql<number>`coalesce(sum(${schema.sales.goldValueTotal}),0)`,
      makingTotal: sql<number>`coalesce(sum(${schema.sales.makingTotal}),0)`,
      wastageTotal: sql<number>`coalesce(sum(${schema.sales.wastageTotal}),0)`,
      taxTotal: sql<number>`coalesce(sum(${schema.sales.taxTotal}),0)`,
      discountTotal: sql<number>`coalesce(sum(${schema.sales.discount}),0)`,
      oldGoldTotal: sql<number>`coalesce(sum(${schema.sales.oldGoldTotal}),0)`,
    })
    .from(schema.sales)
    .where(inRange(r))
    .get();

  const summary: ReportSummary = summaryRow ?? {
    count: 0,
    grandTotal: 0,
    subtotal: 0,
    goldValueTotal: 0,
    makingTotal: 0,
    wastageTotal: 0,
    taxTotal: 0,
    discountTotal: 0,
    oldGoldTotal: 0,
  };

  // By payment method
  const byPayment = db
    .select({
      method: schema.payments.method,
      amount: sql<number>`coalesce(sum(${schema.payments.amount}),0)`,
    })
    .from(schema.payments)
    .innerJoin(schema.sales, eq(schema.payments.saleId, schema.sales.id))
    .where(inRange(r))
    .groupBy(schema.payments.method)
    .all();

  // By purity (karat) — value + weight sold (GOLD only; silver shown separately)
  const byKarat = db
    .select({
      karat: schema.saleItems.karat,
      total: sql<number>`coalesce(sum(${schema.saleItems.lineTotal}),0)`,
      grams: sql<number>`coalesce(sum(${schema.saleItems.weightGrams} * ${schema.saleItems.quantity}),0)`,
    })
    .from(schema.saleItems)
    .innerJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id))
    .where(and(inRange(r), eq(schema.saleItems.metal, "gold")))
    .groupBy(schema.saleItems.karat)
    .all();

  // Silver by fineness — value + weight sold
  const bySilverPurity = db
    .select({
      fineness: sql<number>`coalesce(${schema.saleItems.silverPurity}, 999)`,
      total: sql<number>`coalesce(sum(${schema.saleItems.lineTotal}),0)`,
      grams: sql<number>`coalesce(sum(${schema.saleItems.weightGrams} * ${schema.saleItems.quantity}),0)`,
    })
    .from(schema.saleItems)
    .innerJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id))
    .where(and(inRange(r), eq(schema.saleItems.metal, "silver")))
    .groupBy(schema.saleItems.silverPurity)
    .all();

  // Sales split by metal (value + weight)
  const byMetal = db
    .select({
      metal: schema.saleItems.metal,
      total: sql<number>`coalesce(sum(${schema.saleItems.lineTotal}),0)`,
      grams: sql<number>`coalesce(sum(${schema.saleItems.weightGrams} * ${schema.saleItems.quantity}),0)`,
    })
    .from(schema.saleItems)
    .innerJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id))
    .where(inRange(r))
    .groupBy(schema.saleItems.metal)
    .all();

  // By category (custom items fall under "Custom")
  const byCategory = db
    .select({
      category: sql<string>`coalesce(${schema.categories.nameEn}, 'Custom / Loose')`,
      total: sql<number>`coalesce(sum(${schema.saleItems.lineTotal}),0)`,
    })
    .from(schema.saleItems)
    .innerJoin(schema.sales, eq(schema.saleItems.saleId, schema.sales.id))
    .leftJoin(schema.inventoryItems, eq(schema.saleItems.itemId, schema.inventoryItems.id))
    .leftJoin(schema.categories, eq(schema.inventoryItems.categoryId, schema.categories.id))
    .where(inRange(r))
    .groupBy(sql`1`)
    .all();

  // Daily series (local date)
  const daily = db
    .select({
      day: sql<string>`date(${schema.sales.createdAt}/1000, 'unixepoch', 'localtime')`,
      total: sql<number>`coalesce(sum(${schema.sales.grandTotal}),0)`,
    })
    .from(schema.sales)
    .where(inRange(r))
    .groupBy(sql`1`)
    .orderBy(sql`1`)
    .all();

  // By salesman / staff — sales & making attributed to the user who billed.
  const bySalesman = db
    .select({
      userId: schema.sales.userId,
      name: sql<string>`coalesce(${schema.users.name}, 'Unassigned')`,
      role: sql<string>`coalesce(${schema.users.role}, '')`,
      bills: sql<number>`count(*)`,
      grandTotal: sql<number>`coalesce(sum(${schema.sales.grandTotal}),0)`,
      makingTotal: sql<number>`coalesce(sum(${schema.sales.makingTotal}),0)`,
      goldValueTotal: sql<number>`coalesce(sum(${schema.sales.goldValueTotal}),0)`,
      wastageTotal: sql<number>`coalesce(sum(${schema.sales.wastageTotal}),0)`,
      discountTotal: sql<number>`coalesce(sum(${schema.sales.discount}),0)`,
    })
    .from(schema.sales)
    .leftJoin(schema.users, eq(schema.sales.userId, schema.users.id))
    .where(inRange(r))
    .groupBy(schema.sales.userId)
    .all();

  // Expenses by category (kharcha) within the range.
  const expensesByCategory = db
    .select({
      category: schema.expenses.category,
      amount: sql<number>`coalesce(sum(${schema.expenses.amount}),0)`,
    })
    .from(schema.expenses)
    .where(and(gte(schema.expenses.expenseDate, r.fromMs), lte(schema.expenses.expenseDate, r.toMs)))
    .groupBy(schema.expenses.category)
    .all();
  const expensesTotal = expensesByCategory.reduce((s, e) => s + e.amount, 0);

  // Salary / karigar payouts (payouts + advances) within the range.
  const karigarPayouts = db
    .select({
      name: schema.karigars.name,
      amount: sql<number>`coalesce(sum(${schema.karigarLedger.amount}),0)`,
    })
    .from(schema.karigarLedger)
    .innerJoin(schema.karigars, eq(schema.karigarLedger.karigarId, schema.karigars.id))
    .where(
      and(
        gte(schema.karigarLedger.entryDate, r.fromMs),
        lte(schema.karigarLedger.entryDate, r.toMs),
        sql`${schema.karigarLedger.kind} in ('payout','advance')`
      )
    )
    .groupBy(schema.karigarLedger.karigarId)
    .all();
  const karigarPayoutTotal = karigarPayouts.reduce((s, k) => s + k.amount, 0);

  // Top customers by purchase value in range.
  const topCustomers = db
    .select({
      name: sql<string>`coalesce(${schema.customers.name}, 'Walk-in')`,
      bills: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(${schema.sales.grandTotal}),0)`,
    })
    .from(schema.sales)
    .leftJoin(schema.customers, eq(schema.sales.customerId, schema.customers.id))
    .where(inRange(r))
    .groupBy(schema.sales.customerId)
    .orderBy(desc(sql`coalesce(sum(${schema.sales.grandTotal}),0)`))
    .limit(10)
    .all();

  // Recent invoices
  const recent = db
    .select({
      id: schema.sales.id,
      invoiceNo: schema.sales.invoiceNo,
      grandTotal: schema.sales.grandTotal,
      oldGoldTotal: schema.sales.oldGoldTotal,
      taxTotal: schema.sales.taxTotal,
      createdAt: schema.sales.createdAt,
    })
    .from(schema.sales)
    .where(inRange(r))
    .orderBy(desc(schema.sales.createdAt))
    .limit(50)
    .all();

  return {
    summary,
    byPayment: byPayment.map((p) => ({ label: p.method.toUpperCase(), value: p.amount })),
    byKarat: byKarat
      .sort((a, b) => b.karat - a.karat)
      .map((k) => ({
        label: `${k.karat}K (${KARAT_PURITY[k.karat]?.hallmark ?? "—"})`,
        value: k.total,
        grams: k.grams,
      })),
    bySilverPurity: bySilverPurity
      .sort((a, b) => b.fineness - a.fineness)
      .map((s) => ({
        label: `${s.fineness} Silver`,
        value: s.total,
        grams: s.grams,
      })),
    byMetal: byMetal
      .map((m) => ({
        label: (m.metal ?? "gold") === "silver" ? "Silver" : "Gold",
        value: m.total,
        grams: m.grams,
      }))
      .sort((a, b) => b.value - a.value),
    byCategory: byCategory
      .sort((a, b) => b.total - a.total)
      .map((c) => ({ label: c.category, value: c.total })),
    bySalesman: bySalesman
      .map((s) => ({
        userId: s.userId,
        name: s.name,
        role: s.role,
        bills: s.bills,
        grandTotal: s.grandTotal,
        makingTotal: s.makingTotal,
        goldValueTotal: s.goldValueTotal,
        wastageTotal: s.wastageTotal,
        discountTotal: s.discountTotal,
        avgBill: s.bills ? s.grandTotal / s.bills : 0,
      }))
      .sort((a, b) => b.grandTotal - a.grandTotal),
    expensesByCategory: expensesByCategory
      .map((e) => ({ label: e.category, value: e.amount }))
      .sort((a, b) => b.value - a.value),
    expensesTotal,
    karigarPayouts: karigarPayouts
      .map((k) => ({ label: k.name, value: k.amount }))
      .sort((a, b) => b.value - a.value),
    karigarPayoutTotal,
    topCustomers,
    daily,
    recent,
  };
}
