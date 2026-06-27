"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "./db";
import { getCurrentUser, can } from "./auth";
import type { TaxBasis } from "./constants";

async function requireSettings() {
  const user = await getCurrentUser();
  if (!can(user?.role, "settings")) throw new Error("Not authorized");
  return user!;
}

// --- Shop profile ------------------------------------------------------------
export async function saveSettings(values: Record<string, string>) {
  await requireSettings();
  for (const [key, value] of Object.entries(values)) {
    db.insert(schema.settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
      .run();
  }
  revalidatePath("/settings");
  revalidatePath("/pos");
  return { ok: true as const };
}

// --- Tax rules ---------------------------------------------------------------
export interface TaxRuleInput {
  name: string;
  basis: TaxBasis;
  ratePct?: number | null;
  fixedAmount?: number | null;
}

export async function saveTaxRule(id: number | null, input: TaxRuleInput) {
  await requireSettings();
  if (!input.name.trim()) return { ok: false as const, error: "Name is required" };
  const values = {
    name: input.name.trim(),
    basis: input.basis,
    ratePct: input.basis === "fixed" ? null : input.ratePct ?? 0,
    fixedAmount: input.basis === "fixed" ? input.fixedAmount ?? 0 : null,
  };
  if (id) {
    db.update(schema.taxRules).set(values).where(eq(schema.taxRules.id, id)).run();
  } else {
    db.insert(schema.taxRules).values({ ...values, active: false }).run();
  }
  revalidatePath("/settings");
  return { ok: true as const };
}

/** Make exactly one rule active (or none if id is null). */
export async function setActiveTaxRule(id: number | null) {
  const user = await requireSettings();
  db.transaction((tx) => {
    tx.update(schema.taxRules).set({ active: false }).run();
    if (id) tx.update(schema.taxRules).set({ active: true }).where(eq(schema.taxRules.id, id)).run();
    tx.insert(schema.auditLog)
      .values({
        userId: user.id,
        action: "tax_rule_activate",
        entity: "tax_rule",
        entityId: id ? String(id) : "none",
      })
      .run();
  });
  revalidatePath("/settings");
  revalidatePath("/pos");
  return { ok: true as const };
}

export async function deleteTaxRule(id: number) {
  await requireSettings();
  db.delete(schema.taxRules).where(eq(schema.taxRules.id, id)).run();
  revalidatePath("/settings");
  return { ok: true as const };
}
