"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { addSupplierEntry, deleteSupplierEntry } from "@/lib/supplierActions";
import { SUPPLIER_ADD_KINDS } from "@/lib/constants";
import { formatPKR, formatDateTime } from "@/lib/format";

interface Entry { id: number; kind: string; amount: number; note: string | null; entryDate: number }
const KINDS = ["purchase", "opening", "payment", "return"];
const isAdd = (k: string) => (SUPPLIER_ADD_KINDS as readonly string[]).includes(k);

export function SupplierLedger({ supplierId, balance, entries }: { supplierId: number; balance: number; entries: Entry[] }) {
  const [kind, setKind] = useState("purchase");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function add(k = kind, amt = amount, nt = note) {
    setError("");
    start(async () => {
      const res = await addSupplierEntry(supplierId, { kind: k, amount: amt, note: nt, entryDate: date || undefined });
      if (!res.ok) return setError(res.error);
      setAmount(0); setNote("");
      router.refresh();
    });
  }
  function payFull() { if (balance > 0) add("payment", balance, "Full settlement"); }
  function remove(id: number) {
    if (!confirm("Delete this entry?")) return;
    start(async () => { await deleteSupplierEntry(id, supplierId); router.refresh(); });
  }

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl p-5 ring-1 ring-black/5 flex items-center justify-between ${balance > 0 ? "bg-red-50" : "bg-white"}`}>
        <div>
          <div className="text-xs text-gray-500">Balance Payable (we owe)</div>
          <div className={`text-2xl font-bold tnum ${balance > 0 ? "text-red-600" : "text-gray-400"}`}>
            {balance > 0 ? formatPKR(balance) : balance < 0 ? `${formatPKR(-balance)} advance` : "Clear"}
          </div>
        </div>
        {balance > 0 && <button onClick={payFull} disabled={pending} className="rounded-lg bg-success text-white text-sm font-semibold px-4 py-2 hover:brightness-105 disabled:opacity-60">Pay Full</button>}
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 p-4">
        <div className="text-sm font-medium mb-3">Add Entry</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-2 text-sm capitalize">
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Amount" className="rounded-lg border border-gray-200 px-2 py-2 text-sm tnum" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (e.g. bill #)" className="col-span-2 rounded-lg border border-gray-200 px-2 py-2 text-sm" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-2 text-sm" />
        </div>
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        <button onClick={() => add()} disabled={pending || amount <= 0} className="mt-3 rounded-lg bg-navy-900 text-white text-sm font-semibold px-4 py-2 hover:bg-navy-800 disabled:opacity-50">{pending ? "Saving…" : "Add"}</button>
        <p className="text-xs text-gray-400 mt-2">Purchase/opening increase what you owe. Payment/return reduce it.</p>
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Ledger</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Note</th><th className="px-4 py-2 text-right">Amount</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2 text-gray-500">{formatDateTime(e.entryDate)}</td>
                <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${isAdd(e.kind) ? "bg-red-50 text-red-600" : "bg-success/10 text-success"}`}>{e.kind}</span></td>
                <td className="px-4 py-2 text-gray-600">{e.note || "—"}</td>
                <td className={`px-4 py-2 text-right tnum font-semibold ${isAdd(e.kind) ? "text-red-600" : "text-success"}`}>{isAdd(e.kind) ? "+" : "−"} {formatPKR(e.amount)}</td>
                <td className="px-2 py-2 text-right"><button onClick={() => remove(e.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={15} /></button></td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
