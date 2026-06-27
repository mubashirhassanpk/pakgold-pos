import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, CreditCard, MapPin } from "lucide-react";
import { getCustomer, getCustomerSales, getCustomerStats, getCustomerPayments } from "@/lib/customers";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { formatPKR, formatDateTime } from "@/lib/format";
import { ReceivePayment } from "./ReceivePayment";
import { EditCustomer } from "./EditCustomer";

export const dynamic = "force-dynamic";

export default async function CustomerProfile({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user?.role, "customers")) return <NoAccess role={user?.role ?? "unknown"} />;

  const { id } = await params;
  const customer = getCustomer(Number(id));
  if (!customer) notFound();

  const sales = getCustomerSales(customer.id);
  const stats = getCustomerStats(customer.id);
  const paymentsReceived = getCustomerPayments(customer.id);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900">
        <ArrowLeft size={16} /> Back to customers
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold">{customer.name}</h1>
              <p className="text-xs text-gray-400">Customer since {formatDateTime(customer.createdAt)}</p>
            </div>
            <EditCustomer customer={customer} />
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone size={15} className="text-gray-400" /> {customer.phone}
              </div>
            )}
            {customer.cnic && (
              <div className="flex items-center gap-2">
                <CreditCard size={15} className="text-gray-400" /> {customer.cnic}
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-gray-400" /> {customer.address}
              </div>
            )}
            {customer.notes && <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">{customer.notes}</p>}
          </div>
        </div>

        {/* Balance + stats */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            className={`rounded-2xl p-5 ring-1 ring-black/5 ${
              customer.balance > 0 ? "bg-red-50" : "bg-white"
            }`}
          >
            <div className="text-xs text-gray-500">Outstanding (Udhaar)</div>
            <div
              className={`mt-1 text-2xl font-bold tnum ${
                customer.balance > 0 ? "text-red-600" : "text-gray-400"
              }`}
            >
              {customer.balance > 0
                ? formatPKR(customer.balance)
                : customer.balance < 0
                ? `${formatPKR(-customer.balance)} adv`
                : "Clear"}
            </div>
            {customer.balance > 0 && (
              <div className="mt-3">
                <ReceivePayment customerId={customer.id} maxAmount={customer.balance} />
              </div>
            )}
          </div>
          <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
            <div className="text-xs text-gray-500">Total Purchases</div>
            <div className="mt-1 text-2xl font-bold tnum">{formatPKR(stats.total)}</div>
          </div>
          <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
            <div className="text-xs text-gray-500">Bills</div>
            <div className="mt-1 text-2xl font-bold tnum">{stats.count}</div>
          </div>
        </div>
      </div>

      {/* Purchase history */}
      <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
        <h2 className="font-semibold mb-4">Purchase History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2">Invoice</th>
                <th className="py-2">Date</th>
                <th className="py-2 text-right">Old Gold</th>
                <th className="py-2 text-right">Paid</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map((s) => {
                const bal = s.grandTotal - s.paidTotal;
                const unpaid = bal > 0.5;
                return (
                  <tr key={s.id} className={unpaid ? "bg-red-50/60" : undefined}>
                    <td className="py-2 font-mono text-xs">
                      <Link href={`/invoice/${s.id}`} className="text-navy-900 hover:text-gold-700">
                        {s.invoiceNo}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-500">{formatDateTime(s.createdAt)}</td>
                    <td className="py-2 text-right tnum text-gray-500">
                      {s.oldGoldTotal ? `− ${formatPKR(s.oldGoldTotal)}` : "—"}
                    </td>
                    <td className="py-2 text-right tnum text-gray-500">{formatPKR(s.paidTotal)}</td>
                    <td className="py-2 text-right tnum font-semibold">{formatPKR(s.grandTotal)}</td>
                    <td className="py-2 text-right tnum">
                      {unpaid ? <span className="text-red-600 font-semibold">{formatPKR(bal)}</span> : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">No purchases yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Udhaar settlements / payments received */}
      <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Payments Received <span className="urdu text-gray-400 text-sm">وصولی</span></h2>
          {paymentsReceived.length > 0 && (
            <span className="text-sm text-gray-500">
              Total received: <span className="font-semibold tnum text-success">{formatPKR(paymentsReceived.reduce((s, p) => s + p.amount, 0))}</span>
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">Method</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paymentsReceived.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 text-gray-500">{formatDateTime(p.createdAt)}</td>
                  <td className="py-2 text-gray-600 capitalize">{p.method}</td>
                  <td className="py-2 text-right tnum font-semibold text-success">{formatPKR(p.amount)}</td>
                </tr>
              ))}
              {paymentsReceived.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-400">No balance payments recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
