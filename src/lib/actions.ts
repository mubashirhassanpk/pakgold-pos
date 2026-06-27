"use server";

/** Server Actions — all mutations go through here. */
import { eq, sql, like } from "drizzle-orm";
import { db, schema } from "./db";
import { KARAT_PURITY, silverPurityFactor } from "./constants";
import { nextInvoiceNo, getSettings } from "./queries";
import { getCurrentUser } from "./auth";
import { round2 } from "./calculations";
import { revalidatePath } from "next/cache";

// ---- Gold rate update -------------------------------------------------------
export interface RateUpdateInput {
  karat: number;
  sellPerTola: number;
  buyPerTola: number;
}

/**
 * Insert a new rate row (history is preserved — never UPDATE old rows).
 * Also logs to the audit trail.
 */
export async function updateRates(rates: RateUpdateInput[]) {
  const user = await getCurrentUser();
  for (const r of rates) {
    const factor = KARAT_PURITY[r.karat]?.factor ?? r.karat / 24;
    db.insert(schema.goldRates)
      .values({
        karat: r.karat,
        purityFactor: factor,
        sellPerTola: r.sellPerTola,
        buyPerTola: r.buyPerTola,
        source: "manual",
        createdBy: user?.id ?? null,
      })
      .run();
    db.insert(schema.auditLog)
      .values({
        userId: user?.id ?? null,
        action: "rate_update",
        entity: "gold_rate",
        entityId: String(r.karat),
        detail: `${r.karat}K sell=${r.sellPerTola} buy=${r.buyPerTola}`,
      })
      .run();
  }
  revalidatePath("/rates");
  revalidatePath("/");
  return { ok: true };
}

// ---- Silver (Chandi) rate update -------------------------------------------
export interface SilverRateUpdateInput {
  fineness: number;
  sellPerTola: number;
  buyPerTola: number;
  sellPerKg: number;
  buyPerKg: number;
}

/**
 * Insert a new silver rate row (history preserved, like gold). The shop can
 * quote chandi per tola and/or per kg; whichever field the user edits, the
 * other is kept in sync by the editor before this is called.
 */
export async function updateSilverRates(rates: SilverRateUpdateInput[]) {
  const user = await getCurrentUser();
  for (const r of rates) {
    db.insert(schema.silverRates)
      .values({
        fineness: r.fineness,
        purityFactor: silverPurityFactor(r.fineness),
        sellPerTola: r.sellPerTola,
        buyPerTola: r.buyPerTola,
        sellPerKg: r.sellPerKg,
        buyPerKg: r.buyPerKg,
        source: "manual",
        createdBy: user?.id ?? null,
      })
      .run();
    db.insert(schema.auditLog)
      .values({
        userId: user?.id ?? null,
        action: "silver_rate_update",
        entity: "silver_rate",
        entityId: String(r.fineness),
        detail: `${r.fineness} sell/tola=${r.sellPerTola} buy/tola=${r.buyPerTola} sell/kg=${r.sellPerKg}`,
      })
      .run();
  }
  revalidatePath("/rates");
  revalidatePath("/");
  return { ok: true };
}

// ---- Create sale ------------------------------------------------------------
export interface SaleLinePayload {
  itemId: number | null;
  type: "item" | "custom";
  description: string;
  metal: "gold" | "silver";
  karat: number;
  silverPurity?: number | null;
  weightGrams: number;
  ratePerTola: number;
  goldValue: number;
  making: number;
  wastage: number;
  other: number;
  quantity: number;
  lineTotal: number;
}

export interface OldGoldPayload {
  metal: "gold" | "silver";
  weightGrams: number;
  karat: number;
  silverPurity?: number | null;
  buyRatePerTola: number;
  value: number;
  notes?: string;
}

export interface PaymentPayload {
  method: string;
  amount: number;
  reference?: string;
}

