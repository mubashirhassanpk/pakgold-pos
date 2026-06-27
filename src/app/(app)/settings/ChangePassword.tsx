"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { changePassword } from "@/lib/authActions";

export function ChangePassword() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setMsg(null);
    if (form.next !== form.confirm) {
      setMsg({ ok: false, text: "New password and confirmation do not match" });
      return;
    }
    start(async () => {
      const res = await changePassword(form.current, form.next);
      if (res.ok) {
        setMsg({ ok: true, text: "Password updated." });
        setForm({ current: "", next: "", confirm: "" });
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  return (
    <section className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound size={18} className="text-navy-900" />
        <h2 className="font-semibold">Change My Password</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="password"
          autoComplete="current-password"
          value={form.current}
          onChange={(e) => setForm({ ...form, current: e.target.value })}
          placeholder="Current password"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="password"
          autoComplete="new-password"
          value={form.next}
          onChange={(e) => setForm({ ...form, next: e.target.value })}
          placeholder="New password (min 6)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          placeholder="Confirm new password"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>
      {msg && <div className={`text-sm mt-3 ${msg.ok ? "text-success" : "text-red-600"}`}>{msg.text}</div>}
      <button
        onClick={submit}
        disabled={pending || !form.current || !form.next}
        className="mt-3 rounded-lg bg-navy-900 text-white text-sm font-semibold px-4 py-2 hover:bg-navy-800 disabled:opacity-60"
      >
        {pending ? "Updating…" : "Update Password"}
      </button>
    </section>
  );
}
