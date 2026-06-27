"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, KeyRound, AtSign } from "lucide-react";
import { createUser, setUserActive, setUserRole, resetUserPassword, updateUsername } from "@/lib/userActions";

interface UserRow {
  id: number;
  username: string;
  name: string;
  role: string;
  active: boolean;
}

const ROLES = ["owner", "manager", "accountant", "salesman"];

export function UsersManager({ initial, currentUserId }: { initial: UserRow[]; currentUserId: number }) {
  const [form, setForm] = useState({ username: "", name: "", role: "salesman", password: "" });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    start(async () => {
      const res = await fn();
      if (!res.ok && res.error) setError(res.error);
      else router.refresh();
    });
  }

  function add() {
    run(async () => {
      const res = await createUser(form);
      if (res.ok) setForm({ username: "", name: "", role: "salesman", password: "" });
      return res;
    });
  }

  function reset(id: number) {
    const pw = prompt("New password (min 6 characters):");
    if (pw) run(() => resetUserPassword(id, pw));
  }

  function rename(id: number, current: string) {
    const name = prompt("New username (letters, numbers, . _ -):", current);
    if (name && name.trim().toLowerCase() !== current) run(() => updateUsername(id, name));
  }

  return (
    <section className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
      <h2 className="font-semibold mb-4">Users &amp; Roles</h2>

      <div className="divide-y divide-gray-100">
        {initial.map((u) => (
          <div key={u.id} className="flex items-center gap-3 py-2.5">
            <div className="flex-1">
              <div className="text-sm font-medium">
                {u.name}
                {u.id === currentUserId && <span className="text-xs text-gold-700 ml-2">(you)</span>}
              </div>
              <div className="text-xs text-gray-500 font-mono">{u.username}</div>
            </div>
            <select
              value={u.role}
              onChange={(e) => run(() => setUserRole(u.id, e.target.value))}
              disabled={u.id === currentUserId}
              className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm capitalize disabled:opacity-50"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              onClick={() => rename(u.id, u.username)}
              title="Change username"
              className="text-gray-400 hover:text-navy-900"
            >
              <AtSign size={16} />
            </button>
            <button
              onClick={() => reset(u.id)}
              title="Reset password"
              className="text-gray-400 hover:text-navy-900"
            >
              <KeyRound size={16} />
            </button>
            <button
              onClick={() => run(() => setUserActive(u.id, !u.active))}
              disabled={u.id === currentUserId}
              className={`text-xs rounded-full px-2.5 py-1 font-medium disabled:opacity-50 ${
                u.active ? "bg-success/10 text-success" : "bg-gray-100 text-gray-500"
              }`}
            >
              {u.active ? "Active" : "Disabled"}
            </button>
          </div>
        ))}
      </div>

      {/* Add user */}
      <div className="mt-4 rounded-xl bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium mb-3">
          <UserPlus size={16} /> Add Staff Account
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Username"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm capitalize"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Password (min 6)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        <button
          onClick={add}
          disabled={pending}
          className="mt-3 rounded-lg bg-navy-900 text-white text-sm font-semibold px-4 py-2 hover:bg-navy-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Create User"}
        </button>
      </div>
    </section>
  );
}
