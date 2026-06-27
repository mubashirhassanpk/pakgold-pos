"use client";

import { useState, useTransition } from "react";
import type { CurrentRate } from "@/lib/queries";
import { updateRates } from "@/lib/actions";
import { KARAT_PURITY } from "@/lib/constants";
import { formatPKR } from "@/lib/format";
import { gramsToTola } from "@/lib/units";
import { GRAMS_PER_TEN_GRAM } from "@/lib/constants";

const KARATS = [24, 22, 21, 18];

export function RateEditor({ initial }: { initial: CurrentRate[] }) {
  const byKarat = new Map(initial.map((r) => [r.karat, r]));
  const [rows, setRows] = useState(
    KARATS.map((k) => ({
      karat: k,
      sellPerTola: byKarat.get(k)?.sellPerTola ?? 0,
      buyPerTola: byKarat.get(k)?.buyPerTola ?? 0,
    }))
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [base24k, setBase24k] = useState(byKarat.get(24)?.sellPerTola ?? 0);

  /** Auto-fill all karats from a single 24K sell rate using purity factors. */
  function autoFillFrom24k() {
    setRows((prev) =>
      prev.map((r) => {
        const factor = KARAT_PURITY[r.karat]?.factor ?? r.karat / 24;
        return {
          ...r,
          sellPerTola: Math.round(base24k * factor),
          buyPerTola: Math.round(base24k * 0.984 * factor), // buyback ~1.6% below sell
        };
      })
    );
  }

  function set(karat: number, field: "sellPerTola" | "buyPerTola", val: number) {
    setRows((prev) => prev.map((r) => (r.karat === karat ? { ...r, [field]: val } : r)));
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      await updateRates(rows);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-5">
      {/* Quick fill */}
      <div className="rounded-2xl bg-navy-900 text-white p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-white/60 mb-1">24K Sell / tola</label>
          <input
            type="number"
            value={base24k || ""}
            onChange={(e) => setBase24k(Number(e.target.value))}
            className="w-44 rounded-lg bg-white/10 px-3 py-2 tnum outline-none ring-1 ring-white/20 focus:ring-gold"
          />
        </div>
        <button
          onClick={autoFillFrom24k}
          className="rounded-lg bg-gold text-navy-900 font-semibold px-4 py-2 hover:brightness-105"
        >
          Auto-fill all karats
        </button>
        <span className="text-xs text-white/50">
          Fills 22K/21K/18K from purity factors (916/875/750).
        </span>
      </div>

      {/* Editable table */}
      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Purity</th>
              <th className="px-4 py-3">Sell / tola</th>
              <th className="px-4 py-3">Buyback / tola</th>
              <th className="px-4 py-3">Per 10g (sell)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.karat}>
                <td className="px-4 py-3 font-semibold">
                  {r.karat}K
                  <span className="text-gray-400 font-normal ml-1">
                    ({KARAT_PURITY[r.karat]?.hallmark})
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={r.sellPerTola || ""}
                    onChange={(e) => set(r.karat, "sellPerTola", Number(e.target.value))}
                    className="w-36 rounded-lg border border-gray-200 px-3 py-1.5 tnum focus:border-gold outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={r.buyPerTola || ""}
                    onChange={(e) => set(r.karat, "buyPerTola", Number(e.target.value))}
                    className="w-36 rounded-lg border border-gray-200 px-3 py-1.5 tnum focus:border-gold outline-none"
                  />
                </td>
                <td className="px-4 py-3 text-gray-500 tnum">
                  {formatPKR(gramsToTola(GRAMS_PER_TEN_GRAM) * r.sellPerTola)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-gold text-navy-900 font-semibold px-6 py-2.5 hover:brightness-105 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Rates"}
        </button>
        {saved && <span className="text-success text-sm font-medium">✓ Rates updated</span>}
      </div>
    </div>
  );
}
