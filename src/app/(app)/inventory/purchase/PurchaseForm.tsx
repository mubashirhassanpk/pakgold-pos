"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createPurchase, type PurchaseLine } from "@/lib/inventoryActions";
import { KARAT_PURITY, type MakingType } from "@/lib/constants";
import { formatPKR } from "@/lib/format";

const KARATS = [24, 22, 21, 18];
const uid = () => Math.random().toString(36).slice(2, 9);

interface Row extends PurchaseLine {
  key: string;
}

function blank(): Row {
  return {
    key: uid(),
    nameEn: "",
    categoryId: null,
    metal: "gold",
    karat: 22,
    silverPurity: 925,
    grossWeight: 0,
    netWeight: 0,
    makingType: "per_gram",
    makingValue: 0,
    wastageType: "charge_pct",
    wastageValue: 0,
    costPrice: 0,
    quantity: 1,
  };
}

export function PurchaseForm({ categories }: { categories: { id: number; nameEn: string }[] }) {
  const [supplier, setSupplier] = useState("");
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  const totalCost = rows.reduce((s, r) => s + (r.costPrice ?? 0) * (r.quantity ?? 1), 0);

  function submit() {
    setError("");
    const valid = rows.filter((r) => r.nameEn.trim());
    if (!supplier.trim()) return setError("Enter supplier name");
    if (valid.length === 0) return setError("Add at least one item with a name");
    start(async () => {
      const res = await createPurchase(
        supplier,
        valid.map(({ key, ...rest }) => rest)
      );
      if (!res.ok) return setError(res.error ?? "Failed");
      router.push("/inventory");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
        <label className="block text-xs text-gray-500 mb-1">Supplier *</label>
        <input
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          placeholder="Supplier / wholesaler name"
          className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-gray-50 text-gray-500 text-left text-xs">
            <tr>
              <th className="px-3 py-2">Item Name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Metal</th>
              <th className="px-3 py-2">Purity</th>
              <th className="px-3 py-2">Net (g)</th>
              <th className="px-3 py-2">Making/g</th>
              <th className="px-3 py-2">Cost (Rs)</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="px-3 py-2">
                  <input
                    value={r.nameEn}
                    onChange={(e) => update(r.key, { nameEn: e.target.value })}
                    placeholder="e.g. 22K Ring"
                    className="w-40 rounded border border-gray-200 px-2 py-1.5"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={r.categoryId ?? ""}
                    onChange={(e) => update(r.key, { categoryId: e.target.value ? Number(e.target.value) : null })}
                    className="rounded border border-gray-200 px-2 py-1.5"
                  >
                    <option value="">—</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.nameEn}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={r.metal ?? "gold"}
                    onChange={(e) => update(r.key, { metal: e.target.value as "gold" | "silver" })}
                    className="rounded border border-gray-200 px-2 py-1.5"
                  >
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  {(r.metal ?? "gold") === "silver" ? (
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={r.silverPurity ?? ""}
                      onChange={(e) => update(r.key, { silverPurity: Number(e.target.value) })}
                      placeholder="999"
                      className="w-20 rounded border border-gray-200 px-2 py-1.5 tnum"
                      title="Silver fineness"
                    />
                  ) : (
                    <select
                      value={r.karat}
                      onChange={(e) => update(r.key, { karat: Number(e.target.value) })}
                      className="rounded border border-gray-200 px-2 py-1.5"
                    >
                      {KARATS.map((k) => (
                        <option key={k} value={k}>{k}K</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={r.netWeight || ""}
                    onChange={(e) =>
                      update(r.key, { netWeight: Number(e.target.value), grossWeight: Number(e.target.value) })
                    }
                    className="w-20 rounded border border-gray-200 px-2 py-1.5 tnum"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={r.makingValue || ""}
                    onChange={(e) => update(r.key, { makingValue: Number(e.target.value), makingType: "per_gram" as MakingType })}
                    className="w-20 rounded border border-gray-200 px-2 py-1.5 tnum"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={r.costPrice || ""}
                    onChange={(e) => update(r.key, { costPrice: Number(e.target.value) })}
                    className="w-24 rounded border border-gray-200 px-2 py-1.5 tnum"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={r.quantity || ""}
                    onChange={(e) => update(r.key, { quantity: Number(e.target.value) })}
                    className="w-14 rounded border border-gray-200 px-2 py-1.5 tnum"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setRows((p) => (p.length > 1 ? p.filter((x) => x.key !== r.key) : p))}
                    className="text-gray-300 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => setRows((p) => [...p, blank()])}
          className="flex items-center gap-1 rounded-lg bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
        >
          <Plus size={16} /> Add Row
        </button>
        <div className="text-sm text-gray-600">
          Total cost: <span className="font-bold tnum">{formatPKR(totalCost)}</span>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{error}</div>}

      <button
        onClick={submit}
        disabled={pending}
        className="rounded-lg bg-gold text-navy-900 font-semibold px-6 py-2.5 hover:brightness-105 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Purchase & Add to Stock"}
      </button>
    </div>
  );
}
