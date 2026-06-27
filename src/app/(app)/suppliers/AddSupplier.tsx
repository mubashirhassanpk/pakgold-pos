"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck, X } from "lucide-react";
import { createSupplier } from "@/lib/supplierActions";

export function AddSupplier() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const [f, setF] = useState({ name: "", phone: "", cnic: "", notes: "" });

  function submit() {
    setError("");
    start(async () => {
      const res = await createSupplier(f);
      if (!res.ok) return setError(res.error);
      setF({ name: "", phone: "", cnic: "", notes: "" });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-gold text-navy-900 font-semibold px-4 py-2 hover:brightness-105">
        <Truck size={18} /> Add Supplier
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Supplier</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <F label="Name *" v={f.name} on={(v) => setF({ ...f, name: v })} />
              <div className="grid grid-cols-2 gap-3">
                <F label="Phone" v={f.phone} on={(v) => setF({ ...f, phone: v })} />
                <F label="CNIC / NTN" v={f.cnic} on={(v) => setF({ ...f, cnic: v })} />
              </div>
              <F label="Notes" v={f.notes} on={(v) => setF({ ...f, notes: v })} />
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

function F({ label, v, on }: { label: string; v: string; on: (x: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input value={v} onChange={(e) => on(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
    </div>
  );
}
