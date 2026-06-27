/** Server-only repair / job-work queries. */
import "server-only";
import { db, schema } from "./db";
import { desc, eq, sql } from "drizzle-orm";
export { JOB_TYPES, JOB_STATUSES } from "./constants";

export function listJobs(status?: string) {
  const q = db.select().from(schema.repairJobs).orderBy(desc(schema.repairJobs.createdAt));
  const rows = status && status !== "all" ? q.where(eq(schema.repairJobs.status, status)).all() : q.all();
  return rows;
}

export function getJob(id: number) {
  return db.select().from(schema.repairJobs).where(eq(schema.repairJobs.id, id)).get() ?? null;
}

/** Counts of open jobs by status, for the list header / dashboard. */
export function jobStatusCounts() {
  const rows = db
    .select({ status: schema.repairJobs.status, c: sql<number>`count(*)` })
    .from(schema.repairJobs)
    .groupBy(schema.repairJobs.status)
    .all();
  return Object.fromEntries(rows.map((r) => [r.status, r.c])) as Record<string, number>;
}

export function nextJobNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const count = db.select({ c: sql<number>`count(*)` }).from(schema.repairJobs).get()?.c ?? 0;
  return `RJ-${ymd}-${String(count + 1).padStart(4, "0")}`;
}
