"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { updateRoleAccess } from "@/lib/userActions";

interface Area {
  key: string;
  label: string;
}

const ROLE_LABELS: Record<string, string> = {
  manager: "Manager",
  accountant: "Accountant",
  salesman: "Salesman",
};

export function RolePermissions({
  areas,
  roles,
  initial,
}: {
  areas: Area[];
  roles: string[];
  initial: Record<string, string[]>;
}) {
  const [grid, setGrid] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(roles.map((r) => [r, new Set(initial[r] ?? [])]))
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle(role: string, area: string) {
    setGrid((prev) => {
      const next = new Set(prev[role]);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return { ...prev, [role]: next };
    });
  }

  function save() {
    setMsg(null);
    const config = Object.fromEntries(roles.map((r) => [r, Array.from(grid[r])]));
    start(async () => {
      const res = await updateRoleAccess(config);
      if (res.ok) {
        setMsg({ ok: true, text: "Permissions saved. Staff see only their allowed features." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: "Could not save permissions" });
      }
    });
  }

  return (
    <section className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={18} className="text-navy-900" />
        <h2 className="font-semibold">Roles &amp; Feature Access</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Tick which features each staff role can open. The Owner always has full access. Changes apply
        the next time staff load a page.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Feature</th>
              {roles.map((r) => (
                <th key={r} className="py-2 px-3 text-center">{ROLE_LABELS[r] ?? r}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {areas.map((a) => (
              <tr key={a.key} className="hover:bg-gray-50/60">
                <td className="py-2 pr-4">{a.label}</td>
                {roles.map((r) => (
                  <td key={r} className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={grid[r]?.has(a.key) ?? false}
                      onChange={() => toggle(r, a.key)}
                      className="h-4 w-4 accent-gold cursor-pointer"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {msg && <div className={`text-sm mt-3 ${msg.ok ? "text-success" : "text-red-600"}`}>{msg.text}</div>}

      <button
        onClick={save}
        disabled={pending}
        className="mt-4 rounded-lg bg-navy-900 text-white text-sm font-semibold px-4 py-2 hover:bg-navy-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Permissions"}
      </button>
    </section>
  );
}
