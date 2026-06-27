"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "./db";
import { getCurrentUser, can } from "./auth";
import { nextCommitteeCode } from "./committees";
import { GRAMS_PER_TOLA } from "./constants";

async function requireCommittee() {
  const user = await getCurrentUser();
  if (!can(user?.role, "committees")) throw new Error("Not authorized");
  return user!;
}

export interface CommitteeInput {
  name: string;
  type: "gold" | "cash";
  totalMonths: number;
  monthlyAmount?: number;
  monthlyGrams?: number;
  startDate?: string;
  notes?: string;
}

export async function createCommittee(input: CommitteeInput) {
  const user = await requireCommittee();
  if (!input.name.trim()) return { ok: false as const, error: "Name is required" };
  const code = nextCommitteeCode();
  const row = db
    .insert(schema.committees)
    .values({
      code,
      name: input.name.trim(),
      type: input.type,
      totalMonths: input.totalMonths > 0 ? input.totalMonths : 11,
      monthlyAmount: input.monthlyAmount ?? 0,
      monthlyGrams: input.monthlyGrams ?? 0,
      startDate: input.startDate?.trim() || null,
      notes: input.notes?.trim() || null,
      userId: user.id,
    })
    .returning({ id: schema.committees.id })
    .get();
  db.insert(schema.auditLog)
    .values({ userId: user.id, action: "committee_create", entity: "committee", entityId: String(row.id), detail: code })
    .run();
  revalidatePath("/committees");
  return { ok: true as const, id: row.id };
}

export async function setCommitteeStatus(id: number, status: "active" | "completed" | "cancelled") {
  await requireCommittee();
  db.update(schema.committees).set({ status }).where(eq(schema.committees.id, id)).run();
  revalidatePath(`/committees/${id}`);
  revalidatePath("/committees");
  return { ok: true as const };
}

export async function addMember(input: {
  committeeId: number;
  name: string;
  phone?: string;
  customerId?: number | null;
  payoutMonth?: number | null;
  notes?: string;
}) {
  await requireCommittee();
  if (!input.name.trim()) return { ok: false as const, error: "Member name required" };
  db.insert(schema.committeeMembers)
    .values({
      committeeId: input.committeeId,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      customerId: input.customerId ?? null,
      payoutMonth: input.payoutMonth ?? null,
      notes: input.notes?.trim() || null,
    })
    .run();
  revalidatePath(`/committees/${input.committeeId}`);
  return { ok: true as const };
}

export async function removeMember(committeeId: number, memberId: number) {
  await requireCommittee();
  db.delete(schema.committeeMembers).where(eq(schema.committeeMembers.id, memberId)).run();
  revalidatePath(`/committees/${committeeId}`);
  return { ok: true as const };
}

/**
 * Record one member's instalment for a month. For gold committees the rupee
 * amount is converted to grams using the rate supplied (per tola), so the
 * member's saved gold weight grows correctly even as the rate changes.
 */
export async function recordInstallment(input: {
  committeeId: number;
  memberId: number;
  monthNo: number;
  amount: number;
  grams?: number;
  ratePerTola?: number;
  method?: string;
  note?: string;
}) {
  const user = await requireCommittee();
  const committee = db.select().from(schema.committees).where(eq(schema.committees.id, input.committeeId)).get();
  if (!committee) return { ok: false as const, error: "Committee not found" };

  let grams = input.grams ?? 0;
  if (committee.type === "gold" && !grams) {
    if (input.ratePerTola && input.ratePerTola > 0 && input.amount > 0) {
      grams = (input.amount / input.ratePerTola) * GRAMS_PER_TOLA;
    } else if (committee.monthlyGrams) {
      grams = committee.monthlyGrams;
    }
  }

  db.insert(schema.committeeInstallments)
    .values({
      committeeId: input.committeeId,
      memberId: input.memberId,
      monthNo: input.monthNo,
      amount: input.amount ?? 0,
      grams,
      ratePerTola: input.ratePerTola ?? 0,
      method: input.method ?? "cash",
      userId: user.id,
      note: input.note?.trim() || null,
    })
    .run();
  revalidatePath(`/committees/${input.committeeId}`);
  return { ok: true as const };
}

export async function deleteInstallment(committeeId: number, installmentId: number) {
  await requireCommittee();
  db.delete(schema.committeeInstallments).where(eq(schema.committeeInstallments.id, installmentId)).run();
  revalidatePath(`/committees/${committeeId}`);
  return { ok: true as const };
}

export async function recordPayout(input: {
  committeeId: number;
  memberId: number;
  monthNo: number;
  amount: number;
  grams?: number;
  method?: string;
  note?: string;
}) {
  const user = await requireCommittee();
  db.insert(schema.committeePayouts)
    .values({
      committeeId: input.committeeId,
      memberId: input.memberId,
      monthNo: input.monthNo,
      amount: input.amount ?? 0,
      grams: input.grams ?? 0,
      method: input.method ?? "cash",
      userId: user.id,
      note: input.note?.trim() || null,
    })
    .run();
  db.insert(schema.auditLog)
    .values({
      userId: user.id,
      action: "committee_payout",
      entity: "committee",
      entityId: String(input.committeeId),
      detail: `member ${input.memberId} • month ${input.monthNo}`,
    })
    .run();
  revalidatePath(`/committees/${input.committeeId}`);
  return { ok: true as const };
}
