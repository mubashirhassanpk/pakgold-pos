"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "./db";
import { getCurrentUser, can } from "./auth";
import { round2 } from "./calculations";
import { ALL_KINDS } from "./karigar";

async function requireAccess() {
  const user = await getCurrentUser();
  if (!can(user?.role, "karigars")) throw new Error("Not authorized");
  return user!;
}

export interface KarigarInput {
  name: string;
  phone?: string;
  cnic?: string;
  role: string;
  wageType: string;
  monthlySalary?: number;
  dehariRate?: number;
  commissionPct?: number;
  notes?: string;
}

function norm(i: KarigarInput) {
  return {
    name: i.name.trim(),
    phone: i.phone?.trim() || null,
    cnic: i.cnic?.trim() || null,
    role: i.role,
    wageType: i.wageType,
    monthlySalary: i.monthlySalary ?? 0,
    dehariRate: i.dehariRate ?? 0,
    commissionPct: i.commissionPct ?? 0,
    notes: i.notes?.trim() || null,
  };
}

export async function createKarigar(input: KarigarInput) {
  await requireAccess();
  if (!input.name.trim()) return { ok: false as const, error: "Name is required" };
  db.insert(schema.karigars).values({ ...norm(input), active: true }).run();
  revalidatePath("/karigars");
  return { ok: true as const };
}

export async function updateKarigar(id: number, input: KarigarInput) {
  await requireAccess();
  db.update(schema.karigars).set(norm(input)).where(eq(schema.karigars.id, id)).run();
  revalidatePath("/karigars");
  revalidatePath(`/karigars/${id}`);
  return { ok: true as const };
}

export async function setKarigarActive(id: number, active: boolean) {
  await requireAccess();
  db.update(schema.karigars).set({ active }).where(eq(schema.karigars.id, id)).run();
  revalidatePath("/karigars");
  revalidatePath(`/karigars/${id}`);
  return { ok: true as const };
}

export interface LedgerInput {
  kind: string; // salary|dehari|commission|bonus|payout|advance|deduction
  amount: number;
  note?: string;
  entryDate?: string; // YYYY-MM-DD
  refType?: string;
  refId?: string;
}

export async function addLedgerEntry(karigarId: number, input: LedgerInput) {
  const user = await requireAccess();
  if (!ALL_KINDS.includes(input.kind as (typeof ALL_KINDS)[number]))
    return { ok: false as const, error: "Invalid entry type" };
  if (!(input.amount > 0)) return { ok: false as const, error: "Amount must be positive" };
  db.insert(schema.karigarLedger)
    .values({
      karigarId,
      kind: input.kind,
      amount: round2(input.amount),
      note: input.note?.trim() || null,
      refType: input.refType ?? null,
      refId: input.refId ?? null,
      entryDate: input.entryDate ? new Date(input.entryDate).getTime() : Date.now(),
      userId: user.id,
    })
    .run();
  revalidatePath(`/karigars/${karigarId}`);
  revalidatePath("/karigars");
  return { ok: true as const };
}

export async function deleteLedgerEntry(id: number, karigarId: number) {
  await requireAccess();
  db.delete(schema.karigarLedger).where(eq(schema.karigarLedger.id, id)).run();
  revalidatePath(`/karigars/${karigarId}`);
  revalidatePath("/karigars");
  return { ok: true as const };
}
