import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { listCommittees } from "@/lib/committees";
import { customersForPicker } from "@/lib/customers";
import { formatPKR } from "@/lib/format";
import { NewCommittee } from "./NewCommittee";

export const dynamic = "force-dynamic";

export default async function CommitteesPage() {
  const user = await getCurrentUser();
  if (!can(user?.role, "committees")) return <NoAccess role={user?.role ?? "unknown"} />;

  const committees = listCommittees();
  const customers = customersForPicker();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <PiggyBank className="text-gold-600" />
        <div>
          <h1 className="text-2xl font-bold">Committees / BC</h1>
          <p className="text-sm text-gray-500">
            Monthly gold &amp; cash saving committees. <span className="urdu">کمیٹی / بی سی</span>
          </p>
        </div>
      </div>

      <NewCommittee />

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Members</th>
              <th className="px-4 py-3 text-right">Monthly</th>
              <th className="px-4 py-3 text-right">Collected</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {committees.map((c) => (
              <tr key={c.id} className="hover:bg-gold-50/40">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/committees/${c.id}`} className="text-gold-700 hover:underline">
                    {c.code}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/committees/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize">{c.type}</td>
                <td className="px-4 py-3 text-right tnum">{c.members}</td>
                <td className="px-4 py-3 text-right tnum">
                  {c.type === "gold" ? `${c.monthlyGrams} g` : formatPKR(c.monthlyAmount)}
                </td>
                <td className="px-4 py-3 text-right tnum">
                  {c.type === "gold" ? `${c.collectedGrams.toFixed(2)} g` : formatPKR(c.collectedAmount)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                      c.status === "active"
                        ? "bg-green-50 text-green-700"
                        : c.status === "completed"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {committees.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  No committees yet. Create your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {customers.length > 0 && (
        <p className="text-xs text-gray-400">
          Tip: when adding members inside a committee you can pick from your {customers.length} saved customer(s).
        </p>
      )}
    </div>
  );
}
