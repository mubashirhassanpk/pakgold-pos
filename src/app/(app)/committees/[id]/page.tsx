import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { getCommitteeDetail } from "@/lib/committees";
import { getCurrentRates } from "@/lib/queries";
import { customersForPicker } from "@/lib/customers";
import { formatPKR, formatDateTime } from "@/lib/format";
import { Printer } from "lucide-react";
import { CommitteeClient } from "./CommitteeClient";

export const dynamic = "force-dynamic";

export default async function CommitteeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user?.role, "committees")) return <NoAccess role={user?.role ?? "unknown"} />;

  const { id } = await params;
  const detail = getCommitteeDetail(Number(id));
  if (!detail) notFound();

  const { committee, perMember, payouts, members } = detail;
  const memberName = new Map(members.map((m) => [m.id, m.name]));
  const customers = customersForPicker();
  const sellRate = getCurrentRates().find((r) => r.karat === 22)?.sellPerTola ?? 0;

  const totalCollectedAmount = perMember.reduce((s, m) => s + m.paidAmount, 0);
  const totalCollectedGrams = perMember.reduce((s, m) => s + m.paidGrams, 0);
  const totalPaidOut = perMember.reduce((s, m) => s + m.payoutAmount, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link href="/committees" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900">
        <ArrowLeft size={16} /> Back to committees
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{committee.name}</h1>
          <p className="text-sm text-gray-500 font-mono">{committee.code}</p>
        </div>
        <div className="text-right text-sm">
          <div className="capitalize text-gray-500">
            {committee.type} committee · {committee.totalMonths} months
          </div>
          <div className="font-semibold">
            {committee.type === "gold"
              ? `${committee.monthlyGrams} g / member / month`
              : `${formatPKR(committee.monthlyAmount)} / member / month`}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Members" value={String(perMember.length)} />
        <Card
          label="Collected"
          value={committee.type === "gold" ? `${totalCollectedGrams.toFixed(2)} g` : formatPKR(totalCollectedAmount)}
          sub={committee.type === "gold" ? formatPKR(totalCollectedAmount) : undefined}
        />
        <Card label="Paid Out" value={formatPKR(totalPaidOut)} />
        <Card label="Status" value={committee.status} capitalize />
      </div>

      <CommitteeClient
        committee={{
          id: committee.id,
          type: committee.type as "gold" | "cash",
          totalMonths: committee.totalMonths,
          monthlyAmount: committee.monthlyAmount,
          monthlyGrams: committee.monthlyGrams,
          status: committee.status,
        }}
        members={perMember.map((m) => ({
          id: m.id,
          name: m.name,
          phone: m.phone,
          payoutMonth: m.payoutMonth,
          paidCount: m.paidCount,
          paidAmount: m.paidAmount,
          paidGrams: m.paidGrams,
          payoutTaken: m.payoutTaken,
          paidMonths: Array.from(m.paidMonths),
        }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
        sellRate={sellRate}
      />

      {/* Payout history with printable slips */}
      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-x-auto">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Payouts</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3 text-center">Month</th>
              <th className="px-4 py-3 text-center">Method</th>
              <th className="px-4 py-3 text-right">Grams</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Slip</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payouts.map((p) => (
              <tr key={p.id} className="hover:bg-gold-50/40">
                <td className="px-4 py-3 font-medium">{memberName.get(p.memberId) ?? "—"}</td>
                <td className="px-4 py-3 text-center tnum">{p.monthNo}</td>
                <td className="px-4 py-3 text-center capitalize">{p.method}</td>
                <td className="px-4 py-3 text-right tnum">{p.grams ? `${p.grams.toFixed(3)} g` : "—"}</td>
                <td className="px-4 py-3 text-right tnum font-semibold">{formatPKR(p.amount)}</td>
                <td className="px-4 py-3 text-gray-500">{formatDateTime(p.paidAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/committees/${committee.id}/payout/${p.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-navy-900 hover:bg-gold-50"
                  >
                    <Printer size={13} /> Print
                  </Link>
                </td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No payouts recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value, sub, capitalize }: { label: string; value: string; sub?: string; capitalize?: boolean }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-xl font-bold tnum text-navy-900 ${capitalize ? "capitalize" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}
