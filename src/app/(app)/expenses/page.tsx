import Link from "next/link";
import { listExpenses } from "@/lib/finance";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { formatPKR, formatDateTime } from "@/lib/format";
import { AddExpense } from "./AddExpense";
import { DeleteExpense } from "./DeleteExpense";

export const dynamic = "force-dynamic";

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user?.role, "expenses")) return <NoAccess role={user?.role ?? "unknown"} />;

  const sp = await searchParams;
  const fromStr = sp.from ?? monthStart();
  const toStr = sp.to ?? new Date().toISOString().slice(0, 10);
  const from = new Date(fromStr).getTime();
  const to = new Date(toStr).getTime() + 86399999;
  const rows = listExpenses(from, to);
  const total = rows.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-gray-500">{rows.length} entries • {formatPKR(total)} <span className="urdu">اخراجات</span></p>
        </div>
        <AddExpense />
      </div>

      <form className="flex flex-wrap items-end gap-2 bg-white rounded-2xl ring-1 ring-black/5 p-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" name="from" defaultValue={fromStr} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" name="to" defaultValue={toStr} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <button className="rounded-lg bg-navy-900 text-white text-sm font-semibold px-4 py-2 hover:bg-navy-800">Filter</button>
      </form>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((e) => (
              <tr key={e.id} className="hover:bg-gold-50/40">
                <td className="px-4 py-3 text-gray-500">{formatDateTime(e.expenseDate)}</td>
                <td className="px-4 py-3 font-medium">{e.category}</td>
                <td className="px-4 py-3 text-gray-600">{e.note || "—"}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{e.method}</td>
                <td className="px-4 py-3 text-right tnum font-semibold">{formatPKR(e.amount)}</td>
                <td className="px-2 py-3 text-right"><DeleteExpense id={e.id} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No expenses in this period.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
