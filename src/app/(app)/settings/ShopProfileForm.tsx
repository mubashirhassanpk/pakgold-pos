"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/lib/settingsActions";

const FIELDS: { key: string; label: string; urdu?: boolean; full?: boolean }[] = [
  { key: "shop_name_en", label: "Shop Name (English)" },
  { key: "shop_name_ur", label: "Shop Name (Urdu)", urdu: true },
  { key: "address", label: "Address", full: true },
  { key: "phone", label: "Phone" },
  { key: "invoice_prefix", label: "Invoice Prefix" },
  { key: "ntn", label: "NTN (prints on invoice)" },
  { key: "strn", label: "STRN (prints on invoice)" },
  { key: "footer_terms_en", label: "Receipt Footer (English)", full: true },
  { key: "footer_terms_ur", label: "Receipt Footer (Urdu)", urdu: true, full: true },
];

export function ShopProfileForm({ initial }: { initial: Record<string, string> }) {
  const [form, setForm] = useState<Record<string, string>>(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    start(async () => {
      await saveSettings(form);
      setSaved(true);
    });
  }

  return (
    <section className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
      <h2 className="font-semibold mb-4">Shop Profile</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
            <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
            <input
              value={form[f.key] ?? ""}
              onChange={(e) => {
                setForm({ ...form, [f.key]: e.target.value });
                setSaved(false);
              }}
              dir={f.urdu ? "rtl" : "ltr"}
              className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gold ${
                f.urdu ? "urdu" : ""
              }`}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-gold text-navy-900 font-semibold px-5 py-2 text-sm hover:brightness-105 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Profile"}
        </button>
        {saved && <span className="text-success text-sm">✓ Saved</span>}
      </div>
    </section>
  );
}
