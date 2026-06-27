"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createCommittee } from "@/lib/committeeActions";

export function NewCommittee() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"gold" | "cash">("gold");
  const [name, setName] = useState("");
  const [totalMonths, setTotalMonths] = useState(11);
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [monthlyGrams, setMonthlyGrams] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setError("");
    start(async () => {
      const res = await createCommittee({
        name,
        type,
        totalMonths,
        monthlyAmount: type === "cash" ? monthlyAmount : 0,
        monthlyGrams: type === "gold" ? monthlyGrams : 0,
        startDate,
        notes,
      });
      if (!res.ok) return setError(res.error ?? "Failed");
      router.push(`/committees/${res.id}`);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-gold text-navy-900 font-semibold px-4 py-2.5 text-sm hover:brightness-105"
      >
        <Plus size={16} /> New Committee
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5 space-y-4">
      <h2 className="font-semibold">New Committee / BC</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Committee Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Eid Gold Committee 2026"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <div className="flex gap-2">
            {(["gold", "cash"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm capitalize ${
                  type === t ? "bg-navy-900 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Total Months</label>
          <input
            type="number"
            value={totalMonths || ""}
            onChange={(e) => setTotalMonths(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum"
          />
        </div>
        {type === "gold" ? (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Monthly Grams (per member)</label>
            <input
              type="number"
              step="0.001"
              value={monthlyGrams || ""}
              onChange={(e) => setMonthlyGrams(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Monthly Amount (per member)</label>
            <input
              type="number"
              value={monthlyAmount || ""}
              onChange={(e) => setMonthlyAmount(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum"
            />
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>
      {error && <div className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{error}</div>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-gold text-navy-900 font-semibold px-5 py-2 text-sm hover:brightness-105 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create Committee"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
      </div>
    </div>
  );
}
