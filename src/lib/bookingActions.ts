"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "./db";
import { getCurrentUser, can } from "./auth";
import { nextBookingNo } from "./bookings";
import { createSale } from "./actions";
import { round2 } from "./calculations";

async function requireAccess() {
  const user = await getCurrentUser();
  if (!can(user?.role, "bookings")) throw new Error("Not authorized");
  return user!;
}

export interface BookingInput {
  customerId?: number | null;
  customerName: string;
  phone?: string;
  description: string;
  karat?: number | null;
  estimatedWeight?: number;
  estimatedAmount: number;
  advance?: number;
  expectedDate?: string;
  notes?: string;
  karigarId?: number | null;
}

export async function createBooking(input: BookingInput) {
  const user = await requireAccess();
  if (!input.customerName.trim()) return { ok: false as const, error: "Customer name required" };
  if (!input.description.trim()) return { ok: false as const, error: "Description required" };
  const bookingNo = nextBookingNo();
  const row = db
    .insert(schema.bookings)
    .values({
      bookingNo,
      customerId: input.customerId ?? null,
      customerName: input.customerName.trim(),
      phone: input.phone?.trim() || null,
      description: input.description.trim(),
      karat: input.karat ?? null,
      estimatedWeight: input.estimatedWeight ?? 0,
      estimatedAmount: round2(input.estimatedAmount ?? 0),
      advance: round2(input.advance ?? 0),
      expectedDate: input.expectedDate?.trim() || null,
      notes: input.notes?.trim() || null,
      karigarId: input.karigarId ?? null,
      status: "booked",
      userId: user.id,
    })
    .returning({ id: schema.bookings.id })
    .get();
  db.insert(schema.auditLog)
    .values({ userId: user.id, action: "booking_create", entity: "booking", entityId: String(row.id), detail: `${bookingNo} advance=${input.advance ?? 0}` })
    .run();
  revalidatePath("/bookings");
  return { ok: true as const, id: row.id, bookingNo };
}

export async function setBookingStatus(id: number, status: string) {
  const user = await requireAccess();
  db.update(schema.bookings)
    .set({ status, ...(status === "delivered" ? { deliveredAt: Date.now() } : {}) })
    .where(eq(schema.bookings.id, id))
    .run();
  db.insert(schema.auditLog)
    .values({ userId: user.id, action: "booking_status", entity: "booking", entityId: String(id), detail: status })
    .run();
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  return { ok: true as const };
}

/** Deliver the order and bill the final amount as a sale (advance already collected). */
export async function deliverAndBill(id: number, finalAmount: number, method: string) {
  await requireAccess();
  const b = db.select().from(schema.bookings).where(eq(schema.bookings.id, id)).get();
  if (!b) return { ok: false as const, error: "Booking not found" };
  if (b.saleId) return { ok: false as const, error: "Already billed" };

  const total = round2(finalAmount > 0 ? finalAmount : b.estimatedAmount);
  const sale = await createSale({
    customerId: b.customerId ?? null,
    lines: [
      {
        itemId: null,
        type: "custom",
        description: `Order: ${b.description} (${b.bookingNo})`,
        metal: "gold",
        karat: b.karat ?? 0,
        weightGrams: b.estimatedWeight,
        ratePerTola: 0,
        goldValue: 0,
        making: 0,
        wastage: 0,
        other: total,
        quantity: 1,
        lineTotal: total,
      },
    ],
    oldGold: [],
    payments: total > 0 ? [{ method, amount: total }] : [],
    totals: {
      goldValueTotal: 0, makingTotal: 0, wastageTotal: 0, otherTotal: total,
      subtotal: total, tax: 0, discount: 0, oldGoldTotal: 0, grandTotal: total,
    },
  });

  db.update(schema.bookings)
    .set({ status: "delivered", deliveredAt: Date.now(), saleId: sale.saleId })
    .where(eq(schema.bookings.id, id))
    .run();
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
  return { ok: true as const, invoiceNo: sale.invoiceNo };
}
