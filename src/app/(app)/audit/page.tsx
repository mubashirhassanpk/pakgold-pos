import { listAuditLog } from "@/lib/finance";
import { getSettings } from "@/lib/queries";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { PrintButton } from "@/components/PrintButton";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const ACTION_STYLE: Record<string, string> = {
  sale_create: "bg-success/10 text-success",
  rate_update: "bg-gold-100 text-gold-700",
  old_gold_buy: "bg-gold-100 text-gold-700",
  data_reset: "bg-red-50 text-red-600",
  customer_payment: "bg-blue-50 text-blue-600",
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user?.role, "audit")) return <NoAccess role={user?.role ?? "unknown"} />;

  const sp = await searchParams;
  const rows = listAuditLog({ action: sp.action, limit: 300 });
  const settings = getSettings();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-gray-500">Every gold-related action, who did it and when. <span className="urdu">آڈٹ</span></p>
        </div>
        <PrintButton label="Print Report" />
      </div>

      <form className="flex items-end gap-2 bg-white rounded-2xl ring-1 ring-black/5 p-4 max-w-md no-print">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Filter by action</label>
          <input name="action" defaultValue={sp.action ?? ""} placeholder="e.g. rate_update, sale_create" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <button className="rounded-lg bg-navy-900 text-white text-sm font-semibold px-4 py-2 hover:bg-navy-800">Filter</button>
      </form>

      <div id="print-area" className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        {/* Print-only report header */}
        <div className="hidden print:block p-4 border-b border-gray-200">
          <div className="text-lg font-bold">{settings.shop_name_en || "PakGold"}</div>
          <div className="text-sm font-semibold">Audit Log Report</div>
          <div className="text-xs text-gray-600">
            Generated {formatDateTime(Date.now())}
            {sp.action ? ` • Filter: ${sp.action}` : ""} • {rows.length} entries
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gold-50/40">
                <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                <td className="px-4 py-2.5">{r.userName ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLE[r.action] ?? "bg-gray-100 text-gray-600"}`}>{r.action}</span>
                </td>
                <td className="px-4 py-2.5 text-gray-500">{r.entity}{r.entityId ? ` #${r.entityId}` : ""}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.detail || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No audit entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
