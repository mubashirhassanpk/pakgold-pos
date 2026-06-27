"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { getCurrentUser } from "./auth";
import type { HeldBillPayload, HeldBillSummary } from "./posTypes";

export async function holdBill(label: string, payload: HeldBillPayload) {
  const user = await getCurrentUser();
  const row = db
    .insert(schema.heldBills)
    .values({
      label: label.trim() || "Untitled",
      payload: JSON.stringify(payload),
      userId: user?.id ?? null,
    })
    .returning({ id: schema.heldBills.id, label: schema.heldBills.label, createdAt: schema.heldBills.createdAt })
    .get();
  return { ok: true as const, bill: row as HeldBillSummary };
}

/** Recall returns the parked cart and removes the held row. */
export async function recallBill(id: number) {
  const row = db.select().from(schema.heldBills).where(eq(schema.heldBills.id, id)).get();
  if (!row) return { ok: false as const, error: "Held bill not found" };
  db.delete(schema.heldBills).where(eq(schema.heldBills.id, id)).run();
  return { ok: true as const, payload: JSON.parse(row.payload) as HeldBillPayload };
}

export async function deleteHeldBill(id: number) {
  db.delete(schema.heldBills).where(eq(schema.heldBills.id, id)).run();
  return { ok: true as const };
}
