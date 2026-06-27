"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, PackagePlus, Check, Trash2, Ban } from "lucide-react";
import { A4Purchase } from "@/components/A4Purchase";
import { addOldGoldItemToInventory } from "@/lib/inventoryActions";
import { deleteOldGoldPurchase, voidOldGoldPurchase } from "@/lib/oldGoldActions";
import { formatPKR, formatWeightDual, formatDateTime } from "@/lib/format";

interface PurchaseItem {
  id: number;
  metal?: string | null;
  karat: number;
  silverPurity?: number | null;
  weightGrams: number;
  buyRatePerTola: number;
  value: number;
  notes?: string | null;
  inventoryItemId?: number | null;
}
interface Purchase {
  voucherNo: string;
  createdAt: number;
  customerName: string | null;
  phone: string | null;
  totalWeight: number;
  totalValue: number;
  paid: number;
  method: string;
  notes: string | null;
  status?: string;
}

export function VoucherView({
  settings,
  purchaseId,
  purchase,
  items,
  qrSvg,
  canManage = false,
}: {
  settings: Record<string, string>;
  purchaseId: number;
  purchase: Purchase;
  items: PurchaseItem[];
  qrSvg?: string;
  canManage?: boolean;
}) {
  const [format, setFormat] = useState<"thermal" | "a4">("thermal");
  const router = useRouter();
  const [pending, start] = useTransition();
  // Optimistic record of items just added to stock this session (id -> barcode).
  const [added, setAdded] = useState<Record<number, string>>({});
  const [err, setErr] = useState<string | null>(null);

  function itemLabel(it: PurchaseItem) {
    const purity = (it.metal ?? "gold") === "silver" ? `${it.silverPurity ?? 999} Silver` : `${it.karat}K`;
    return it.notes?.trim() || `Old ${purity}`;
  }

  function addToStock(itemId: number) {
    setErr(null);
    start(async () => {
      const res = await addOldGoldItemToInventory(itemId);
      if (res.ok) {
        setAdded((p) => ({ ...p, [itemId]: res.barcode }));
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  const isVoid = purchase.status === "void";

  function voidPurchase() {
    if (
      !confirm(
        `Void purchase ${purchase.voucherNo}?\n\nBalance owed to the customer is reversed and any in-stock pieces are removed, but the voucher is kept (hidden from lists & reports) for history.`
      )
    )
      return;
    setErr(null);
    start(async () => {
      const res = await voidOldGoldPurchase(purchaseId);
      if (res.ok) router.refresh();
      else setErr(res.error);
    });
  }

  function deletePurchase() {
    if (
      !confirm(
        `Delete / return purchase ${purchase.voucherNo}?\n\nThis reverses any balance owed to the customer and removes any in-stock pieces created from this voucher. This cannot be undone.`
      )
    )
      return;
    setErr(null);
    start(async () => {
      const res = await deleteOldGoldPurchase(purchaseId);
      if (res.ok) {
        router.push("/buy-gold");
        router.refresh();
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-4 max-w-[210mm] mx-auto">
        <Link href="/buy-gold" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900">
          <ArrowLeft size={16} /> Back to Buy Old Gold
        </Link>
        <div className="flex items-center gap-2">
          {/* Format toggle */}
          <div className="inline-flex rounded-lg ring-1 ring-gray-200 overflow-hidden text-sm bg-white">
            <button
              onClick={() => setFormat("thermal")}
              className={`px-3 py-2 font-medium ${format === "thermal" ? "bg-navy-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              Thermal
            </button>
            <button
              onClick={() => setFormat("a4")}
              className={`px-3 py-2 font-medium ${format === "a4" ? "bg-navy-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              A4 Invoice
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-navy-900 text-white px-4 py-2 text-sm font-semibold hover:bg-navy-800"
          >
            <Printer size={16} /> {format === "a4" ? "Print A4" : "Reprint Voucher"}
          </button>
          {canManage && !isVoid && (
            <button
              onClick={voidPurchase}
              disabled={pending}
              className="flex items-center gap-2 rounded-lg border border-amber-400 text-amber-700 px-4 py-2 text-sm font-semibold hover:bg-amber-50 disabled:opacity-60"
            >
              <Ban size={16} /> Void
            </button>
          )}
          {canManage && (
            <button
              onClick={deletePurchase}
              disabled={pending}
              className="flex items-center gap-2 rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 size={16} /> Delete / Return
            </button>
          )}
        </div>
      </div>

      {isVoid && (
        <div className="no-print max-w-[210mm] mx-auto mb-4 rounded-lg bg-amber-50 ring-1 ring-amber-200 px-4 py-2 text-sm font-semibold text-amber-700">
          VOID — this purchase is cancelled (kept for record).
        </div>
      )}

      {canManage && !isVoid && (
        <div className="no-print max-w-[210mm] mx-auto mb-4 rounded-2xl bg-white ring-1 ring-black/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <PackagePlus size={18} className="text-navy-900" />
            <h2 className="font-semibold text-sm">Add to Inventory <span className="urdu text-gray-400">اسٹاک میں شامل کریں</span></h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Optional — turn any purchased piece into sellable stock (one item each). Cost price is set
            to what you paid.
          </p>
          <div className="divide-y divide-gray-100">
            {items.map((it) => {
              const inStock = it.inventoryItemId ?? null;
              const justAdded = added[it.id];
              return (
                <div key={it.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{itemLabel(it)}</div>
                    <div className="text-xs text-gray-400">
                      {(it.metal ?? "gold") === "silver" ? `${it.silverPurity ?? 999} Ag` : `${it.karat}K`} •{" "}
                      {formatWeightDual(it.weightGrams)} • cost {formatPKR(it.value)}
                    </div>
                  </div>
                  {inStock ? (
                    <Link
                      href={`/inventory/${inStock}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-success/10 text-success text-xs font-semibold px-3 py-1.5 hover:bg-success/20"
                    >
                      <Check size={14} /> In stock
                    </Link>
                  ) : justAdded ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-success/10 text-success text-xs font-semibold px-3 py-1.5">
                      <Check size={14} /> Added ({justAdded})
                    </span>
                  ) : (
                    <button
                      onClick={() => addToStock(it.id)}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-lg bg-navy-900 text-white text-xs font-semibold px-3 py-1.5 hover:bg-navy-800 disabled:opacity-60"
                    >
                      <PackagePlus size={14} /> Add to Inventory
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
        </div>
      )}

      {format === "a4" ? (
        <div id="print-area" className="shadow-lg ring-1 ring-black/5 mx-auto" style={{ width: "210mm" }}>
          <A4Purchase settings={settings} purchase={purchase} items={items} qrSvg={qrSvg} />
        </div>
      ) : (
        <div
          id="print-area"
          className="mx-auto bg-white p-4 ring-1 ring-black/10"
          style={{ width: "80mm", fontFamily: "ui-monospace, monospace", fontSize: 11 }}
        >
          <div className="text-center">
            <div className="font-bold text-base">{settings.shop_name_en || "PakGold"}</div>
            {settings.shop_name_ur && <div className="urdu">{settings.shop_name_ur}</div>}
            {settings.address && <div className="text-[10px]">{settings.address}</div>}
            {settings.phone && <div className="text-[10px]">Ph: {settings.phone}</div>}
            <div className="font-semibold mt-1">OLD GOLD PURCHASE VOUCHER</div>
          </div>
          <div className="border-t border-dashed border-black my-1" />
          <div>Voucher: {purchase.voucherNo}</div>
          <div>{formatDateTime(purchase.createdAt)}</div>
          <div>Customer: {purchase.customerName || "Walk-in"}</div>
          {purchase.phone && <div>Phone: {purchase.phone}</div>}
          <div className="border-t border-dashed border-black my-1" />
          {items.map((it) => (
            <div key={it.id} className="mb-1">
              <div className="flex justify-between">
                <span>
                  {(it.metal ?? "gold") === "silver" ? `${it.silverPurity ?? 999} Slv` : `${it.karat}K`}{" "}
                  {formatWeightDual(it.weightGrams)}
                </span>
                <span>{formatPKR(it.value)}</span>
              </div>
              {it.notes && <div className="text-[10px] text-gray-600">{it.notes}</div>}
              <div className="text-[10px] text-gray-600">@ {formatPKR(it.buyRatePerTola)}/tola</div>
            </div>
          ))}
          <div className="border-t border-dashed border-black my-1" />
          <div className="flex justify-between"><span>Total weight</span><span>{purchase.totalWeight.toFixed(3)} g</span></div>
          <div className="flex justify-between font-bold"><span>TOTAL</span><span>{formatPKR(purchase.totalValue)}</span></div>
          <div className="flex justify-between"><span>Paid ({purchase.method})</span><span>{formatPKR(purchase.paid)}</span></div>
          {purchase.notes && <div className="text-[10px] mt-1">Note: {purchase.notes}</div>}
          <div className="border-t border-dashed border-black my-1" />
          <div className="text-center">Customer Signature: ____________</div>
          <div className="text-center mt-2">Shukria!</div>
        </div>
      )}
    </div>
  );
}