export interface CreateSalePayload {
  customerId: number | null;
  lines: SaleLinePayload[];
  oldGold: OldGoldPayload[];
  payments: PaymentPayload[];
  totals: {
    goldValueTotal: number;
    makingTotal: number;
    wastageTotal: number;
    otherTotal: number;
    subtotal: number;
    tax: number;
    discount: number;
    oldGoldTotal: number;
    grandTotal: number;
  };
}

export async function createSale(payload: CreateSalePayload) {
  const user = await getCurrentUser();
  const settings = getSettings();
  const invoiceNo = nextInvoiceNo(settings.invoice_prefix || "PG");
  const paidTotal = payload.payments.reduce((s, p) => s + p.amount, 0);

  // better-sqlite3 transaction — atomic: sale + items + old gold + payments + stock.
  // drizzle's better-sqlite3 transaction runs synchronously and returns the result.
  const saleId = db.transaction((tx) => {
    const sale = tx
      .insert(schema.sales)
      .values({
        invoiceNo,
        customerId: payload.customerId ?? null,
        userId: user?.id ?? null,
        goldValueTotal: payload.totals.goldValueTotal,
        makingTotal: payload.totals.makingTotal,
        wastageTotal: payload.totals.wastageTotal,
        otherTotal: payload.totals.otherTotal,
        subtotal: payload.totals.subtotal,
        taxTotal: payload.totals.tax,
        discount: payload.totals.discount,
        oldGoldTotal: payload.totals.oldGoldTotal,
        grandTotal: payload.totals.grandTotal,
        paidTotal,
        status: "completed",
      })
      .returning({ id: schema.sales.id })
      .get();

    for (const l of payload.lines) {
      tx.insert(schema.saleItems)
        .values({
          saleId: sale.id,
          itemId: l.itemId,
          type: l.type,
          description: l.description,
          metal: l.metal,
          karat: l.karat,
          silverPurity: l.silverPurity ?? null,
          weightGrams: l.weightGrams,
          ratePerTola: l.ratePerTola,
          goldValue: l.goldValue,
          making: l.making,
          wastage: l.wastage,
          other: l.other,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
        })
        .run();
      // Decrement stock by the quantity sold. Only flag the piece "sold" once
      // its stock actually hits zero — items with several pieces stay in stock.
      if (l.itemId) {
        const item = tx
          .select({ quantity: schema.inventoryItems.quantity })
          .from(schema.inventoryItems)
          .where(eq(schema.inventoryItems.id, l.itemId))
          .get();
        const remaining = Math.max(0, (item?.quantity ?? 0) - (l.quantity || 1));
        tx.update(schema.inventoryItems)
          .set({ quantity: remaining, status: remaining <= 0 ? "sold" : "in_stock" })
          .where(eq(schema.inventoryItems.id, l.itemId))
          .run();
      }
    }

    for (const g of payload.oldGold) {
      tx.insert(schema.oldGoldItems)
        .values({
          saleId: sale.id,
          metal: g.metal,
          weightGrams: g.weightGrams,
          karat: g.karat,
          silverPurity: g.silverPurity ?? null,
          buyRatePerTola: g.buyRatePerTola,
          value: g.value,
          notes: g.notes ?? null,
        })
        .run();
    }

    for (const p of payload.payments) {
      tx.insert(schema.payments)
        .values({ saleId: sale.id, method: p.method, amount: p.amount, reference: p.reference ?? null })
        .run();
    }

    // Udhaar: any unpaid remainder is added to the customer's outstanding balance.
    const remainder = Math.round((payload.totals.grandTotal - paidTotal) * 100) / 100;
    if (payload.customerId && remainder > 0) {
      tx.update(schema.customers)
        .set({ balance: sql`${schema.customers.balance} + ${remainder}` })
        .where(eq(schema.customers.id, payload.customerId))
        .run();
    }

    tx.insert(schema.auditLog)
      .values({
        userId: user?.id ?? null,
        action: "sale_create",
        entity: "sale",
        entityId: String(sale.id),
        detail: `${invoiceNo} total=${payload.totals.grandTotal} paid=${paidTotal}`,
      })
      .run();

    return sale.id;
  });

  revalidatePath("/");
  revalidatePath("/inventory");
  return { ok: true, saleId, invoiceNo };
}

