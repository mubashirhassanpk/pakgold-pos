/** Server-only queries for the Supplier ledger (payables). */
import "server-only";
import { db, schema } from "./db";
import { desc, eq, sql } from "drizzle-orm";
export { SUPPLIER_ADD_KINDS, SUPPLIER_SUB_KINDS, SUPPLIER_KINDS } from "./constants";

// + for purchase/opening, − for payment/return → balance payable to supplier.
const balanceExpr = sql<number>`coalesce(sum(
  case when ${schema.supplierLedger.kind} in ('purchase','opening')
       then ${schema.supplierLedger.amount}
       else -${schema.supplierLedger.amount} end
), 0)`;

export function listSuppliers() {
  const people = db
    .select({
      id: schema.suppliers.id,
      name: schema.suppliers.name,
      phone: schema.suppliers.phone,
      active: schema.suppliers.active,
    })
    .from(schema.suppliers)
    .orderBy(desc(schema.suppliers.active), schema.suppliers.name)
    .all();

  const balances = db
    .select({ supplierId: schema.supplierLedger.supplierId, balance: balanceExpr })
    .from(schema.supplierLedger)
    .groupBy(schema.supplierLedger.supplierId)
    .all();
  const byId = new Map(balances.map((b) => [b.supplierId, b.balance]));
  return people.map((p) => ({ ...p, balance: byId.get(p.id) ?? 0 }));
}

export function getSupplier(id: number) {
  return db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id)).get() ?? null;
}

export function getSupplierLedger(id: number) {
  return db
    .select()
    .from(schema.supplierLedger)
    .where(eq(schema.supplierLedger.supplierId, id))
    .orderBy(desc(schema.supplierLedger.entryDate))
    .all();
}

export function getSupplierBalance(id: number): number {
  return (
    db.select({ b: balanceExpr }).from(schema.supplierLedger).where(eq(schema.supplierLedger.supplierId, id)).get()?.b ?? 0
  );
}
