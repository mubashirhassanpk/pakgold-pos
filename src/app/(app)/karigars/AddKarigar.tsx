"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Hammer, X } from "lucide-react";
import { createKarigar } from "@/lib/karigarActions";

const ROLES = ["karigar", "polisher", "salesman", "staff"];
const WAGE = ["monthly", "dehari", "commission", "mixed"];

export function AddKarigar() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const [f, setF] = useState({
    name: "", phone: "", cnic: "", role: "karigar", wageType: "monthly",
    monthlySalary: 0, dehariRate: 0, commissionPct: 0, notes: "",
  });

  function submit() {
    setError("");
    start(async () => {
      const res = await createKarigar(f);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-gold text-navy-900 font-semibold px-4 py-2 hover:brightness-105">
        <Hammer size={18} /> Add Karigar
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Karigar / Staff</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Name *" v={f.name} on={(v) => setF({ ...f, name: v })} wide />
              <F label="Phone" v={f.phone} on={(v) => setF({ ...f, phone: v })} />
              <F label="CNIC" v={f.cnic} on={(v) => setF({ ...f, cnic: v })} />
              <Sel label="Role" v={f.role} opts={ROLES} on={(v) => setF({ ...f, role: v })} />
              <Sel label="Wage Type" v={f.wageType} opts={WAGE} on={(v) => setF({ ...f, wageType: v })} />
              <N label="Monthly Salary" v={f.monthlySalary} on={(v) => setF({ ...f, monthlySalary: v })} />
              <N label="Dehari (per day)" v={f.dehariRate} on={(v) => setF({ ...f, dehariRate: v })} />
              <N label="Commission %" v={f.commissionPct} on={(v) => setF({ ...f, commissionPct: v })} />
              <F label="Notes" v={f.notes} on={(v) => setF({ ...f, notes: v })} wide />
            </div>
            {error && <div className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2 mt-3">{error}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={submit} disabled={pending} className="rounded-lg bg-gold text-navy-900 font-semibold px-5 py-2 text-sm hover:brightness-105 disabled:opacity-60">{pending ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function F({ label, v, on, wide }: { label: string; v: string; on: (x: string) => void; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input value={v} onChange={(e) => on(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
    </div>
  );
}
function N({ label, v, on }: { label: string; v: number; on: (x: number) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="number" value={v || ""} onChange={(e) => on(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum" />
    </div>
  );
}
function Sel({ label, v, opts, on }: { label: string; v: string; opts: string[]; on: (x: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select value={v} onChange={(e) => on(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm capitalize">
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
