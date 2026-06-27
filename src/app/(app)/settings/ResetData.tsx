"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { resetDatabase } from "@/lib/dataActions";

export function ResetData() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function doReset() {
    setMsg(null);
    start(async () => {
      const res = await resetDatabase(confirm);
      if (res.ok) {
        setMsg({ ok: true, text: `Done. Safety backup saved: ${res.backup}` });
        setConfirm("");
        setOpen(false);
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  return (
    <section className="rounded-2xl bg-white ring-1 ring-red-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle size={18} className="text-red-600" />
        <h2 className="font-semibold text-red-700">Danger Zone — Reset Data</h2>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Clears all sales, invoices, customers, inventory, repairs, bookings, old-gold purchases,
        committees, expenses and ledgers (for a fresh start). Your shop profile, users, staff,
        suppliers, tax rules and rates are kept. A backup is taken automatically first.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg border border-red-300 text-red-600 text-sm font-semibold px-4 py-2 hover:bg-red-50"
        >
          Reset Business Data…
        </button>
      ) : (
        <div className="rounded-xl bg-red-50 p-4 space-y-2">
          <p className="text-sm text-red-700">
            This cannot be undone (except by restoring the backup). Type <b>RESET</b> to confirm:
          </p>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="RESET"
            className="w-40 rounded-lg border border-red-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button onClick={() => { setOpen(false); setConfirm(""); }} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              onClick={doReset}
              disabled={pending || confirm !== "RESET"}
              className="rounded-lg bg-red-600 text-white text-sm font-semibold px-4 py-2 hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Backing up & resetting…" : "Backup & Reset"}
            </button>
          </div>
        </div>
      )}
      {msg && <div className={`text-sm mt-3 ${msg.ok ? "text-success" : "text-red-600"}`}>{msg.text}</div>}
    </section>
  );
}
