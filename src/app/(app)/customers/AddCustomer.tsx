"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { createCustomer } from "@/lib/customerActions";

export function AddCustomer() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", cnic: "", address: "", notes: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    setError("");
    start(async () => {
      const res = await createCustomer(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setForm({ name: "", phone: "", cnic: "", address: "", notes: "" });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-gold text-navy-900 font-semibold px-4 py-2 hover:brightness-105"
      >
        <UserPlus size={18} /> Add Customer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Customer</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone (WhatsApp)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                <Field label="CNIC" value={form.cnic} onChange={(v) => setForm({ ...form, cnic: v })} />
              </div>
              <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
              {error && <div className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{error}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={pending}
                  className="rounded-lg bg-gold text-navy-900 font-semibold px-5 py-2 text-sm hover:brightness-105 disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gold"
      />
    </div>
  );
}