// ---- Delete / void a sale (mistaken bill) -----------------------------------
/**
 * Permanently remove a sale that was billed by mistake. Restocks any inventory
 * pieces, reverses the customer's udhaar from this bill, unlinks repair/booking/
 * committee references, then cascade-deletes the sale + its items/payments.
 * Owner/manager only.
 */
export async function deleteSale(saleId: number) {
  const user = await getCurrentUser();
  if (user?.role !== "owner" && user?.role !== "manager") {
    return { ok: false as const, error: "Only owner or manager can delete a sale" };
  }
  const sale = db.select().from(schema.sales).where(eq(schema.sales.id, saleId)).get();
  if (!sale) return { ok: false as const, error: "Sale not found" };
  if (sale.status === "return") {
    return { ok: false as const, error: "This is a return record, not a sale." };
  }
  // Don't delete a sale that already has returns booked against it.
  const ret = db
    .select({ c: sql<number>`count(*)` })
    .from(schema.sales)
    .where(like(schema.sales.invoiceNo, `${sale.invoiceNo}-R%`))
    .get();
  if ((ret?.c ?? 0) > 0) {
    return { ok: false as const, error: "This sale has returns recorded. Delete those first." };
  }

  // A voided sale has already had its stock + balance reversed — don't repeat it.
  const alreadyReversed = sale.status === "void";

  db.transaction((tx) => {
    if (!alreadyReversed) {
      // Restock sold pieces.
      const items = tx.select().from(schema.saleItems).where(eq(schema.saleItems.saleId, saleId)).all();
      for (const it of items) {
        if (it.itemId && it.quantity > 0) {
          const inv = tx
            .select({ quantity: schema.inventoryItems.quantity })
            .from(schema.inventoryItems)
            .where(eq(schema.inventoryItems.id, it.itemId))
            .get();
          if (inv) {
            tx.update(schema.inventoryItems)
              .set({ quantity: (inv.quantity ?? 0) + it.quantity, status: "in_stock" })
              .where(eq(schema.inventoryItems.id, it.itemId))
              .run();
          }
        }
      }
      // Reverse the udhaar this bill added to the customer.
      const remainder = Math.round((sale.grandTotal - sale.paidTotal) * 100) / 100;
      if (sale.customerId && remainder > 0) {
        tx.update(schema.customers)
          .set({ balance: sql`${schema.customers.balance} - ${remainder}` })
          .where(eq(schema.customers.id, sale.customerId))
          .run();
      }
    }
    // Unlink references so the FK delete doesn't fail.
    tx.update(schema.repairJobs).set({ saleId: null }).where(eq(schema.repairJobs.saleId, saleId)).run();
    tx.update(schema.bookings).set({ saleId: null }).where(eq(schema.bookings.saleId, saleId)).run();
    tx.update(schema.committeePayouts).set({ saleId: null }).where(eq(schema.committeePayouts.saleId, saleId)).run();
    // Cascade-deletes sale_items, old_gold_items and payments.
    tx.delete(schema.sales).where(eq(schema.sales.id, saleId)).run();
    tx.insert(schema.auditLog)
      .values({
        userId: user?.id ?? null,
        action: "sale_delete",
        entity: "sale",
        entityId: String(saleId),
        detail: `${sale.invoiceNo} total=${sale.grandTotal} deleted (stock restored, udhaar reversed)`,
      })
      .run();
  });

  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath("/invoices");
  revalidatePath("/reports");
  return { ok: true as const };
}

/**
 * Void a sale: keep the record (status = "void") but reverse its effects —
 * restock the pieces and reverse the customer's udhaar. Voided sales are hidden
 * from invoice lists, reports and day-close but remain for history/audit.
 */
