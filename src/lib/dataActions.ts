"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "./db";
import { getCurrentUser } from "./auth";
import { createBackup } from "./backup";

/**
 * Reset the shop's business data after taking a safety backup. Keeps
 * configuration (users, settings, tax rules, gold rates, categories) so the
 * shop can start fresh (e.g. new financial year) without reconfiguring.
 * Owner only. The UI requires typing CONFIRM before calling this.
 */
export async function resetDatabase(confirm: string) {
  const user = await getCurrentUser();
  if (user?.role !== "owner") return { ok: false as const, error: "Only the owner can reset data" };
  if (confirm !== "RESET") return { ok: false as const, error: "Type RESET to confirm" };

  // 1. Mandatory safety backup first.
  let backup: string;
  try {
    backup = await createBackup();
  } catch (e) {
    return { ok: false as const, error: `Backup failed, reset aborted: ${e instanceof Error ? e.message : e}` };
  }

  // 2. Wipe business data. Order matters: every table that holds a foreign key
  //    must be cleared before the table it points at, otherwise SQLite (with
  //    foreign_keys = ON) aborts the whole transaction and the reset fails.
  //    Master/config data — users, settings, rates, tax rules, categories,
  //    karigars and suppliers — is intentionally preserved.
  db.transaction((tx) => {
    // Committee scheme records (reference committees, members, sales, customers)
    tx.delete(schema.committeePayouts).run();
    tx.delete(schema.committeeInstallments).run();
    tx.delete(schema.committeeMembers).run();
    tx.delete(schema.committees).run();
    // Sale children
    tx.delete(schema.payments).run();
    tx.delete(schema.saleItems).run();
    tx.delete(schema.oldGoldItems).run();
    // Buy-old-gold vouchers
    tx.delete(schema.oldGoldPurchaseItems).run();
    tx.delete(schema.oldGoldPurchases).run();
    // Orders / jobs that reference sales + customers
    tx.delete(schema.bookings).run();
    tx.delete(schema.repairJobs).run();
    // Ledgers & misc transactional data
    tx.delete(schema.karigarLedger).run();
    tx.delete(schema.supplierLedger).run();
    tx.delete(schema.expenses).run();
    tx.delete(schema.itemStones).run();
    tx.delete(schema.heldBills).run();
    // Core records
    tx.delete(schema.sales).run();
    tx.delete(schema.inventoryItems).run();
    tx.delete(schema.customers).run();
    tx.delete(schema.auditLog).run();
    tx.insert(schema.auditLog)
      .values({
        userId: user.id,
        action: "data_reset",
        entity: "database",
        detail: `business data cleared; safety backup: ${backup}`,
      })
      .run();
  });

  revalidatePath("/");
  return { ok: true as const, backup };
}
