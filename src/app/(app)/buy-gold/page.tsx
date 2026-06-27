import Link from "next/link";
import { getCurrentRates, getCurrentSilverRates, getSettings } from "@/lib/queries";
import { customersForPicker } from "@/lib/customers";
import { nextVoucherNo, listPurchases } from "@/lib/oldgold";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { formatPKR, formatDateTime } from "@/lib/format";
import { BuyGoldClient } from "./BuyGoldClient";

export const dynamic = "force-dynamic";

export default async function BuyGoldPage() {
  const user = await getCurrentUser();
  if (!can(user?.role, "buygold")) return <NoAccess role={user?.role ?? "unknown"} />;

  const rates = getCurrentRates();
  const silverRates = getCurrentSilverRates();
  const customers = customersForPicker();
  const settings = getSettings();
  const voucherNo = nextVoucherNo();
  const recent = listPurchases(20);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buy Old Gold <span className="urdu text-base text-gray-400">پرانا سونا خریدیں</span></h1>
        <p className="text-sm text-gray-500">Purchase old gold from a customer at the buyback rate and print a voucher.</p>
      </div>

      <BuyGoldClient rates={rates} silverRates={silverRates} customers={customers} settings={settings} voucherNo={voucherNo} />

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Recent Purchases</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Voucher</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2 text-right">Weight</th>
              <th className="px-4 py-2 text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recent.map((p) => (
              <tr key={p.id} className="hover:bg-gold-50/40">
                <td className="px-4 py-2 font-mono text-xs">
                  <Link href={`/buy-gold/${p.id}`} className="text-navy-900 hover:text-gold-700">
                    {p.voucherNo}
                  </Link>
                </td>
                <td className="px-4 py-2">{p.customerName ?? "Walk-in"}</td>
                <td className="px-4 py-2 text-gray-500">{formatDateTime(p.createdAt)}</td>
                <td className="px-4 py-2 text-right tnum">{p.totalWeight.toFixed(3)} g</td>
                <td className="px-4 py-2 text-right tnum font-semibold">
                  <Link href={`/buy-gold/${p.id}`} className="hover:text-gold-700">{formatPKR(p.totalValue)}</Link>
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No purchases yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
