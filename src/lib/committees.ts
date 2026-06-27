/** Server-only read queries for the Committee / BC (gold-saving) module. */
import "server-only";
import { db, schema } from "./db";
import { desc, eq, sql } from "drizzle-orm";

/** Next committee code like BC-0007. */
export function nextCommitteeCode(prefix = "BC"): string {
  const rows = db.select({ code: schema.committees.code }).from(schema.committees).all();
  let max = 0;
  for (const r of rows) {
    const m = r.code?.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export interface CommitteeSummary {
  id: number;
  code: string;
  name: string;
  type: string;
  status: string;
  totalMonths: number;
  monthlyAmount: number;
  monthlyGrams: number;
  startDate: string | null;
  members: number;
  collectedAmount: number;
  collectedGrams: number;
  paidOutAmount: number;
  paidOutGrams: number;
}

export function listCommittees(): CommitteeSummary[] {
  const committees = db.select().from(schema.committees).orderBy(desc(schema.committees.createdAt)).all();
  return committees.map((c) => {
    const m = db
      .select({ n: sql<number>`count(*)` })
      .from(schema.committeeMembers)
      .where(eq(schema.committeeMembers.committeeId, c.id))
      .get();
    const inst = db
      .select({
        amt: sql<number>`coalesce(sum(${schema.committeeInstallments.amount}),0)`,
        g: sql<number>`coalesce(sum(${schema.committeeInstallments.grams}),0)`,
      })
      .from(schema.committeeInstallments)
      .where(eq(schema.committeeInstallments.committeeId, c.id))
      .get();
    const pay = db
      .select({
        amt: sql<number>`coalesce(sum(${schema.committeePayouts.amount}),0)`,
        g: sql<number>`coalesce(sum(${schema.committeePayouts.grams}),0)`,
      })
      .from(schema.committeePayouts)
      .where(eq(schema.committeePayouts.committeeId, c.id))
      .get();
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      type: c.type,
      status: c.status,
      totalMonths: c.totalMonths,
      monthlyAmount: c.monthlyAmount,
      monthlyGrams: c.monthlyGrams,
      startDate: c.startDate,
      members: m?.n ?? 0,
      collectedAmount: inst?.amt ?? 0,
      collectedGrams: inst?.g ?? 0,
      paidOutAmount: pay?.amt ?? 0,
      paidOutGrams: pay?.g ?? 0,
    };
  });
}

/** A single payout with its committee + member context, for the printable slip. */
export function getCommitteePayout(payoutId: number) {
  const payout = db
    .select()
    .from(schema.committeePayouts)
    .where(eq(schema.committeePayouts.id, payoutId))
    .get();
  if (!payout) return null;
  const committee = db.select().from(schema.committees).where(eq(schema.committees.id, payout.committeeId)).get();
  const member = db.select().from(schema.committeeMembers).where(eq(schema.committeeMembers.id, payout.memberId)).get();
  if (!committee || !member) return null;
  return { payout, committee, member };
}

export function getCommitteeDetail(id: number) {
  const committee = db.select().from(schema.committees).where(eq(schema.committees.id, id)).get();
  if (!committee) return null;

  const members = db
    .select()
    .from(schema.committeeMembers)
    .where(eq(schema.committeeMembers.committeeId, id))
    .orderBy(schema.committeeMembers.payoutMonth, schema.committeeMembers.id)
    .all();

  const installments = db
    .select()
    .from(schema.committeeInstallments)
    .where(eq(schema.committeeInstallments.committeeId, id))
    .orderBy(schema.committeeInstallments.monthNo)
    .all();

  const payouts = db
    .select()
    .from(schema.committeePayouts)
    .where(eq(schema.committeePayouts.committeeId, id))
    .orderBy(schema.committeePayouts.monthNo)
    .all();

  // Per-member rollups.
  const perMember = members.map((mem) => {
    const mInst = installments.filter((i) => i.memberId === mem.id);
    const mPay = payouts.filter((p) => p.memberId === mem.id);
    return {
      ...mem,
      paidCount: mInst.length,
      paidAmount: mInst.reduce((s, i) => s + i.amount, 0),
      paidGrams: mInst.reduce((s, i) => s + i.grams, 0),
      payoutTaken: mPay.length > 0,
      payoutAmount: mPay.reduce((s, p) => s + p.amount, 0),
      payoutGrams: mPay.reduce((s, p) => s + p.grams, 0),
      paidMonths: new Set(mInst.map((i) => i.monthNo)),
    };
  });

  return { committee, members, installments, payouts, perMember };
}
