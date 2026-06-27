"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "./db";
import { getCurrentUser } from "./auth";
import { nextVoucherNo } from "./oldgold";
import { round2 } from "./calculations";

export interface BuyLine {
  metal: "gold" | "silver";
  weightGrams: number;
  karat: number;
  silverPurity?: number | null;
  buyRatePerTola: number;
  value: number;
  notes?: string;
}

export interface BuyPayload {
  customerId: number | null;
  customerName: string;
  phone?: string;
  method: string;
  paid: number;
  notes?: string;
  lines: BuyLine[];
}

export async function createOldGoldPurchase(payload: BuyPayload) {
  const user = await getCurrentUser();
  if (payload.lines.length === 0) return { ok: false as const, error: "Add at least one item" };

  const totalWeight = round2(payload.lines.reduce((s, l) => s + l.weightGrams, 0));
  const totalValue = round2(payload.lines.reduce((s, l) => s + l.value, 0));
  const paid = round2(payload.paid);
  const voucherNo = nextVoucherNo();

  const id = db.transaction((tx) => {
    const p = tx
      .insert(schema.oldGoldPurchases)
      .values({
        voucherNo,
        customerId: payload.customerId ?? null,
        customerName: payload.customerName?.trim() || "Walk-in",
        phone: payload.phone?.trim() || null,
        totalWeight,
        totalValue,
        paid,
        method: payload.method,
        notes: payload.notes?.trim() || null,
        userId: user?.id ?? null,
      })
      .returning({ id: schema.oldGoldPurchases.id })
      .get();

    for (const l of payload.lines) {
      tx.insert(schema.oldGoldPurchaseItems)
        .values({
          purchaseId: p.id,
          metal: l.metal,
          weightGrams: l.weightGrams,
          karat: l.karat,
          silverPurity: l.silverPurity ?? null,
          buyRatePerTola: l.buyRatePerTola,
          value: l.value,
          notes: l.notes ?? null,
        })
        .run();
    }

    // If we didn't pay the customer in full, the shop owes them → negative balance.
    const owed = round2(totalValue - paid);
    if (payload.customerId && owed > 0) {
      tx.update(schema.customers)
        .set({ balance: sql`${schema.customers.balance} - ${owed}` })
        .where(eq(schema.customers.id, payload.customerId))
        .run();
    }

    tx.insert(schema.auditLog)
      .values({
        userId: user?.id ?? null,
        action: "old_gold_buy",
        entity: "old_gold_purchase",
        entityId: String(p.id),
        detail: `${voucherNo} value=${totalValue} paid=${paid}`,
      })
      .run();

    return p.id;
  });

  revalidatePath("/buy-gold");
  return { ok: true as const, id, voucherNo };
}

/**
 * Delete / reverse an old-gold purchase (bought by mistake, or the customer
 * takes their metal back). Reverses any balance still owed to the customer and
 * removes any in-stock inventory pieces that were created from this voucher.
 * Blocks if such a piece has already been sold. Owner/manager only.
 */
export async function deleteOldGoldPurchase(purchaseId: number) {
  const user = await getCurrentUser();
  if (user?.role !== "owner" && user?.role !== "manager") {
    return { ok: false as const, error: "Only owner or manager can delete a purchase" };
  }
  const purchase = db
    .select()
    .from(schema.oldGoldPurchases)
    .where(eq(schema.oldGoldPurchases.id, purchaseId))
    .get();
  if (!purchase) return { ok: false as const, error: "Purchase not found" };

  const items = db
    .select()
    .from(schema.oldGoldPurchaseItems)
    .where(eq(schema.oldGoldPurchaseItems.purchaseId, purchaseId))
    .all();

  // A voided voucher already had its pieces removed + balance reversed.
  const alreadyReversed = purchase.status === "void";

  if (!alreadyReversed) {
    // If a piece from this voucher was added to stock and already sold, stop.
    for (const it of items) {
      if (it.inventoryItemId) {
        const inv = db
          .select({ status: schema.inventoryItems.status })
          .from(schema.inventoryItems)
          .where(eq(schema.inventoryItems.id, it.inventoryItemId))
          .get();
        if (inv && inv.status !== "in_stock") {
          return { ok: false as const, error: "A piece from this voucher is already in stock and sold — cannot delete." };
        }
      }
    }
  }

  db.transaction((tx) => {
    if (!alreadyReversed) {
      // Remove inventory pieces created from this voucher (only if unsold & unused).
      for (const it of items) {
        if (it.inventoryItemId) {
          const used = tx
            .select({ c: sql<number>`count(*)` })
            .from(schema.saleItems)
            .where(eq(schema.saleItems.itemId, it.inventoryItemId))
            .get();
          if ((used?.c ?? 0) === 0) {
            tx.delete(schema.inventoryItems).where(eq(schema.inventoryItems.id, it.inventoryItemId)).run();
          }
        }
      }
      // Reverse the balance the shop still owed the customer for this purchase.
      const owed = round2(purchase.totalValue - purchase.paid);
      if (purchase.customerId && owed > 0) {
        tx.update(schema.customers)
          .set({ balance: sql`${schema.customers.balance} + ${owed}` })
          .where(eq(schema.customers.id, purchase.customerId))
          .run();
      }
    }
    // Cascade-deletes the purchase items.
    tx.delete(schema.oldGoldPurchases).where(eq(schema.oldGoldPurchases.id, purchaseId)).run();
    tx.insert(schema.auditLog)
      .values({
        userId: user?.id ?? null,
        action: "old_gold_delete",
        entity: "old_gold_purchase",
        entityId: String(purchaseId),
        detail: `${purchase.voucherNo} value=${purchase.totalValue} reversed`,
      })
      .run();
  });

  revalidatePath("/buy-gold");
  revalidatePath("/inventory");
  revalidatePath("/");
  return { ok: true as const };
}

