import Link from "next/link";
import { Search, FileText } from "lucide-react";
import { listSales } from "@/lib/queries";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { formatPKR, formatDateTime } from "@/lib/format";
import { ReprintButton } from "./ReprintButton";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user?.role, "invoices")) return <NoAccess role={user?.role ?? "unknown"} />;

  const sp = await searchParams;
  const from = sp.from ? new Date(sp.from).getTime() : undefined;
  const to = sp.to ? new Date(sp.to).getTime() + 86399999 : undefined; // include the whole "to" day
  const sales = listSales({ q: sp.q, from, to, limit: 200 });
  const total = sales.reduce((s, x) => s + x.grandTotal, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-sm text-gray-500">
          {sales.length} invoice(s) • {formatPKR(total)} <span className="urdu">رسیدیں</span>
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2 bg-white rounded-2xl ring-1 ring-black/5 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">Search</label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <Search size={16} className="text-gray-400" />
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Invoice no / customer / phone" className="flex-1 outline-none text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" name="from" defaultValue={sp.from ?? ""} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" name="to" defaultValue={sp.to ?? ""} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <button className="rounded-lg bg-navy-900 text-white text-sm font-semibold px-4 py-2 hover:bg-navy-800">Filter</button>
        <Link href="/invoices" className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100">Clear</Link>
      </form>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-right">Reprint</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sales.map((s) => {
              const bal = s.grandTotal - s.paidTotal;
              return (
                <tr key={s.id} className="hover:bg-gold-50/40">
                  <td className="px-4 py-3 font-mono text-xs">{s.invoiceNo}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTime(s.createdAt)}</td>
                  <td className="px-4 py-3">{s.customerName ?? "Walk-in"}</td>
                  <td className="px-4 py-3 text-right tnum font-semibold">{formatPKR(s.grandTotal)}</td>
                  <td className="px-4 py-3 text-right tnum">
                    {bal > 0.5 ? <span className="text-red-600">{formatPKR(bal)}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/invoice/${s.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg border border-navy-900 text-navy-900 px-2 py-1 text-xs hover:bg-navy-50"
                      >
                        <FileText size={13} /> A4
                      </Link>
                      <ReprintButton saleId={s.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {sales.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No invoices found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
