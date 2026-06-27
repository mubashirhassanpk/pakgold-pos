/** Server-only customer queries (CRM). */
import "server-only";
import { db, schema } from "./db";
import { desc, eq, like, or, sql } from "drizzle-orm";

export function listCustomers(search?: string) {
  const base = db
    .select({
      id: schema.customers.id,
      name: schema.customers.name,
      phone: schema.customers.phone,
      cnic: schema.customers.cnic,
      balance: schema.customers.balance,
      createdAt: schema.customers.createdAt,
      saleCount: sql<number>`(select count(*) from ${schema.sales} where ${schema.sales.customerId} = ${schema.customers.id})`,
    })
    .from(schema.customers);

  const q = search?.trim();
  const rows = q
    ? base
        .where(
          or(
            like(schema.customers.name, `%${q}%`),
            like(schema.customers.phone, `%${q}%`),
            like(schema.customers.cnic, `%${q}%`)
          )
        )
        .orderBy(desc(schema.customers.createdAt))
        .all()
    : base.orderBy(desc(schema.customers.createdAt)).all();
  return rows;
}

/** Lightweight list for the POS picker. */
export function customersForPicker() {
  return db
    .select({
      id: schema.customers.id,
      name: schema.customers.name,
      phone: schema.customers.phone,
      balance: schema.customers.balance,
    })
    .from(schema.customers)
    .orderBy(desc(schema.customers.createdAt))
    .all();
}

export function getCustomer(id: number) {
  return db.select().from(schema.customers).where(eq(schema.customers.id, id)).get() ?? null;
}

export function getCustomerSales(id: number) {
  return db
    .select({
      id: schema.sales.id,
      invoiceNo: schema.sales.invoiceNo,
      grandTotal: schema.sales.grandTotal,
      paidTotal: schema.sales.paidTotal,
      oldGoldTotal: schema.sales.oldGoldTotal,
      createdAt: schema.sales.createdAt,
    })
    .from(schema.sales)
    .where(eq(schema.sales.customerId, id))
    .orderBy(desc(schema.sales.createdAt))
    .all();
}

/**
 * Udhaar settlements recorded against a customer. Standalone balance payments
 * aren't linked to a sale row, so the audit log (which stores entityId =
 * customer id) is the source of truth for "when paid and how much".
 */
export function getCustomerPayments(id: number) {
  const rows = db
    .select({
      id: schema.auditLog.id,
      detail: schema.auditLog.detail,
      createdAt: schema.auditLog.createdAt,
    })
    .from(schema.auditLog)
    .where(
      sql`${schema.auditLog.action} = 'customer_payment' and ${schema.auditLog.entity} = 'customer' and ${schema.auditLog.entityId} = ${String(id)}`
    )
    .orderBy(desc(schema.auditLog.createdAt))
    .all();
  // detail format: "received <amount> via <method>"
  return rows.map((r) => {
    const m = r.detail?.match(/received\s+([\d.]+)\s+via\s+(\w+)/i);
    return {
      id: r.id,
      createdAt: r.createdAt,
      amount: m ? Number(m[1]) : 0,
      method: m ? m[2] : "—",
    };
  });
}

export function getCustomerStats(id: number) {
  const row = db
    .select({
      count: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(${schema.sales.grandTotal}),0)`,
    })
    .from(schema.sales)
    .where(eq(schema.sales.customerId, id))
    .get();
  return { count: row?.count ?? 0, total: row?.total ?? 0 };
}
