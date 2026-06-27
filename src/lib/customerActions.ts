"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "./db";
import { getCurrentUser, can } from "./auth";
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
 * Permanently delete a customer — but only when it is safe to do so. We refuse
 * if the customer carries any financial history (sales, repairs, bookings,
 * old-gold purchases, committee membership) or an unsettled balance, so historical
 * records are never orphaned. Such customers should be kept (or their balance
 * settled) rather than deleted.
 */
export async function deleteCustomer(id: number) {
  const user = await getCurrentUser();
  if (!can(user?.role, "customers")) return { ok: false as const, error: "Not authorized" };

  const customer = db
    .select({ balance: schema.customers.balance })
    .from(schema.customers)
    .where(eq(schema.customers.id, id))
    .get();
  if (!customer) return { ok: false as const, error: "Customer not found" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countWhere = (table: any, col: any): number =>
    db.select({ c: sql<number>`count(*)` }).from(table).where(eq(col, id)).get()?.c ?? 0;

  const linked: string[] = [];
  const sales = countWhere(schema.sales, schema.sales.customerId);
  if (sales > 0) linked.push(`${sales} sale(s)`);
  const repairs = countWhere(schema.repairJobs, schema.repairJobs.customerId);
  if (repairs > 0) linked.push(`${repairs} repair job(s)`);
  const bookings = countWhere(schema.bookings, schema.bookings.customerId);
  if (bookings > 0) linked.push(`${bookings} booking(s)`);
  const purchases = countWhere(schema.oldGoldPurchases, schema.oldGoldPurchases.customerId);
  if (purchases > 0) linked.push(`${purchases} old-gold purchase(s)`);
  const memberships = countWhere(schema.committeeMembers, schema.committeeMembers.customerId);
  if (memberships > 0) linked.push(`${memberships} committee membership(s)`);

  if (linked.length > 0) {
    return {
      ok: false as const,
      error: `Cannot delete — this customer has ${linked.join(", ")} on record. Their history must stay intact.`,
    };
  }
  if (Math.abs(customer.balance) >= 0.01) {
    return {
      ok: false as const,
      error: "Cannot delete — this customer has an outstanding balance. Settle it first.",
    };
  }

  db.transaction((tx) => {
    tx.delete(schema.customers).where(eq(schema.customers.id, id)).run();
    tx.insert(schema.auditLog)
      .values({ userId: user?.id ?? null, action: "customer_delete", entity: "customer", entityId: String(id) })
      .run();
  });
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
