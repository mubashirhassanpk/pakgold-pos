import Link from "next/link";
import { Search } from "lucide-react";
import { listCustomers } from "@/lib/customers";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { formatPKR, formatDateTime } from "@/lib/format";
import { AddCustomer } from "./AddCustomer";
import { DeleteCustomer } from "./DeleteCustomer";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user?.role, "customers")) return <NoAccess role={user?.role ?? "unknown"} />;
  const canManage = user?.role === "owner" || user?.role === "manager";

  const { q } = await searchParams;
  const customers = listCustomers(q);
  const totalDue = customers.reduce((s, c) => s + Math.max(0, c.balance), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-gray-500">
            {customers.length} customer(s) • Total outstanding {formatPKR(totalDue)}{" "}
            <span className="urdu">گاہک</span>
          </p>
        </div>
        <AddCustomer />
      </div>

      <form className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 max-w-md">
        <Search size={18} className="text-gray-400" />
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name, phone, or CNIC…"
          className="flex-1 outline-none text-sm"
        />
      </form>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">CNIC</th>
              <th className="px-4 py-3 text-center">Purchases</th>
              <th className="px-4 py-3 text-right">Balance (Udhaar)</th>
              <th className="px-4 py-3">Since</th>
              {canManage && <th className="px-4 py-3 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-gold-50/40">
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="font-medium text-navy-900 hover:text-gold-700">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.phone || "—"}</td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{c.cnic || "—"}</td>
                <td className="px-4 py-3 text-center text-gray-600">{c.saleCount}</td>
                <td className="px-4 py-3 text-right tnum">
                  {c.balance > 0 ? (
                    <span className="font-semibold text-red-600">{formatPKR(c.balance)}</span>
                  ) : c.balance < 0 ? (
                    <span className="text-success">{formatPKR(-c.balance)} advance</span>
                  ) : (
                    <span className="text-gray-400">Clear</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(c.createdAt)}</td>
                {canManage && (
                  <td className="px-4 py-3 text-center">
                    <DeleteCustomer id={c.id} name={c.name} />
                  </td>
                )}
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="px-4 py-10 text-center text-gray-400">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
