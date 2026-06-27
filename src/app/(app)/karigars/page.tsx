import Link from "next/link";
import { listKarigars } from "@/lib/karigar";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { formatPKR } from "@/lib/format";
import { AddKarigar } from "./AddKarigar";

export const dynamic = "force-dynamic";

export default async function KarigarsPage() {
  const user = await getCurrentUser();
  if (!can(user?.role, "karigars")) return <NoAccess role={user?.role ?? "unknown"} />;

  const karigars = listKarigars();
  const totalPayable = karigars.reduce((s, k) => s + Math.max(0, k.balance), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Karigars &amp; Staff</h1>
          <p className="text-sm text-gray-500">
            {karigars.length} people • Payable {formatPKR(totalPayable)} <span className="urdu">کاریگر</span>
          </p>
        </div>
        <AddKarigar />
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Wage</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Balance Payable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {karigars.map((k) => (
              <tr key={k.id} className={`hover:bg-gold-50/40 ${!k.active ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <Link href={`/karigars/${k.id}`} className="font-medium text-navy-900 hover:text-gold-700">{k.name}</Link>
                  {!k.active && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
                </td>
                <td className="px-4 py-3 capitalize text-gray-600">{k.role}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{k.wageType}</td>
                <td className="px-4 py-3 text-gray-600">{k.phone || "—"}</td>
                <td className="px-4 py-3 text-right tnum">
                  {k.balance > 0 ? <span className="font-semibold text-red-600">{formatPKR(k.balance)}</span>
                    : k.balance < 0 ? <span className="text-success">{formatPKR(-k.balance)} adv</span>
                    : <span className="text-gray-300">Clear</span>}
                </td>
              </tr>
            ))}
            {karigars.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No karigars yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
