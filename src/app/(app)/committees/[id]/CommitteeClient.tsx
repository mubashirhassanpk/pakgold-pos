"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Banknote, HandCoins, Check } from "lucide-react";
import {
  addMember,
  removeMember,
  recordInstallment,
  recordPayout,
  setCommitteeStatus,
} from "@/lib/committeeActions";

interface Member {
  id: number;
  name: string;
  phone: string | null;
  payoutMonth: number | null;
  paidCount: number;
  paidAmount: number;
  paidGrams: number;
  payoutTaken: boolean;
  paidMonths: number[];
}
interface Committee {
  id: number;
  type: "gold" | "cash";
  totalMonths: number;
  monthlyAmount: number;
  monthlyGrams: number;
  status: string;
}

export function CommitteeClient({
  committee,
  members,
  customers,
  sellRate,
}: {
  committee: Committee;
  members: Member[];
  customers: { id: number; name: string; phone: string | null }[];
  sellRate: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [active, setActive] = useState<null | { kind: "instalment" | "payout"; member: Member }>(null);

  const isGold = committee.type === "gold";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Members</h2>
        <div className="flex gap-2">
          {committee.status === "active" && (
            <button
              onClick={() =>
                start(async () => {
                  await setCommitteeStatus(committee.id, "completed");
                  router.refresh();
                })
              }
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs hover:bg-gray-200"
            >
              Mark completed
            </button>
          )}
        </div>
      </div>

      <AddMemberRow committeeId={committee.id} customers={customers} totalMonths={committee.totalMonths} />

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3 text-center">Payout Month</th>
              <th className="px-4 py-3 text-center">Paid</th>
              <th className="px-4 py-3 text-right">{isGold ? "Grams Saved" : "Amount Saved"}</th>
              <th className="px-4 py-3 text-center">Payout</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{m.name}</div>
                  {m.phone && <div className="text-xs text-gray-400">{m.phone}</div>}
                </td>
                <td className="px-4 py-3 text-center tnum">{m.payoutMonth ?? "—"}</td>
                <td className="px-4 py-3 text-center tnum">
                  {m.paidCount}/{committee.totalMonths}
                </td>
                <td className="px-4 py-3 text-right tnum">
                  {isGold ? `${m.paidGrams.toFixed(2)} g` : `Rs ${m.paidAmount.toLocaleString("en-PK")}`}
                </td>
                <td className="px-4 py-3 text-center">
                  {m.payoutTaken ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                      <Check size={13} /> Taken
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setActive({ kind: "instalment", member: m })}
                      className="flex items-center gap-1 rounded-lg bg-gold-50 text-gold-700 px-2.5 py-1.5 text-xs hover:bg-gold-100"
                    >
                      <Banknote size={13} /> Instalment
                    </button>
                    <button
                      onClick={() => setActive({ kind: "payout", member: m })}
                      className="flex items-center gap-1 rounded-lg bg-navy-900 text-white px-2.5 py-1.5 text-xs hover:brightness-110"
                    >
                      <HandCoins size={13} /> Payout
                    </button>
                    <button
                      onClick={() =>
                        start(async () => {
                          await removeMember(committee.id, m.id);
                          router.refresh();
                        })
                      }
                      disabled={pending}
                      className="rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No members yet — add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {active && (
        <EntryModal
          committee={committee}
          member={active.member}
          kind={active.kind}
          sellRate={sellRate}
          onClose={() => setActive(null)}
          onDone={() => {
            setActive(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AddMemberRow({
  committeeId,
  customers,
  totalMonths,
}: {
  committeeId: number;
  customers: { id: number; name: string; phone: string | null }[];
  totalMonths: number;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payoutMonth, setPayoutMonth] = useState<string>("");
  const [pending, start] = useTransition();
  const router = useRouter();

  function pickCustomer(idStr: string) {
    const c = customers.find((x) => String(x.id) === idStr);
    if (c) {
      setName(c.name);
      setPhone(c.phone ?? "");
    }
  }

  function submit() {
    if (!name.trim()) return;
    start(async () => {
      await addMember({
        committeeId,
        name,
        phone,
        payoutMonth: payoutMonth ? Number(payoutMonth) : null,
      });
      setName("");
      setPhone("");
      setPayoutMonth("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 p-4 grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
      <div className="sm:col-span-1">
        <label className="block text-xs text-gray-500 mb-1">From customer</label>
        <select
          onChange={(e) => pickCustomer(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
          defaultValue=""
        >
          <option value="">— pick —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Payout Month</label>
        <select
          value={payoutMonth}
          onChange={(e) => setPayoutMonth(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
        >
          <option value="">—</option>
          {Array.from({ length: totalMonths }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <button
        onClick={submit}
        disabled={pending || !name.trim()}
        className="flex items-center justify-center gap-1 rounded-lg bg-gold text-navy-900 font-semibold px-4 py-2 text-sm hover:brightness-105 disabled:opacity-50"
      >
        <UserPlus size={15} /> Add
      </button>
    </div>
  );
}

function EntryModal({
  committee,
  member,
  kind,
  sellRate,
  onClose,
  onDone,
}: {
  committee: Committee;
  member: Member;
  kind: "instalment" | "payout";
  sellRate: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const isGold = committee.type === "gold";
  const nextMonth = (() => {
    for (let m = 1; m <= committee.totalMonths; m++) if (!member.paidMonths.includes(m)) return m;
    return committee.totalMonths;
  })();

  const [monthNo, setMonthNo] = useState(kind === "instalment" ? nextMonth : member.payoutMonth ?? 1);
  const [amount, setAmount] = useState(
    kind === "instalment" ? (isGold ? 0 : committee.monthlyAmount) : 0
  );
  const [grams, setGrams] = useState(kind === "instalment" && isGold ? committee.monthlyGrams : 0);
  const [rate, setRate] = useState(sellRate);
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      if (kind === "instalment") {
        await recordInstallment({
          committeeId: committee.id,
          memberId: member.id,
          monthNo,
          amount,
          grams: isGold ? grams : 0,
          ratePerTola: isGold ? rate : 0,
          method,
          note,
        });
      } else {
        await recordPayout({
          committeeId: committee.id,
          memberId: member.id,
          monthNo,
          amount,
          grams: isGold ? grams : 0,
          method,
          note,
        });
      }
      onDone();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-5 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold capitalize">
          {kind} · {member.name}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Month</label>
            <select
              value={monthNo}
              onChange={(e) => setMonthNo(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
            >
              {Array.from({ length: committee.totalMonths }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Amount (Rs)</label>
            <input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum"
            />
          </div>
          {isGold && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rate / tola (22K)</label>
                <input
                  type="number"
                  value={rate || ""}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Grams</label>
                <input
                  type="number"
                  step="0.001"
                  value={grams || ""}
                  onChange={(e) => setGrams(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">Easypaisa</option>
              {kind === "payout" && <option value="gold">Gold</option>}
              {kind === "payout" && <option value="item">Item</option>}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </div>
        </div>
        {isGold && kind === "instalment" && (
          <p className="text-xs text-gray-400">
            Tip: leave Grams blank to auto-convert the rupee amount at the rate above.
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
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
  );
}
