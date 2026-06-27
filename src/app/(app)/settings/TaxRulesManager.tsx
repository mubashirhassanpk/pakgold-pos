"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";
import { saveTaxRule, setActiveTaxRule, deleteTaxRule } from "@/lib/settingsActions";
import type { TaxBasis } from "@/lib/constants";

interface Rule {
  id: number;
  name: string;
  basis: string;
  ratePct: number | null;
  fixedAmount: number | null;
  active: boolean;
}

const BASIS: { value: TaxBasis; label: string }[] = [
  { value: "making_only", label: "On making charges only" },
  { value: "gold_plus_making", label: "On gold + making (value addition)" },
  { value: "total", label: "On full subtotal" },
  { value: "fixed", label: "Fixed amount per invoice" },
];

const emptyForm = { id: null as number | null, name: "", basis: "making_only" as TaxBasis, ratePct: 0, fixedAmount: 0 };

export function TaxRulesManager({ initial }: { initial: Rule[] }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  function edit(r: Rule) {
    setForm({
      id: r.id,
      name: r.name,
      basis: r.basis as TaxBasis,
      ratePct: r.ratePct ?? 0,
      fixedAmount: r.fixedAmount ?? 0,
    });
  }

  function save() {
    setError("");
    start(async () => {
      const res = await saveTaxRule(form.id, {
        name: form.name,
        basis: form.basis,
        ratePct: form.ratePct,
        fixedAmount: form.fixedAmount,
      });
      if (!res.ok) return setError(res.error);
      setForm(emptyForm);
      refresh();
    });
  }

  function activate(id: number | null) {
    start(async () => {
      await setActiveTaxRule(id);
      refresh();
    });
  }

  function remove(id: number) {
    start(async () => {
      await deleteTaxRule(id);
      refresh();
    });
  }

  return (
    <section className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold">Tax Rules</h2>
        <button onClick={() => activate(null)} className="text-xs text-gray-500 hover:text-red-600">
          Disable all tax
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        FBR schemes change — only the basis is fixed; you set the rate. The active rule applies to new bills.
      </p>

      <div className="divide-y divide-gray-100">
        {initial.map((r) => (
          <div key={r.id} className="flex items-center gap-3 py-2.5">
            <button onClick={() => activate(r.id)} title="Set active">
              {r.active ? (
                <CheckCircle2 size={20} className="text-success" />
              ) : (
                <Circle size={20} className="text-gray-300 hover:text-gold" />
              )}
            </button>
            <div className="flex-1">
              <div className="text-sm font-medium">{r.name}</div>
              <div className="text-xs text-gray-500">
                {BASIS.find((b) => b.value === r.basis)?.label} •{" "}
                {r.basis === "fixed" ? `Rs ${r.fixedAmount}` : `${r.ratePct}%`}
              </div>
            </div>
            <button onClick={() => edit(r)} className="text-gray-400 hover:text-navy-900">
              <Pencil size={16} />
            </button>
            <button onClick={() => remove(r.id)} className="text-gray-400 hover:text-red-500">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {initial.length === 0 && <div className="py-3 text-sm text-gray-400">No tax rules yet.</div>}
      </div>

      {/* Add / edit form */}
      <div className="mt-4 rounded-xl bg-gray-50 p-4">
        <div className="text-sm font-medium mb-3">{form.id ? "Edit Rule" : "Add Rule"}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Rule name"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <select
            value={form.basis}
            onChange={(e) => setForm({ ...form, basis: e.target.value as TaxBasis })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {BASIS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
          {form.basis === "fixed" ? (
            <input
              type="number"
              value={form.fixedAmount || ""}
              onChange={(e) => setForm({ ...form, fixedAmount: Number(e.target.value) })}
              placeholder="Fixed amount (Rs)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm tnum"
            />
          ) : (
            <input
              type="number"
              value={form.ratePct || ""}
              onChange={(e) => setForm({ ...form, ratePct: Number(e.target.value) })}
              placeholder="Rate %"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm tnum"
            />
          )}
        </div>
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        <div className="flex gap-2 mt-3">
          <button
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-navy-900 text-white text-sm font-semibold px-4 py-2 hover:bg-navy-800 disabled:opacity-60"
          >
            {form.id ? "Update" : "Add"}
          </button>
          {form.id && (
            <button onClick={() => setForm(emptyForm)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
