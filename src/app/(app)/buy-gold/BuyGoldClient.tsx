"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Printer, User, X } from "lucide-react";
import { computeOldGoldValue } from "@/lib/calculations";
import { toGrams } from "@/lib/units";
import { type WeightUnit, type Metal, silverPurityFactor } from "@/lib/constants";
import { formatPKR, formatWeightDual, formatDateTime } from "@/lib/format";
import { createOldGoldPurchase } from "@/lib/oldGoldActions";
import type { CurrentRate, CurrentSilverRate } from "@/lib/queries";

const KARATS = [24, 22, 21, 18];
const uid = () => Math.random().toString(36).slice(2, 9);

interface PickCustomer { id: number; name: string; phone: string | null }
interface Line {
  key: string;
  metal: Metal;
  weight: number;
  unit: WeightUnit;
  karat: number;
  silverPurity: number;
  notes: string;
}

export function BuyGoldClient({
  rates, silverRates, customers, settings, voucherNo,
}: {
  rates: CurrentRate[];
  silverRates: CurrentSilverRate[];
  customers: PickCustomer[];
  settings: Record<string, string>;
  voucherNo: string;
}) {
  const buyRate = (k: number) => rates.find((r) => r.karat === k)?.buyPerTola ?? 0;
  // Silver buy rate per tola, scaling the purest available row to typed fineness.
  const pureSilver = silverRates.find((r) => r.fineness === 999) ?? silverRates[0] ?? null;
  function silverBuyRate(fineness: number): number {
    const exact = silverRates.find((r) => r.fineness === fineness);
    if (exact) return exact.buyPerTola;
    if (!pureSilver) return 0;
    return Math.round((pureSilver.buyPerTola / pureSilver.purityFactor) * silverPurityFactor(fineness));
  }
  /** Per-line buyback rate for whichever metal the line is set to. */
  function lineRate(l: Line): number {
    return l.metal === "silver" ? silverBuyRate(l.silverPurity) : buyRate(l.karat);
  }
  const [lines, setLines] = useState<Line[]>([{ key: uid(), metal: "gold", weight: 0, unit: "gram", karat: 22, silverPurity: 925, notes: "" }]);
  const [customer, setCustomer] = useState<PickCustomer | null>(null);
  const [custSearch, setCustSearch] = useState("");
  const [walkName, setWalkName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("cash");
  const [paid, setPaid] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ voucherNo: string } | null>(null);

  const computed = lines.map((l) => {
    const grams = toGrams(l.weight, l.unit);
    return { line: l, grams, value: computeOldGoldValue(grams, lineRate(l)) };
  });
  const totalValue = computed.reduce((s, c) => s + c.value, 0);
  const totalGrams = computed.reduce((s, c) => s + c.grams, 0);
  const payNow = paid === null ? totalValue : paid;

  const matches = useMemo(() => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(custSearch.trim())).slice(0, 6);
  }, [custSearch, customers]);

  function setLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function save() {
    const valid = computed.filter((c) => c.grams > 0);
    if (valid.length === 0) return;
    start(async () => {
      const res = await createOldGoldPurchase({
        customerId: customer?.id ?? null,
        customerName: customer?.name ?? walkName,
        phone: customer?.phone ?? phone,
        method,
        paid: payNow,
        notes,
        lines: valid.map((c) => ({
          metal: c.line.metal,
          weightGrams: c.grams,
          karat: c.line.karat,
          silverPurity: c.line.metal === "silver" ? c.line.silverPurity : null,
          buyRatePerTola: lineRate(c.line),
          value: c.value,
          notes: c.line.notes,
        })),
      });
      if (res.ok) setDone({ voucherNo: res.voucherNo });
    });
  }

  if (done) {
    return (
      <div>
        <div className="no-print flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-success">✓ Purchase saved — {done.voucherNo}</h2>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-navy-900 text-white px-4 py-2"><Printer size={16}/> Print Voucher</button>
            <button onClick={() => window.location.reload()} className="rounded-lg bg-gold text-navy-900 font-semibold px-4 py-2">New Purchase</button>
          </div>
        </div>
        <div id="print-area" className="mx-auto bg-white p-4 ring-1 ring-black/10" style={{ width: "80mm", fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
          <div className="text-center">
            <div className="font-bold text-base">{settings.shop_name_en || "PakGold"}</div>
            {settings.shop_name_ur && <div className="urdu">{settings.shop_name_ur}</div>}
            <div className="font-semibold mt-1">OLD GOLD PURCHASE VOUCHER</div>
          </div>
          <div className="border-t border-dashed border-black my-1" />
          <div>Voucher: {done.voucherNo}</div>
          <div>{formatDateTime(Date.now())}</div>
          <div>Customer: {customer?.name || walkName || "Walk-in"}</div>
          <div className="border-t border-dashed border-black my-1" />
          {computed.filter((c) => c.grams > 0).map((c) => (
            <div key={c.line.key} className="flex justify-between">
              <span>{c.line.metal === "silver" ? `${c.line.silverPurity} Slv` : `${c.line.karat}K`} {c.grams.toFixed(3)}g</span>
              <span>{formatPKR(c.value)}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-black my-1" />
          <div className="flex justify-between font-bold"><span>TOTAL</span><span>{formatPKR(totalValue)}</span></div>
          <div className="flex justify-between"><span>Paid ({method})</span><span>{formatPKR(payNow)}</span></div>
          <div className="border-t border-dashed border-black my-1" />
          <div className="text-center">Customer Signature: ____________</div>
          <div className="text-center mt-2">Shukria!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-2xl bg-white ring-1 ring-black/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Items received <span className="urdu text-gray-400 text-sm">پرانا سونا</span></h2>
          <span className="text-xs text-gray-400 font-mono">{voucherNo}</span>
        </div>
        {computed.map(({ line, grams, value }) => (
          <div key={line.key} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-12 sm:col-span-2 inline-flex rounded-lg ring-1 ring-gray-200 overflow-hidden text-xs w-max">
              <button
                type="button"
                onClick={() => setLine(line.key, { metal: "gold" })}
                className={`px-2.5 py-1 font-medium ${line.metal === "gold" ? "bg-gold text-navy-900" : "bg-white text-gray-500"}`}
              >Gold</button>
              <button
                type="button"
                onClick={() => setLine(line.key, { metal: "silver" })}
                className={`px-2.5 py-1 font-medium ${line.metal === "silver" ? "bg-slate-400 text-white" : "bg-white text-gray-500"}`}
              >Silver</button>
            </div>
            <div className="col-span-3 flex gap-1">
              <input type="number" value={line.weight || ""} onChange={(e) => setLine(line.key, { weight: Number(e.target.value) })} placeholder="Weight" className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm tnum" />
              <select value={line.unit} onChange={(e) => setLine(line.key, { unit: e.target.value as WeightUnit })} className="rounded-lg border border-gray-200 px-1 text-xs">
                <option value="gram">g</option><option value="tola">tola</option><option value="masha">masha</option>
                {line.metal === "silver" && <option value="kg">kg</option>}
              </select>
            </div>
            {line.metal === "gold" ? (
              <select value={line.karat} onChange={(e) => setLine(line.key, { karat: Number(e.target.value) })} className="col-span-2 rounded-lg border border-gray-200 px-2 py-2 text-sm">
                {KARATS.map((k) => <option key={k} value={k}>{k}K</option>)}
              </select>
            ) : (
              <input type="number" min={0} max={1000} value={line.silverPurity || ""} onChange={(e) => setLine(line.key, { silverPurity: Number(e.target.value) })} placeholder="999" className="col-span-2 rounded-lg border border-gray-200 px-2 py-2 text-sm tnum" />
            )}
            <input value={line.notes} onChange={(e) => setLine(line.key, { notes: e.target.value })} placeholder="Item name / touch / notes" className="col-span-3 rounded-lg border border-gray-200 px-2 py-2 text-sm" />
            <div className="col-span-3 sm:col-span-1 text-right text-sm tnum">
              <div className="font-semibold">{formatPKR(value)}</div>
              <div className="text-[10px] text-gray-400">@ {formatPKR(lineRate(line))}/tola</div>
            </div>
            <button onClick={() => setLines((p) => (p.length > 1 ? p.filter((x) => x.key !== line.key) : p))} className="col-span-1 text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
          </div>
        ))}
        <button onClick={() => setLines((p) => [...p, { key: uid(), metal: "gold", weight: 0, unit: "gram", karat: 22, silverPurity: 925, notes: "" }])} className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200"><Plus size={15} /> Add Item</button>
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 p-4 flex flex-col">
        {/* customer */}
        {customer ? (
          <div className="flex items-center justify-between rounded-lg bg-gold-50 px-3 py-2 mb-3">
            <span className="text-sm flex items-center gap-2"><User size={14} className="text-gold-700" /> {customer.name}</span>
            <button onClick={() => setCustomer(null)} className="text-gray-400 hover:text-red-500"><X size={15} /></button>
          </div>
        ) : (
          <div className="relative mb-3">
            <input value={custSearch || walkName} onChange={(e) => { setCustSearch(e.target.value); setWalkName(e.target.value); }} placeholder="Customer name (search or new)" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            {matches.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg border border-gray-100 bg-white shadow-lg">
                {matches.map((c) => (
                  <button key={c.id} onClick={() => { setCustomer(c); setCustSearch(""); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gold-50 flex justify-between"><span>{c.name}</span><span className="text-xs text-gray-400">{c.phone}</span></button>
                ))}
              </div>
            )}
          </div>
        )}
        {!customer && <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-3" />}

        <div className="mt-auto space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Total weight</span><span className="tnum">{totalGrams.toFixed(3)} g</span></div>
          <div className="flex items-center justify-between border-t border-gray-200 pt-2">
            <span className="font-bold">Total Value</span>
            <span className="text-xl font-extrabold text-navy-900">{formatPKR(totalValue)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-2 text-sm">
              <option value="cash">Cash</option><option value="bank">Bank</option><option value="jazzcash">JazzCash</option><option value="easypaisa">EasyPaisa</option>
            </select>
            <input type="number" value={paid === null ? "" : paid} onChange={(e) => setPaid(e.target.value === "" ? null : Number(e.target.value))} placeholder={`Paid ${formatPKR(totalValue)}`} className="rounded-lg border border-gray-200 px-2 py-2 text-sm tnum" />
          </div>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm" />
          <button onClick={save} disabled={pending || totalValue <= 0} className="w-full mt-1 rounded-xl bg-gold text-navy-900 font-bold py-3 hover:brightness-105 disabled:opacity-50">
            {pending ? "Saving…" : `Buy — ${formatPKR(totalValue)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
