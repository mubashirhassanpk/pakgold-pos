"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "./db";
import { getCurrentUser } from "./auth";
import { nextBarcodeNumber } from "./queries";
import type { MakingType, WastageType } from "./constants";

export interface StoneInput {
  stoneType: string;
  shape?: string;
  count: number;
  caratWeight: number;
  colorGrade?: string;
  clarityGrade?: string;
  certLab?: string;
  certNo?: string;
  ratePerCarat?: number;
  value: number;
  notes?: string;
}

/** Stock mutations are limited to owner/manager. */
async function requireStockManager() {
  const user = await getCurrentUser();
  if (user?.role !== "owner" && user?.role !== "manager") {
    throw new Error("Only owner/manager can manage stock");
  }
  return user;
}

export interface ItemInput {
  barcode?: string;
  nameEn: string;
  nameUr?: string;
  categoryId?: number | null;
  metal?: "gold" | "silver";
  karat: number;
  silverPurity?: number | null;
  grossWeight: number;
  netWeight: number;
  makingType: MakingType;
  makingValue: number;
  wastageType: WastageType;
  wastageValue: number;
  stonesValue?: number;
  otherCharges?: number;
  hallmark?: string;
  hallmarkLab?: string;
  certNo?: string;
  certDate?: string;
  costPrice?: number;
  supplier?: string;
  quantity?: number;
  stones?: StoneInput[];
}