export async function voidSale(saleId: number) {
  const user = await getCurrentUser();
  if (user?.role !== "owner" && user?.role !== "manager") {
    return { ok: false as const, error: "Only owner or manager can void a sale" };
  }
  const sale = db.select().from(schema.sales).where(eq(schema.sales.id, saleId)).get();
  if (!sale) return { ok: false as const, error: "Sale not found" };
  if (sale.status !== "completed") {
    return { ok: false as const, error: "Only a completed sale can be voided" };
  }
  const ret = db
    .select({ c: sql<number>`count(*)` })
    .from(schema.sales)
    .where(like(schema.sales.invoiceNo, `${sale.invoiceNo}-R%`))
    .get();
  if ((ret?.c ?? 0) > 0) {
    return { ok: false as const, error: "This sale has returns recorded. Delete those first." };
  }

  db.transaction((tx) => {
    const items = tx.select().from(schema.saleItems).where(eq(schema.saleItems.saleId, saleId)).all();
    for (const it of items) {
      if (it.itemId && it.quantity > 0) {
        const inv = tx
          .select({ quantity: schema.inventoryItems.quantity })
          .from(schema.inventoryItems)
          .where(eq(schema.inventoryItems.id, it.itemId))
          .get();
        if (inv) {
          tx.update(schema.inventoryItems)
            .set({ quantity: (inv.quantity ?? 0) + it.quantity, status: "in_stock" })
            .where(eq(schema.inventoryItems.id, it.itemId))
            .run();
        }
      }
    }
    const remainder = Math.round((sale.grandTotal - sale.paidTotal) * 100) / 100;
    if (sale.customerId && remainder > 0) {
      tx.update(schema.customers)
        .set({ balance: sql`${schema.customers.balance} - ${remainder}` })
        .where(eq(schema.customers.id, sale.customerId))
        .run();
    }
    tx.update(schema.sales).set({ status: "void" }).where(eq(schema.sales.id, saleId)).run();
    tx.insert(schema.auditLog)
      .values({
        userId: user?.id ?? null,
        action: "sale_void",
        entity: "sale",
        entityId: String(saleId),
        detail: `${sale.invoiceNo} voided (stock restored, udhaar reversed)`,
      })
      .run();
  });

  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath("/invoices");
  revalidatePath("/reports");
  revalidatePath(`/invoice/${saleId}`);
  return { ok: true as const };
}

// ---- Sales return / refund --------------------------------------------------
export interface ReturnLinePayload {
  itemId: number | null;
  description: string;
  metal: "gold" | "silver";
  karat: number;
  silverPurity?: number | null;
  weightGrams: number; // per-piece weight (used for weight-ledger netting)
  quantity: number; // pieces being returned (> 0)
  refundAmount: number; // rupees refunded for this line
}

export interface CreateReturnPayload {
  saleId: number;
  lines: ReturnLinePayload[];
  refundMethod: string;
}

/**
 * Record a sales return against an existing invoice. The return is stored as a
 * sibling sale row with status "return" and NEGATIVE quantities/amounts, so all
 * the existing aggregates (which now include returns) net it out automatically.
 *
 * Refund policy (per shop preference): apply the refund to the customer's
 * outstanding balance first, then pay any remainder out of the cash drawer.
 * Returned pieces are put back into stock.
 */