/**
 * Void an old-gold purchase: keep the voucher (status = "void") but reverse its
 * effects — remove any in-stock pieces created from it and reverse the balance
 * still owed to the customer. Voided vouchers are hidden from the purchases list,
 * day-close and the weight ledgers but remain for history/audit.
 */
export async function voidOldGoldPurchase(purchaseId: number) {
  const user = await getCurrentUser();
  if (user?.role !== "owner" && user?.role !== "manager") {
    return { ok: false as const, error: "Only owner or manager can void a purchase" };
  }
  const purchase = db
    .select()
    .from(schema.oldGoldPurchases)
    .where(eq(schema.oldGoldPurchases.id, purchaseId))
    .get();
  if (!purchase) return { ok: false as const, error: "Purchase not found" };
  if (purchase.status === "void") return { ok: false as const, error: "Already void" };

  const items = db
    .select()
    .from(schema.oldGoldPurchaseItems)
    .where(eq(schema.oldGoldPurchaseItems.purchaseId, purchaseId))
    .all();

  for (const it of items) {
    if (it.inventoryItemId) {
      const inv = db
        .select({ status: schema.inventoryItems.status })
        .from(schema.inventoryItems)
        .where(eq(schema.inventoryItems.id, it.inventoryItemId))
        .get();
      if (inv && inv.status !== "in_stock") {
        return { ok: false as const, error: "A piece from this voucher is already in stock and sold — cannot void." };
      }
    }
  }

  db.transaction((tx) => {
    for (const it of items) {
      if (it.inventoryItemId) {
        const used = tx
          .select({ c: sql<number>`count(*)` })
          .from(schema.saleItems)
          .where(eq(schema.saleItems.itemId, it.inventoryItemId))
          .get();
        if ((used?.c ?? 0) === 0) {
          tx.delete(schema.inventoryItems).where(eq(schema.inventoryItems.id, it.inventoryItemId)).run();
        }
        // Clear the link since that stock piece no longer exists.
        tx.update(schema.oldGoldPurchaseItems)
          .set({ inventoryItemId: null })
          .where(eq(schema.oldGoldPurchaseItems.id, it.id))
          .run();
      }
    }
    const owed = round2(purchase.totalValue - purchase.paid);
    if (purchase.customerId && owed > 0) {
      tx.update(schema.customers)
        .set({ balance: sql`${schema.customers.balance} + ${owed}` })
        .where(eq(schema.customers.id, purchase.customerId))
        .run();
    }
    tx.update(schema.oldGoldPurchases).set({ status: "void" }).where(eq(schema.oldGoldPurchases.id, purchaseId)).run();
    tx.insert(schema.auditLog)
      .values({
        userId: user?.id ?? null,
        action: "old_gold_void",
        entity: "old_gold_purchase",
        entityId: String(purchaseId),
        detail: `${purchase.voucherNo} voided (balance reversed)`,
      })
      .run();
  });

  revalidatePath("/buy-gold");
  revalidatePath("/inventory");
  revalidatePath("/");
  revalidatePath(`/buy-gold/${purchaseId}`);
  return { ok: true as const };
}
