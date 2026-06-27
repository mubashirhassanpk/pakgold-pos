import Link from "next/link";
import { listSuppliers } from "@/lib/suppliers";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { formatPKR } from "@/lib/format";
import { AddSupplier } from "./AddSupplier";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const user = await getCurrentUser();
  if (!can(user?.role, "suppliers")) return <NoAccess role={user?.role ?? "unknown"} />;

  const suppliers = listSuppliers();
  const totalPayable = suppliers.reduce((s, x) => s + Math.max(0, x.balance), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-sm text-gray-500">{suppliers.length} suppliers • Payable {formatPKR(totalPayable)} <span className="urdu">سپلائر</span></p>
        </div>
        <AddSupplier />
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Balance Payable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers.map((s) => (
              <tr key={s.id} className={`hover:bg-gold-50/40 ${!s.active ? "opacity-50" : ""}`}>
                <td className="px-4 py-3"><Link href={`/suppliers/${s.id}`} className="font-medium text-navy-900 hover:text-gold-700">{s.name}</Link></td>
                <td className="px-4 py-3 text-gray-600">{s.phone || "—"}</td>
                <td className="px-4 py-3 text-right tnum">
                  {s.balance > 0 ? <span className="font-semibold text-red-600">{formatPKR(s.balance)}</span>
                    : s.balance < 0 ? <span className="text-success">{formatPKR(-s.balance)} adv</span>
                    : <span className="text-gray-300">Clear</span>}
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400">No suppliers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
