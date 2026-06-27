"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "./db";
import { getCurrentUser, can } from "./auth";
import { round2 } from "./calculations";
import { SUPPLIER_KINDS } from "./constants";

async function requireAccess() {
  const user = await getCurrentUser();
  if (!can(user?.role, "suppliers")) throw new Error("Not authorized");
  return user!;
}

export interface SupplierInput {
  name: string;
  phone?: string;
  cnic?: string;
  notes?: string;
}

export async function createSupplier(input: SupplierInput) {
  await requireAccess();
  if (!input.name.trim()) return { ok: false as const, error: "Name is required" };
  db.insert(schema.suppliers)
    .values({
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      cnic: input.cnic?.trim() || null,
      notes: input.notes?.trim() || null,
      active: true,
    })
    .run();
  revalidatePath("/suppliers");
  return { ok: true as const };
}

export async function setSupplierActive(id: number, active: boolean) {
  await requireAccess();
  db.update(schema.suppliers).set({ active }).where(eq(schema.suppliers.id, id)).run();
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  return { ok: true as const };
}

export interface SupplierEntryInput {
  kind: string; // purchase|opening|payment|return
  amount: number;
  note?: string;
  entryDate?: string;
}

export async function addSupplierEntry(supplierId: number, input: SupplierEntryInput) {
  const user = await requireAccess();
  if (!SUPPLIER_KINDS.includes(input.kind as (typeof SUPPLIER_KINDS)[number]))
    return { ok: false as const, error: "Invalid entry type" };
  if (!(input.amount > 0)) return { ok: false as const, error: "Amount must be positive" };
  db.insert(schema.supplierLedger)
    .values({
      supplierId,
      kind: input.kind,
      amount: round2(input.amount),
      note: input.note?.trim() || null,
      entryDate: input.entryDate ? new Date(input.entryDate).getTime() : Date.now(),
      userId: user.id,
    })
    .run();
  db.insert(schema.auditLog)
    .values({ userId: user.id, action: "supplier_" + input.kind, entity: "supplier", entityId: String(supplierId), detail: String(input.amount) })
    .run();
  revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath("/suppliers");
  return { ok: true as const };
}

export async function deleteSupplierEntry(id: number, supplierId: number) {
  await requireAccess();
  db.delete(schema.supplierLedger).where(eq(schema.supplierLedger.id, id)).run();
  revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath("/suppliers");
  return { ok: true as const };
}
