"use client";

import { useState, useTransition } from "react";
import type { CurrentSilverRate } from "@/lib/queries";
import { updateSilverRates } from "@/lib/actions";
import { SILVER_PURITY_PRESETS, silverPurityFactor, TOLA_PER_KG } from "@/lib/constants";
import { formatPKR } from "@/lib/format";

/** Finenesses shown by default in the editor. */
const ROWS = SILVER_PURITY_PRESETS.slice(0, 3).map((p) => p.fineness); // 999, 925, 900

interface Row {
  fineness: number;
  sellPerTola: number;
  buyPerTola: number;
  sellPerKg: number;
  buyPerKg: number;
}

/** Keep per-tola and per-kg in lockstep: 1 kg = TOLA_PER_KG tola. */
function syncFromTola(sellPerTola: number, buyPerTola: number) {
  return {
    sellPerKg: Math.round(sellPerTola * TOLA_PER_KG),
    buyPerKg: Math.round(buyPerTola * TOLA_PER_KG),
  };
}
function syncFromKg(sellPerKg: number, buyPerKg: number) {
  return {
    sellPerTola: Math.round(sellPerKg / TOLA_PER_KG),
    buyPerTola: Math.round(buyPerKg / TOLA_PER_KG),
  };
}

export function SilverRateEditor({ initial }: { initial: CurrentSilverRate[] }) {
  const byFineness = new Map(initial.map((r) => [r.fineness, r]));
  const [rows, setRows] = useState<Row[]>(
    ROWS.map((f) => {
      const r = byFineness.get(f);
      return {
        fineness: f,
        sellPerTola: r?.sellPerTola ?? 0,
        buyPerTola: r?.buyPerTola ?? 0,
        sellPerKg: r?.sellPerKg ?? 0,
        buyPerKg: r?.buyPerKg ?? 0,
      };
    })
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [base999, setBase999] = useState(byFineness.get(999)?.sellPerTola ?? 0);

  /** Auto-fill 925/900 from a single 999 sell-per-tola using purity factors. */
  function autoFillFrom999() {
    setRows((prev) =>
      prev.map((r) => {
        const factor = silverPurityFactor(r.fineness) / silverPurityFactor(999);
        const sellPerTola = Math.round(base999 * factor);
        const buyPerTola = Math.round(base999 * 0.97 * factor); // ~3% buyback spread
        return { ...r, sellPerTola, buyPerTola, ...syncFromTola(sellPerTola, buyPerTola) };
      })
    );
    setSaved(false);
  }

  function setTola(fineness: number, field: "sellPerTola" | "buyPerTola", val: number) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.fineness !== fineness) return r;
        const next = { ...r, [field]: val };
        return { ...next, ...syncFromTola(next.sellPerTola, next.buyPerTola) };
      })
    );
    setSaved(false);
  }

  function setKg(fineness: number, field: "sellPerKg" | "buyPerKg", val: number) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.fineness !== fineness) return r;
        const next = { ...r, [field]: val };
        return { ...next, ...syncFromKg(next.sellPerKg, next.buyPerKg) };
      })
    );
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      await updateSilverRates(rows);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Silver (Chandi) Rates</h2>
        <p className="text-sm text-gray-500">
          Set today&apos;s SELL and BUYBACK per tola and per kg. <span className="urdu">چاندی کا ریٹ</span>
        </p>
      </div>

      {/* Quick fill */}
      <div className="rounded-2xl bg-slate-700 text-white p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-white/60 mb-1">999 Sell / tola</label>
          <input
            type="number"
            value={base999 || ""}
            onChange={(e) => setBase999(Number(e.target.value))}
            className="w-44 rounded-lg bg-white/10 px-3 py-2 tnum outline-none ring-1 ring-white/20 focus:ring-slate-300"
          />
        </div>
        <button
          onClick={autoFillFrom999}
          className="rounded-lg bg-slate-200 text-slate-900 font-semibold px-4 py-2 hover:brightness-105"
        >
          Auto-fill 925 / 900
        </button>
        <span className="text-xs text-white/50">
          Per-kg is kept in sync automatically (1 kg = {TOLA_PER_KG.toFixed(3)} tola).
        </span>
      </div>

      {/* Editable table */}
      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Fineness</th>
              <th className="px-4 py-3">Sell / tola</th>
              <th className="px-4 py-3">Buyback / tola</th>
              <th className="px-4 py-3">Sell / kg</th>
              <th className="px-4 py-3">Buyback / kg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.fineness}>
                <td className="px-4 py-3 font-semibold">
                  {r.fineness}
                  <span className="text-gray-400 font-normal ml-1">
                    ({SILVER_PURITY_PRESETS.find((p) => p.fineness === r.fineness)?.label.split(" ")[1] ?? ""})
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={r.sellPerTola || ""}
                    onChange={(e) => setTola(r.fineness, "sellPerTola", Number(e.target.value))}
                    className="w-32 rounded-lg border border-gray-200 px-3 py-1.5 tnum focus:border-slate-400 outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={r.buyPerTola || ""}
                    onChange={(e) => setTola(r.fineness, "buyPerTola", Number(e.target.value))}
                    className="w-32 rounded-lg border border-gray-200 px-3 py-1.5 tnum focus:border-slate-400 outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={r.sellPerKg || ""}
                    onChange={(e) => setKg(r.fineness, "sellPerKg", Number(e.target.value))}
                    className="w-36 rounded-lg border border-gray-200 px-3 py-1.5 tnum focus:border-slate-400 outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={r.buyPerKg || ""}
                    onChange={(e) => setKg(r.fineness, "buyPerKg", Number(e.target.value))}
                    className="w-36 rounded-lg border border-gray-200 px-3 py-1.5 tnum focus:border-slate-400 outline-none"
                  />
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
          className="rounded-lg bg-slate-700 text-white font-semibold px-6 py-2.5 hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Silver Rates"}
        </button>
        {saved && <span className="text-success text-sm font-medium">✓ Silver rates updated</span>}
        <span className="text-xs text-gray-400 tnum">
          999 sell/tola ≈ {formatPKR(rows[0]?.sellPerTola ?? 0)}
        </span>
      </div>
    </div>
  );
}
