"use client";

import { useMemo, useRef, useState } from "react";
import { ScanLine, RotateCcw, CheckCircle2, AlertTriangle, Printer } from "lucide-react";

interface Item {
  id: number;
  barcode: string;
  nameEn: string;
  karat: number;
  netWeight: number;
}

export function StockAudit({ items, shopName }: { items: Item[]; shopName: string }) {
  const byBarcode = useMemo(() => new Map(items.map((i) => [i.barcode.toLowerCase(), i])), [items]);
  const [counted, setCounted] = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<string[]>([]);
  const [scan, setScan] = useState("");
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const code = scan.trim();
    setScan("");
    if (!code) return;
    const item = byBarcode.get(code.toLowerCase());
    if (!item) {
      setUnknown((u) => (u.includes(code) ? u : [...u, code]));
      setFlash({ ok: false, msg: `Unknown barcode: ${code}` });
    } else if (counted.has(item.id)) {
      setFlash({ ok: false, msg: `Already counted: ${item.nameEn}` });
    } else {
      setCounted((c) => new Set(c).add(item.id));
      setFlash({ ok: true, msg: `✓ ${item.nameEn} (${item.karat}K)` });
    }
    inputRef.current?.focus();
  }

  function reset() {
    setCounted(new Set());
    setUnknown([]);
    setFlash(null);
    inputRef.current?.focus();
  }

  const missing = items.filter((i) => !counted.has(i.id));

  return (
    <div className="space-y-4">
      {/* Scan box */}
      <form onSubmit={submit} className="no-print bg-white rounded-2xl ring-1 ring-black/5 p-4">
        <div className="flex items-center gap-2 rounded-lg border-2 border-gold/40 px-3 py-3">
          <ScanLine size={20} className="text-gold-700" />
          <input
            ref={inputRef}
            autoFocus
            value={scan}
            onChange={(e) => setScan(e.target.value)}
            placeholder="Scan or type a barcode, then Enter…"
            className="flex-1 outline-none text-base"
          />
          <button type="button" onClick={reset} className="flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900">
            <RotateCcw size={15} /> Reset
          </button>
        </div>
        {flash && (
          <div className={`mt-2 text-sm font-medium ${flash.ok ? "text-success" : "text-red-600"}`}>{flash.msg}</div>
        )}
      </form>

      {/* Progress */}
      <div className="no-print grid grid-cols-3 gap-4">
        <Stat label="Counted" value={counted.size} tone="ok" icon={<CheckCircle2 size={16} />} />
        <Stat label="Missing" value={missing.length} tone={missing.length ? "warn" : "ok"} icon={<AlertTriangle size={16} />} />
        <Stat label="Unknown scans" value={unknown.length} tone={unknown.length ? "warn" : "muted"} icon={<ScanLine size={16} />} />
      </div>
      <div className="no-print text-xs text-gray-500">
        {counted.size}/{items.length} pieces verified.
        {missing.length === 0 && items.length > 0 && counted.size > 0 ? " ✅ Stock fully reconciled!" : ""}
      </div>

      {/* Unknown scans */}
      {unknown.length > 0 && (
        <div className="no-print rounded-2xl bg-red-50 ring-1 ring-red-100 p-4">
          <div className="text-sm font-semibold text-red-700 mb-1">Unknown barcodes (not in stock)</div>
          <div className="flex flex-wrap gap-2">
            {unknown.map((u) => <span key={u} className="rounded-lg bg-white px-2 py-1 text-xs font-mono">{u}</span>)}
          </div>
        </div>
      )}

      {/* Missing report (printable) */}
      <div className="flex items-center justify-between no-print">
        <h2 className="font-semibold">Missing pieces ({missing.length})</h2>
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-navy-900 text-white text-sm px-4 py-2 hover:bg-navy-800">
          <Printer size={16} /> Print Missing List
        </button>
      </div>
      <div id="print-area" className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-100 text-sm font-semibold">{shopName} — Stock Audit (missing)</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr><th className="px-4 py-2">Barcode</th><th className="px-4 py-2">Item</th><th className="px-4 py-2">Purity</th><th className="px-4 py-2 text-right">Net Wt</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {missing.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-2 font-mono text-xs">{i.barcode}</td>
                <td className="px-4 py-2">{i.nameEn}</td>
                <td className="px-4 py-2">{i.karat}K</td>
                <td className="px-4 py-2 text-right tnum">{i.netWeight} g</td>
              </tr>
            ))}
            {missing.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-success">All pieces accounted for 🎉</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, icon }: { label: string; value: number; tone: "ok" | "warn" | "muted"; icon: React.ReactNode }) {
  const c = tone === "ok" ? "text-success" : tone === "warn" ? "text-red-600" : "text-gray-400";
  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 p-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">{icon}{label}</div>
      <div className={`mt-1 text-2xl font-bold tnum ${c}`}>{value}</div>
    </div>
  );
}
