"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { addExpense } from "@/lib/expenseActions";

const CATEGORIES = ["Rent", "Utilities", "Salary", "Tea/Refreshment", "Transport", "Tools/Repair", "Marketing", "Misc"];

export function AddExpense() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const [f, setF] = useState({ category: "Misc", amount: 0, method: "cash", note: "", expenseDate: "" });

  function submit() {
    setError("");
    start(async () => {
      const res = await addExpense(f);
      if (!res.ok) return setError(res.error);
      setF({ category: "Misc", amount: 0, method: "cash", note: "", expenseDate: "" });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-gold text-navy-900 font-semibold px-4 py-2 hover:brightness-105">
        <Plus size={18} /> Add Expense
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Expense</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category</label>
                  <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Amount (Rs)</label>
                  <input type="number" value={f.amount || ""} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Paid via</label>
                  <select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="cash">Cash</option><option value="bank">Bank</option><option value="card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input type="date" value={f.expenseDate} onChange={(e) => setF({ ...f, expenseDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Note</label>
                <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              {error && <div className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{error}</div>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                <button onClick={submit} disabled={pending} className="rounded-lg bg-gold text-navy-900 font-semibold px-5 py-2 text-sm hover:brightness-105 disabled:opacity-60">{pending ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