function normalize(input: ItemInput) {
  return {
    nameEn: input.nameEn.trim(),
    nameUr: input.nameUr?.trim() || null,
    categoryId: input.categoryId ?? null,
    metal: input.metal ?? "gold",
    karat: input.karat,
    silverPurity: input.metal === "silver" ? input.silverPurity ?? 999 : null,
    grossWeight: input.grossWeight,
    netWeight: input.netWeight,
    makingType: input.makingType,
    makingValue: input.makingValue,
    wastageType: input.wastageType,
    wastageValue: input.wastageValue,
    stonesValue: input.stonesValue ?? 0,
    otherCharges: input.otherCharges ?? 0,
    hallmark: input.hallmark?.trim() || null,
    hallmarkLab: input.hallmarkLab?.trim() || null,
    certNo: input.certNo?.trim() || null,
    certDate: input.certDate?.trim() || null,
    costPrice: input.costPrice ?? 0,
    supplier: input.supplier?.trim() || null,
    quantity: input.quantity && input.quantity > 0 ? input.quantity : 1,
  };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Normalise and persist the stone rows for an item (replace-all semantics). */
function saveStonesFor(tx: Tx, itemId: number, stones?: StoneInput[]) {
  tx.delete(schema.itemStones).where(eq(schema.itemStones.itemId, itemId)).run();
  const rows = (stones ?? []).filter((s) => (s.count ?? 0) > 0 || (s.caratWeight ?? 0) > 0 || (s.value ?? 0) > 0);
  if (rows.length === 0) return;
  tx.insert(schema.itemStones)
    .values(
      rows.map((s) => ({
        itemId,
        stoneType: s.stoneType || "diamond",
        shape: s.shape?.trim() || null,
        count: s.count > 0 ? s.count : 1,
        caratWeight: s.caratWeight ?? 0,
        colorGrade: s.colorGrade?.trim() || null,
        clarityGrade: s.clarityGrade?.trim() || null,
        certLab: s.certLab?.trim() || null,
        certNo: s.certNo?.trim() || null,
        ratePerCarat: s.ratePerCarat ?? 0,
        value: s.value ?? 0,
        notes: s.notes?.trim() || null,
      }))
    )
    .run();
}

export async function createItem(input: ItemInput) {
  const user = await requireStockManager();
  if (!input.nameEn.trim()) return { ok: false as const, error: "Name is required" };
  const barcode = input.barcode?.trim() || nextBarcodeNumber();
  const id = db.transaction((tx) => {
    const row = tx
      .insert(schema.inventoryItems)
      .values({ ...normalize(input), barcode, status: "in_stock" })
      .returning({ id: schema.inventoryItems.id })
      .get();
    saveStonesFor(tx, row.id, input.stones);
    tx.insert(schema.auditLog)
      .values({ userId: user.id, action: "item_create", entity: "item", entityId: String(row.id), detail: barcode })
      .run();
    return row.id;
  });
  revalidatePath("/inventory");
  return { ok: true as const, id, barcode };
}

export async function updateItem(id: number, input: ItemInput) {
  const user = await requireStockManager();
  db.transaction((tx) => {
    tx.update(schema.inventoryItems).set(normalize(input)).where(eq(schema.inventoryItems.id, id)).run();
    saveStonesFor(tx, id, input.stones);
    tx.insert(schema.auditLog)
      .values({ userId: user.id, action: "item_update", entity: "item", entityId: String(id) })
      .run();
  });
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  return { ok: true as const };
}

export async function deleteItem(id: number) {
  const user = await requireStockManager();
  const used = db
    .select({ c: sql<number>`count(*)` })
    .from(schema.saleItems)
    .where(eq(schema.saleItems.itemId, id))
    .get();
  if ((used?.c ?? 0) > 0) {
    return { ok: false as const, error: "Item appears on past sales and cannot be deleted." };
  }
  db.transaction((tx) => {
    // itemStones cascade-delete via FK; remove the piece itself here.
    tx.delete(schema.inventoryItems).where(eq(schema.inventoryItems.id, id)).run();
    tx.insert(schema.auditLog)
      .values({ userId: user.id, action: "item_delete", entity: "item", entityId: String(id) })
      .run();
  });
  revalidatePath("/inventory");
  return { ok: true as const };
}

/**
 * Optionally turn a purchased old-gold/silver item into a sellable inventory
 * piece (one piece per item). Cost price = what we paid; the link is recorded
 * on the purchase item so it can't be added twice.
 */
export async function addOldGoldItemToInventory(purchaseItemId: number) {
  const user = await requireStockManager();
  const item = db
    .select()
    .from(schema.oldGoldPurchaseItems)
    .where(eq(schema.oldGoldPurchaseItems.id, purchaseItemId))
    .get();
  if (!item) return { ok: false as const, error: "Purchased item not found" };
  if (item.inventoryItemId) return { ok: false as const, error: "Already added to inventory" };

  const purchase = db
    .select({ voucherNo: schema.oldGoldPurchases.voucherNo, customerName: schema.oldGoldPurchases.customerName })
    .from(schema.oldGoldPurchases)
    .where(eq(schema.oldGoldPurchases.id, item.purchaseId))
    .get();

  const isSilver = (item.metal ?? "gold") === "silver";
  const name =
    item.notes?.trim() || (isSilver ? `Old ${item.silverPurity ?? 999} Silver` : `Old ${item.karat}K Gold`);
  const barcode = nextBarcodeNumber();

  const newId = db.transaction((tx) => {
    const row = tx
      .insert(schema.inventoryItems)
      .values({
        barcode,
        nameEn: name,
        metal: isSilver ? "silver" : "gold",
        karat: item.karat,
        silverPurity: isSilver ? item.silverPurity ?? 999 : null,
        grossWeight: item.weightGrams,
        netWeight: item.weightGrams,
        makingType: "per_gram",
        makingValue: 0,
        wastageType: "charge_pct",
        wastageValue: 0,
        stonesValue: 0,
        otherCharges: 0,
        costPrice: item.value,
        supplier: purchase?.customerName ? `Old gold — ${purchase.customerName}` : `Old gold ${purchase?.voucherNo ?? ""}`,
        quantity: 1,
        status: "in_stock",
      })
      .returning({ id: schema.inventoryItems.id })
      .get();

    tx.update(schema.oldGoldPurchaseItems)
      .set({ inventoryItemId: row.id })
      .where(eq(schema.oldGoldPurchaseItems.id, purchaseItemId))
      .run();

    tx.insert(schema.auditLog)
      .values({
        userId: user.id,
        action: "old_gold_to_inventory",
        entity: "inventory_item",
        entityId: String(row.id),
        detail: `from purchase item ${purchaseItemId}; barcode ${barcode}; cost ${item.value}`,
      })
      .run();

    return row.id;
  });

  revalidatePath("/inventory");
  revalidatePath(`/buy-gold/${item.purchaseId}`);
  return { ok: true as const, id: newId, barcode };
}

export async function createCategory(nameEn: string, nameUr?: string) {
  await requireStockManager();
  if (!nameEn.trim()) return { ok: false as const, error: "Name required" };
  const row = db
    .insert(schema.categories)
    .values({ nameEn: nameEn.trim(), nameUr: nameUr?.trim() || null })
    .returning({ id: schema.categories.id, nameEn: schema.categories.nameEn })
    .get();
  revalidatePath("/inventory");
  return { ok: true as const, category: row };
}

// --- Supplier purchase: add several items in one transaction -----------------
export interface PurchaseLine extends ItemInput {}

export async function createPurchase(supplier: string, lines: PurchaseLine[]) {
  const user = await requireStockManager();
  if (lines.length === 0) return { ok: false as const, error: "Add at least one item" };

  const ids = db.transaction((tx) => {
    const created: number[] = [];
    for (const line of lines) {
      const barcode = line.barcode?.trim() || nextBarcodeNumber();
      const row = tx
        .insert(schema.inventoryItems)
        .values({
          ...normalize({ ...line, supplier }),
          barcode,
          status: "in_stock",
        })
        .returning({ id: schema.inventoryItems.id })
        .get();
      created.push(row.id);
    }
    const totalCost = lines.reduce((s, l) => s + (l.costPrice ?? 0) * (l.quantity ?? 1), 0);
    tx.insert(schema.auditLog)
      .values({
        userId: user.id,
        action: "purchase",
        entity: "supplier",
        entityId: supplier,
        detail: `${lines.length} item(s), cost=${totalCost}`,
      })
      .run();
    return created;
  });

  revalidatePath("/inventory");
  return { ok: true as const, count: ids.length };
}
