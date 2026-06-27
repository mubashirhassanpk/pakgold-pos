"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "./db";
import { getCurrentUser, can } from "./auth";
import { round2 } from "./calculations";

async function requireAccess() {
  const user = await getCurrentUser();
  if (!can(user?.role, "expenses")) throw new Error("Not authorized");
  return user!;
}

export interface ExpenseInput {
  category: string;
  amount: number;
  note?: string;
  method: string;
  expenseDate?: string; // YYYY-MM-DD
}

export async function addExpense(input: ExpenseInput) {
  const user = await requireAccess();
  if (!(input.amount > 0)) return { ok: false as const, error: "Amount must be positive" };
  db.insert(schema.expenses)
    .values({
      category: input.category.trim() || "misc",
      amount: round2(input.amount),
      note: input.note?.trim() || null,
      method: input.method,
      expenseDate: input.expenseDate ? new Date(input.expenseDate).getTime() : Date.now(),
      userId: user.id,
    })
    .run();
  db.insert(schema.auditLog)
    .values({ userId: user.id, action: "expense_add", entity: "expense", detail: `${input.category} ${input.amount}` })
    .run();
  revalidatePath("/expenses");
  revalidatePath("/day-close");
  return { ok: true as const };
}

export async function deleteExpense(id: number) {
  await requireAccess();
  db.delete(schema.expenses).where(eq(schema.expenses.id, id)).run();
  revalidatePath("/expenses");
  revalidatePath("/day-close");
  return { ok: true as const };
}
