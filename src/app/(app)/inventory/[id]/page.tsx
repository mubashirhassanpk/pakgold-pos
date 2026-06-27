import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getItem, getItemStones, getCategories, getCurrentRates, getCurrentSilverRates, getSettings } from "@/lib/queries";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { Barcode } from "@/components/Barcode";
import { ItemActions } from "./ItemActions";
import { formatPKR, formatWeightDual } from "@/lib/format";
import { gramsToTola } from "@/lib/units";
import { KARAT_PURITY, silverPurityFactor } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user?.role, "inventory")) return <NoAccess role={user?.role ?? "unknown"} />;

  const { id } = await params;
  const item = getItem(Number(id));
  if (!item) notFound();
  const stones = getItemStones(item.id);

  const canManage = user?.role === "owner" || user?.role === "manager";
  const categories = new Map(getCategories().map((c) => [c.id, c.nameEn]));
  const isSilver = (item.metal ?? "gold") === "silver";
  let rate = 0;
  if (isSilver) {
    const sr = getCurrentSilverRates();
    const f = item.silverPurity ?? 999;
    const exact = sr.find((r) => r.fineness === f);
    const pure = sr.find((r) => r.fineness === 999) ?? sr[0] ?? null;
    rate = exact
      ? exact.sellPerTola
      : pure
        ? Math.round((pure.sellPerTola / pure.purityFactor) * silverPurityFactor(f))
        : 0;
  } else {
    rate = getCurrentRates().find((r) => r.karat === item.karat)?.sellPerTola ?? 0;
  }
  const settings = getSettings();
  const goldValue = gramsToTola(item.netWeight) * rate;
  const purityLabel = isSilver
    ? `${item.silverPurity ?? 999} Silver`
    : `${item.karat}K (${KARAT_PURITY[item.karat]?.hallmark ?? ""})`;

  const making =
    item.makingType === "per_gram"
      ? item.makingValue * item.netWeight
      : item.makingType === "percent"
      ? (goldValue * item.makingValue) / 100
      : item.makingValue;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print">
        <Link href="/inventory" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900">
          <ArrowLeft size={16} /> Back to inventory
        </Link>
        <div className="flex gap-2">
          {canManage && (
            <Link
              href={`/inventory/${item.id}/edit`}
              className="flex items-center gap-2 rounded-lg bg-gold text-navy-900 font-semibold text-sm px-4 py-2 hover:brightness-105"
            >
              <Pencil size={16} /> Edit
            </Link>
          )}
          {canManage && <ItemActions id={item.id} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white ring-1 ring-black/5 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{item.nameEn}</h1>
              {item.nameUr && <div className="urdu text-gray-500">{item.nameUr}</div>}
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${isSilver ? "bg-slate-200 text-slate-700" : "bg-gold-100 text-gold-700"}`}>
              {purityLabel}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-y-3 gap-x-6 mt-5 text-sm">
            <Row label="Category" value={item.categoryId ? categories.get(item.categoryId) ?? "—" : "—"} />
            <Row label="Status" value={item.status} />
            <Row label="Gross Weight" value={formatWeightDual(item.grossWeight)} />
            <Row label="Net Weight" value={formatWeightDual(item.netWeight)} />
            <Row
              label="Making"
              value={`${item.makingType} • ${item.makingType === "per_gram" ? `Rs ${item.makingValue}/g` : item.makingType === "percent" ? `${item.makingValue}%` : `Rs ${item.makingValue}`}`}
            />
            <Row label="Wastage" value={`${item.wastageValue} (${item.wastageType})`} />
            <Row label="Cost Price" value={formatPKR(item.costPrice)} />
            <Row label="Supplier" value={item.supplier || "—"} />
            <Row label="Quantity" value={String(item.quantity)} />
            <Row label="Hallmark" value={item.hallmark || "—"} />
          </dl>

          {(item.hallmarkLab || item.certNo) && (
            <div className="mt-4 rounded-xl bg-gold-50 ring-1 ring-gold/20 p-4 text-sm">
              <div className="font-semibold text-gold-700 mb-1">Hallmark / Purity Certificate</div>
              <div className="text-gray-700">
                {item.hallmarkLab && <span>Lab: {item.hallmarkLab} </span>}
                {item.certNo && <span>• Cert No: {item.certNo} </span>}
                {item.certDate && <span>• {item.certDate}</span>}
              </div>
            </div>
          )}

          {stones.length > 0 && (
            <div className="mt-4">
              <h2 className="font-semibold text-sm text-gray-700 mb-2">Stone &amp; Diamond Detail</h2>
              <div className="overflow-x-auto rounded-xl ring-1 ring-black/5">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 text-left">
                    <tr>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Shape</th>
                      <th className="px-3 py-2 text-right">Count</th>
                      <th className="px-3 py-2 text-right">Carat</th>
                      <th className="px-3 py-2">Colour</th>
                      <th className="px-3 py-2">Clarity</th>
                      <th className="px-3 py-2">Cert</th>
                      <th className="px-3 py-2 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stones.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-2 capitalize">{s.stoneType}</td>
                        <td className="px-3 py-2 capitalize">{s.shape || "—"}</td>
                        <td className="px-3 py-2 text-right tnum">{s.count}</td>
                        <td className="px-3 py-2 text-right tnum">{s.caratWeight ? `${s.caratWeight} ct` : "—"}</td>
                        <td className="px-3 py-2">{s.colorGrade || "—"}</td>
                        <td className="px-3 py-2">{s.clarityGrade || "—"}</td>
                        <td className="px-3 py-2">{s.certLab ? `${s.certLab} ${s.certNo ?? ""}` : "—"}</td>
                        <td className="px-3 py-2 text-right tnum">{formatPKR(s.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-xl bg-navy-900 text-white p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-white/60">Today&apos;s {isSilver ? "Silver" : "Gold"} Value + Making</div>
              <div className="text-xs text-white/40">at {isSilver ? `${item.silverPurity ?? 999}` : `${item.karat}K`} {formatPKR(rate)}/tola</div>
            </div>
            <div className="text-2xl font-bold tnum">{formatPKR(goldValue + making)}</div>
          </div>
        </div>

        {/* Printable label */}
        <div className="rounded-2xl bg-white ring-1 ring-black/5 p-6">
          <h2 className="font-semibold mb-3 no-print">Label</h2>
          <div id="print-area" className="text-center border border-dashed border-gray-300 rounded-lg p-3">
            <div className="text-sm font-bold">{settings.shop_name_en || "PakGold"}</div>
            <div className="text-xs">{item.nameEn} • {isSilver ? `${item.silverPurity ?? 999} Ag` : `${item.karat}K`}</div>
            <div className="text-xs mb-1">{item.netWeight} g</div>
            <div className="flex justify-center">
              <Barcode value={item.barcode ?? ""} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-gray-400 text-xs">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}
