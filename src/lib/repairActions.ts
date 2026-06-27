"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "./db";
import { getCurrentUser, can } from "./auth";
import { nextJobNo } from "./repairs";
import { createSale } from "./actions";
import { round2 } from "./calculations";

async function requireRepairAccess() {
  const user = await getCurrentUser();
  if (!can(user?.role, "repairs")) throw new Error("Not authorized");
  return user!;
}

export interface JobInput {
  customerId?: number | null;
  customerName: string;
  phone?: string;
  itemDescription: string;
  jobType: string;
  karat?: number | null;
  metalWeight?: number;
  estimatedCharge: number;
  advance?: number;
  expectedDate?: string;
  notes?: string;
  karigarId?: number | null;
}

export async function createJob(input: JobInput) {
  const user = await requireRepairAccess();
  if (!input.customerName.trim()) return { ok: false as const, error: "Customer name required" };
  if (!input.itemDescription.trim()) return { ok: false as const, error: "Item description required" };
  const jobNo = nextJobNo();
  const row = db
    .insert(schema.repairJobs)
    .values({
      jobNo,
      customerId: input.customerId ?? null,
      customerName: input.customerName.trim(),
      phone: input.phone?.trim() || null,
      itemDescription: input.itemDescription.trim(),
      jobType: input.jobType,
      karat: input.karat ?? null,
      metalWeight: input.metalWeight ?? 0,
      estimatedCharge: round2(input.estimatedCharge ?? 0),
      advance: round2(input.advance ?? 0),
      expectedDate: input.expectedDate?.trim() || null,
      notes: input.notes?.trim() || null,
      karigarId: input.karigarId ?? null,
      status: "received",
      userId: user.id,
    })
    .returning({ id: schema.repairJobs.id })
    .get();
  db.insert(schema.auditLog)
    .values({ userId: user.id, action: "job_create", entity: "repair_job", entityId: String(row.id), detail: jobNo })
    .run();
  revalidatePath("/repairs");
  return { ok: true as const, id: row.id, jobNo };
}

export async function setJobStatus(id: number, status: string) {
  const user = await requireRepairAccess();
  db.update(schema.repairJobs)
    .set({ status, ...(status === "delivered" ? { deliveredAt: Date.now() } : {}) })
    .where(eq(schema.repairJobs.id, id))
    .run();
  db.insert(schema.auditLog)
    .values({ userId: user.id, action: "job_status", entity: "repair_job", entityId: String(id), detail: status })
    .run();
  revalidatePath("/repairs");
  revalidatePath(`/repairs/${id}`);
  return { ok: true as const };
}

/**
 * Deliver a job and bill the repair charge as a sale. The full estimated charge
 * is recorded as the invoice total (advance + balance), paid via `method`.
 */
export async function deliverAndBill(id: number, method: string) {
  await requireRepairAccess();
  const job = db.select().from(schema.repairJobs).where(eq(schema.repairJobs.id, id)).get();
  if (!job) return { ok: false as const, error: "Job not found" };
  if (job.saleId) return { ok: false as const, error: "Job already billed" };

  const charge = round2(job.estimatedCharge);
  const sale = await createSale({
    customerId: job.customerId ?? null,
    lines: [
      {
        itemId: null,
        type: "custom",
        description: `Repair: ${job.itemDescription} (${job.jobNo})`,
        metal: "gold",
        karat: job.karat ?? 0,
        weightGrams: 0,
        ratePerTola: 0,
        goldValue: 0,
        making: 0,
        wastage: 0,
        other: charge,
        quantity: 1,
        lineTotal: charge,
      },
    ],
    oldGold: [],
    payments: charge > 0 ? [{ method, amount: charge }] : [],
    totals: {
      goldValueTotal: 0,
      makingTotal: 0,
      wastageTotal: 0,
      otherTotal: charge,
      subtotal: charge,
      tax: 0,
      discount: 0,
      oldGoldTotal: 0,
      grandTotal: charge,
    },
  });

  db.update(schema.repairJobs)
    .set({ status: "delivered", deliveredAt: Date.now(), saleId: sale.saleId })
    .where(eq(schema.repairJobs.id, id))
    .run();

  revalidatePath("/repairs");
  revalidatePath(`/repairs/${id}`);
  return { ok: true as const, invoiceNo: sale.invoiceNo };
}
