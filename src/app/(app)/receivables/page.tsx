import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getReceivables, getSettings } from "@/lib/queries";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { formatPKR, formatDateTime } from "@/lib/format";
import { ReceivePayment } from "../customers/[id]/ReceivePayment";

export const dynamic = "force-dynamic";

function waLink(phone: string | null, text: string) {
  const d = (phone ?? "").replace(/\D/g, "");
  const num = d.startsWith("0") ? "92" + d.slice(1) : d;
  return `${num ? `https://wa.me/${num}` : "https://wa.me/"}?text=${encodeURIComponent(text)}`;
}

function daysSince(ms: number | null) {
  if (!ms) return null;
  return Math.floor((Date.now() - ms) / 86400000);
}

export default async function ReceivablesPage() {
  const user = await getCurrentUser();
  if (!can(user?.role, "receivables")) return <NoAccess role={user?.role ?? "unknown"} />;

  const rows = getReceivables();
  const settings = getSettings();
  const shop = settings.shop_name_en || "PakGold";
  const totalDue = rows.reduce((s, r) => s + r.balance, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Udhaar / Receivables</h1>
        <p className="text-sm text-gray-500">
          {rows.length} customer(s) owe {formatPKR(totalDue)} <span className="urdu">ادھار</span>
        </p>
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Oldest unpaid</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const aging = daysSince(r.oldestUnpaid);
              const reminder = `Assalam o Alaikum ${r.name}, ${shop} par aap ka udhaar Rs ${Math.round(r.balance).toLocaleString("en-PK")} hai. Baraye meharbani adaigi kar dein. Shukria.`;
              return (
                <tr key={r.id} className="hover:bg-gold-50/40 align-top">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${r.id}`} className="font-medium text-navy-900 hover:text-gold-700">{r.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.phone || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.oldestUnpaid ? (
                      <>
                        {formatDateTime(r.oldestUnpaid)}
                        {aging !== null && <span className={`ml-2 text-xs ${aging > 30 ? "text-red-600 font-semibold" : "text-gray-400"}`}>{aging}d</span>}
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tnum font-semibold text-red-600">{formatPKR(r.balance)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-end gap-2 w-40 ml-auto">
                      <a
                        href={waLink(r.phone, reminder)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-success/10 text-success text-xs font-semibold px-3 py-1.5 hover:bg-success/20"
                      >
                        <MessageCircle size={14} /> Remind on WhatsApp
                      </a>
                      <div className="w-full">
                        <ReceivePayment customerId={r.id} maxAmount={r.balance} />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No outstanding balances. All clear! 🎉</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
