"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "./db";
import { getCurrentUser } from "./auth";
import { round2 } from "./calculations";

export interface CustomerInput {
  name: string;
  phone?: string;
  cnic?: string;
  address?: string;
  notes?: string;
}

export async function createCustomer(input: CustomerInput) {
  if (!input.name.trim()) return { ok: false as const, error: "Name is required" };
  const row = db
    .insert(schema.customers)
    .values({
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      cnic: input.cnic?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .returning({
      id: schema.customers.id,
      name: schema.customers.name,
      phone: schema.customers.phone,
      balance: schema.customers.balance,
    })
    .get();
  revalidatePath("/customers");
  return { ok: true as const, customer: row };
}

export async function updateCustomer(id: number, input: CustomerInput) {
  db.update(schema.customers)
    .set({
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      cnic: input.cnic?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .where(eq(schema.customers.id, id))
    .run();
  revalidatePath(`/customers/${id}`);
  revalidatePath("/customers");
  return { ok: true as const };
}

/**
 * Record a payment received against a customer's outstanding balance (udhaar
 * settlement). Decrements balance and logs a standalone payment row.
 */
export async function recordCustomerPayment(id: number, amount: number, method: string) {
  if (amount <= 0) return { ok: false as const, error: "Amount must be positive" };
  const user = await getCurrentUser();
  db.transaction((tx) => {
    tx.update(schema.customers)
      .set({ balance: sql`${schema.customers.balance} - ${round2(amount)}` })
      .where(eq(schema.customers.id, id))
      .run();
    tx.insert(schema.payments)
      .values({ saleId: null, method, amount: round2(amount), reference: "balance settlement" })
      .run();
    tx.insert(schema.auditLog)
      .values({
        userId: user?.id ?? null,
        action: "customer_payment",
        entity: "customer",
        entityId: String(id),
        detail: `received ${amount} via ${method}`,
      })
      .run();
  });
  revalidatePath(`/customers/${id}`);
  revalidatePath("/customers");
  return { ok: true as const };
}
