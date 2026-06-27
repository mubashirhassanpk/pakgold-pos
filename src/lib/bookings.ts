/** Server-only queries for Advance Booking (Bayana). */
import "server-only";
import { db, schema } from "./db";
import { desc, eq, sql } from "drizzle-orm";
export { BOOKING_STATUSES } from "./constants";

export function nextBookingNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const c = db.select({ c: sql<number>`count(*)` }).from(schema.bookings).get()?.c ?? 0;
  return `BK-${ymd}-${String(c + 1).padStart(4, "0")}`;
}

export function listBookings(status?: string) {
  const q = db.select().from(schema.bookings).orderBy(desc(schema.bookings.createdAt));
  return status && status !== "all" ? q.where(eq(schema.bookings.status, status)).all() : q.all();
}

export function getBooking(id: number) {
  return db.select().from(schema.bookings).where(eq(schema.bookings.id, id)).get() ?? null;
}

export function bookingStatusCounts() {
  const rows = db
    .select({ status: schema.bookings.status, c: sql<number>`count(*)` })
    .from(schema.bookings)
    .groupBy(schema.bookings.status)
    .all();
  return Object.fromEntries(rows.map((r) => [r.status, r.c])) as Record<string, number>;
}
