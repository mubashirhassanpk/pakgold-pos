/** Server-only queries for the Karigar (craftsmen / staff) module. */
import "server-only";
import { db, schema } from "./db";
import { desc, eq, sql } from "drizzle-orm";
export { EARNING_KINDS, PAYMENT_KINDS, ALL_KINDS } from "./constants";

// SQL fragment: + for earnings, − for payments  → balance payable to karigar.
const balanceExpr = sql<number>`coalesce(sum(
  case when ${schema.karigarLedger.kind} in ('salary','dehari','commission','bonus')
       then ${schema.karigarLedger.amount}
       else -${schema.karigarLedger.amount} end
), 0)`;

export function listKarigars() {
  const people = db
    .select({
      id: schema.karigars.id,
      name: schema.karigars.name,
      phone: schema.karigars.phone,
      role: schema.karigars.role,
      wageType: schema.karigars.wageType,
      active: schema.karigars.active,
    })
    .from(schema.karigars)
    .orderBy(desc(schema.karigars.active), schema.karigars.name)
    .all();

  // Balances computed in one grouped pass, then merged (avoids correlated-subquery pitfalls).
  const balances = db
    .select({ karigarId: schema.karigarLedger.karigarId, balance: balanceExpr })
    .from(schema.karigarLedger)
    .groupBy(schema.karigarLedger.karigarId)
    .all();
  const byId = new Map(balances.map((b) => [b.karigarId, b.balance]));

  return people.map((p) => ({ ...p, balance: byId.get(p.id) ?? 0 }));
}

export function getKarigar(id: number) {
  return db.select().from(schema.karigars).where(eq(schema.karigars.id, id)).get() ?? null;
}

export function getKarigarLedger(id: number) {
  return db
    .select()
    .from(schema.karigarLedger)
    .where(eq(schema.karigarLedger.karigarId, id))
    .orderBy(desc(schema.karigarLedger.entryDate))
    .all();
}

export function getKarigarBalance(id: number): number {
  const row = db
    .select({ b: balanceExpr })
    .from(schema.karigarLedger)
    .where(eq(schema.karigarLedger.karigarId, id))
    .get();
  return row?.b ?? 0;
}

/** Simple list for assigning a karigar to a repair job. */
export function karigarsForPicker() {
  return db
    .select({ id: schema.karigars.id, name: schema.karigars.name })
    .from(schema.karigars)
    .where(eq(schema.karigars.active, true))
    .orderBy(schema.karigars.name)
    .all();
}
