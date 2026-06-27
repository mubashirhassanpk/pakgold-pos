"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, X } from "lucide-react";
import { createBooking } from "@/lib/bookingActions";

interface PickCustomer { id: number; name: string; phone: string | null }
interface PickKarigar { id: number; name: string }
const KARATS = [24, 22, 21, 18];

export function AddBooking({ customers, karigars }: { customers: PickCustomer[]; karigars: PickKarigar[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const [custSearch, setCustSearch] = useState("");
  const [f, setF] = useState({
    customerId: null as number | null, customerName: "", phone: "",
    description: "", karat: 22 as number | null, estimatedWeight: 0, estimatedAmount: 0, advance: 0,
    expectedDate: "", notes: "", karigarId: null as number | null,
  });

  const matches = custSearch.trim()
    ? customers.filter((c) => c.name.toLowerCase().includes(custSearch.toLowerCase()) || (c.phone ?? "").includes(custSearch)).slice(0, 5)
    : [];

  function submit() {
    setError("");
    start(async () => {
      const res = await createBooking(f);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-gold text-navy-900 font-semibold px-4 py-2 hover:brightness-105">
        <CalendarPlus size={18} /> New Booking
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Advance Booking (Bayana)</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-xs text-gray-500 mb-1">Customer Name *</label>
                <input value={f.customerName} onChange={(e) => { setF({ ...f, customerName: e.target.value, customerId: null }); setCustSearch(e.target.value); }} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Search existing or type new" />
                {matches.length > 0 && !f.customerId && (
                  <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg border border-gray-100 bg-white shadow-lg">
                    {matches.map((c) => (
                      <button key={c.id} onClick={() => { setF({ ...f, customerId: c.id, customerName: c.name, phone: c.phone ?? "" }); setCustSearch(""); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gold-50 flex justify-between"><span>{c.name}</span><span className="text-xs text-gray-400">{c.phone}</span></button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" v={f.phone} on={(v) => setF({ ...f, phone: v })} />
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Karat</label>
                  <select value={f.karat ?? ""} onChange={(e) => setF({ ...f, karat: e.target.value ? Number(e.target.value) : null })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="">—</option>{KARATS.map((k) => <option key={k} value={k}>{k}K</option>)}
                  </select>
                </div>
              </div>
              <Field label="What to make / Description *" v={f.description} on={(v) => setF({ ...f, description: v })} />
              <div className="grid grid-cols-3 gap-3">
                <Num label="Est. Weight (g)" v={f.estimatedWeight} on={(v) => setF({ ...f, estimatedWeight: v })} />
                <Num label="Est. Amount (Rs)" v={f.estimatedAmount} on={(v) => setF({ ...f, estimatedAmount: v })} />
                <Num label="Advance / Bayana" v={f.advance} on={(v) => setF({ ...f, advance: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expected Date" v={f.expectedDate} on={(v) => setF({ ...f, expectedDate: v })} type="date" />
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Karigar (optional)</label>
                  <select value={f.karigarId ?? ""} onChange={(e) => setF({ ...f, karigarId: e.target.value ? Number(e.target.value) : null })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="">— none —</option>{karigars.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                </div>
              </div>
              <Field label="Notes" v={f.notes} on={(v) => setF({ ...f, notes: v })} />
              {error && <div className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{error}</div>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                <button onClick={submit} disabled={pending} className="rounded-lg bg-gold text-navy-900 font-semibold px-5 py-2 text-sm hover:brightness-105 disabled:opacity-60">{pending ? "Saving…" : "Create Booking"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, v, on, type = "text" }: { label: string; v: string; on: (x: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={v} onChange={(e) => on(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
    </div>
  );
}
function Num({ label, v, on }: { label: string; v: number; on: (x: number) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="number" value={v || ""} onChange={(e) => on(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum" />
    </div>
  );
}