export async function createReturn(payload: CreateReturnPayload) {
  const user = await getCurrentUser();
  // Refunds move money and restock — restrict to owner/manager regardless of UI.
  if (user?.role !== "owner" && user?.role !== "manager") {
    return { ok: false as const, error: "Only owner or manager can process returns" };
  }
  const orig = db.select().from(schema.sales).where(eq(schema.sales.id, payload.saleId)).get();
  if (!orig) return { ok: false as const, error: "Original sale not found" };
  if (orig.status === "return") return { ok: false as const, error: "Cannot return a return" };

  const lines = payload.lines.filter((l) => l.quantity > 0 && l.refundAmount >= 0);
  if (lines.length === 0) return { ok: false as const, error: "Select at least one item to return" };
  const refundTotal = round2(lines.reduce((s, l) => s + l.refundAmount, 0));
  if (refundTotal <= 0) return { ok: false as const, error: "Refund amount must be greater than zero" };

  const result = db.transaction((tx) => {
    // Unique return invoice number derived from the original (PG-...-R1, -R2…).
    const prior =
      tx
        .select({ c: sql<number>`count(*)` })
        .from(schema.sales)
        .where(like(schema.sales.invoiceNo, `${orig.invoiceNo}-R%`))
        .get()?.c ?? 0;
    const returnNo = `${orig.invoiceNo}-R${prior + 1}`;

    // Balance-first refund: knock down any udhaar, then the rest is cash out.
    let balanceApplied = 0;
    if (orig.customerId) {
      const cust = tx
        .select({ balance: schema.customers.balance })
        .from(schema.customers)
        .where(eq(schema.customers.id, orig.customerId))
        .get();
      const bal = Math.max(0, cust?.balance ?? 0);
      balanceApplied = round2(Math.min(refundTotal, bal));
      if (balanceApplied > 0) {
        tx.update(schema.customers)
          .set({ balance: sql`${schema.customers.balance} - ${balanceApplied}` })
          .where(eq(schema.customers.id, orig.customerId))
          .run();
      }
    }
    const cashRefund = round2(refundTotal - balanceApplied);

    const ret = tx
      .insert(schema.sales)
      .values({
        invoiceNo: returnNo,
        customerId: orig.customerId,
        userId: user?.id ?? null,
        goldValueTotal: 0,
        makingTotal: 0,
        wastageTotal: 0,
        otherTotal: 0,
        subtotal: -refundTotal,
        taxTotal: 0,
        discount: 0,
        oldGoldTotal: 0,
        grandTotal: -refundTotal,
        paidTotal: -cashRefund,
        status: "return",
      })
      .returning({ id: schema.sales.id })
      .get();

    for (const l of lines) {
      // Weight stays positive but quantity is negative, so weight*qty nets the
      // sold-weight ledgers; lineTotal is negative so value aggregates net too.
      tx.insert(schema.saleItems)
        .values({
          saleId: ret.id,
          itemId: l.itemId,
          type: l.itemId ? "item" : "custom",
          description: `RETURN: ${l.description}`,
          metal: l.metal,
          karat: l.karat,
          silverPurity: l.silverPurity ?? null,
          weightGrams: Math.abs(l.weightGrams),
          ratePerTola: 0,
          goldValue: 0,
          making: 0,
          wastage: 0,
          other: 0,
          quantity: -Math.abs(l.quantity),
          lineTotal: -Math.abs(l.refundAmount),
        })
        .run();
      // Put the returned pieces back into stock.
      if (l.itemId) {
        const item = tx
          .select({ quantity: schema.inventoryItems.quantity })
          .from(schema.inventoryItems)
          .where(eq(schema.inventoryItems.id, l.itemId))
          .get();
        tx.update(schema.inventoryItems)
          .set({ quantity: (item?.quantity ?? 0) + Math.abs(l.quantity), status: "in_stock" })
          .where(eq(schema.inventoryItems.id, l.itemId))
          .run();
      }
    }

    if (cashRefund > 0) {
      tx.insert(schema.payments)
        .values({
          saleId: ret.id,
          method: payload.refundMethod,
          amount: -cashRefund,
          reference: `refund for ${orig.invoiceNo}`,
        })
        .run();
    }

    tx.insert(schema.auditLog)
      .values({
        userId: user?.id ?? null,
        action: "sale_return",
        entity: "sale",
        entityId: String(ret.id),
        detail: `${returnNo} refund=${refundTotal} (balance ${balanceApplied}, cash ${cashRefund}) vs ${orig.invoiceNo}`,
      })
      .run();

    return { id: ret.id, returnNo, refundTotal, balanceApplied, cashRefund };
  });

  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath(`/invoice/${payload.saleId}`);
  revalidatePath("/reports");
  revalidatePath("/day-close");
  return { ok: true as const, ...result };
}
