import Link from "next/link";
import { Plus, Truck, Tag, ScanLine, Pencil } from "lucide-react";
import { getInventory, getCategories, getCurrentRates, getCurrentSilverRates } from "@/lib/queries";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { formatPKR, formatWeightDual } from "@/lib/format";
import { gramsToTola } from "@/lib/units";
import { silverPurityFactor } from "@/lib/constants";
import { DeleteItemButton } from "./DeleteItemButton";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!can(user?.role, "inventory")) return <NoAccess role={user?.role ?? "unknown"} />;
  const canManage = user?.role === "owner" || user?.role === "manager";

  const items = getInventory();
  const categories = new Map(getCategories().map((c) => [c.id, c]));
  const rateByKarat = new Map(getCurrentRates().map((r) => [r.karat, r.sellPerTola]));
  const silverRates = getCurrentSilverRates();
  const pureSilver = silverRates.find((r) => r.fineness === 999) ?? silverRates[0] ?? null;
  // Per-tola sell rate for any item (gold by karat, silver scaled to fineness).
  const itemRate = (it: { metal?: string | null; karat: number; silverPurity?: number | null }) => {
    if ((it.metal ?? "gold") === "silver") {
      const f = it.silverPurity ?? 999;
      const exact = silverRates.find((r) => r.fineness === f);
      if (exact) return exact.sellPerTola;
      if (!pureSilver) return 0;
      return Math.round((pureSilver.sellPerTola / pureSilver.purityFactor) * silverPurityFactor(f));
    }
    return rateByKarat.get(it.karat) ?? 0;
  };
  const totalValue = items.reduce(
    (s, it) => s + gramsToTola(it.netWeight * it.quantity) * itemRate(it),
    0
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-gray-500">
            {items.length} items • {formatPKR(totalValue)} at today&apos;s rate{" "}
            <span className="urdu">اسٹاک</span>
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link
              href="/inventory/audit"
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white font-semibold px-4 py-2 hover:bg-gray-50"
            >
              <ScanLine size={18} /> Stock Audit
            </Link>
            <Link
              href="/inventory/labels"
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white font-semibold px-4 py-2 hover:bg-gray-50"
            >
              <Tag size={18} /> Labels
            </Link>
            <Link
              href="/inventory/purchase"
              className="flex items-center gap-2 rounded-lg bg-navy-900 text-white font-semibold px-4 py-2 hover:bg-navy-800"
            >
              <Truck size={18} /> Purchase
            </Link>
            <Link
              href="/inventory/new"
              className="flex items-center gap-2 rounded-lg bg-gold text-navy-900 font-semibold px-4 py-2 hover:brightness-105"
            >
              <Plus size={18} /> Add Item
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Barcode</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Purity</th>
              <th className="px-4 py-3">Net Weight</th>
              <th className="px-4 py-3 text-center">Qty</th>
              <th className="px-4 py-3 text-right">Gold Value (today)</th>
              {canManage && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it) => {
              const isSilver = (it.metal ?? "gold") === "silver";
              const rate = itemRate(it);
              const value = gramsToTola(it.netWeight) * rate;
              return (
                <tr key={it.id} className="hover:bg-gold-50/40">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{it.barcode}</td>
                  <td className="px-4 py-3">
                    <Link href={`/inventory/${it.id}`} className="font-medium text-navy-900 hover:text-gold-700">
                      {it.nameEn}
                    </Link>
                    {it.nameUr && <div className="urdu text-xs text-gray-500">{it.nameUr}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {it.categoryId ? categories.get(it.categoryId)?.nameEn : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${isSilver ? "bg-slate-200 text-slate-700" : "bg-gold-100 text-gold-700"}`}>
                      {isSilver ? `${it.silverPurity ?? 999} Ag` : `${it.karat}K`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 tnum">{formatWeightDual(it.netWeight)}</td>
                  <td className={`px-4 py-3 text-center tnum ${it.quantity <= 0 ? "text-red-500 font-semibold" : "text-gray-600"}`}>
                    {it.quantity}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tnum">{formatPKR(value)}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/inventory/${it.id}/edit`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-navy-900 hover:bg-gold-50"
                        >
                          <Pencil size={13} /> Edit
                        </Link>
                        <DeleteItemButton id={it.id} name={it.nameEn} />
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={canManage ? 8 : 7} className="px-4 py-10 text-center text-gray-400">
                  No items in stock. Run <code className="text-gold-700">npm run db:seed</code> for sample data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
