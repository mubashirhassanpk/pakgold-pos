"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2, X } from "lucide-react";
import { createReturn, type ReturnLinePayload } from "@/lib/actions";
import { formatPKR } from "@/lib/format";

export interface ReturnableItem {
  itemId: number | null;
  description: string;
  metal: "gold" | "silver";
  karat: number;
  silverPurity: number | null;
  weightGrams: number;
  quantity: number;
  lineTotal: number;
}

export function ReturnButton({
  saleId,
  invoiceNo,
  items,
}: {
  saleId: number;
  invoiceNo: string;
  items: ReturnableItem[];
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("cash");
  // Per-row return quantity + refund amount, keyed by row index.
  const [rows, setRows] = useState(() =>
    items.map((it) => ({
      qty: 0,
      refund: 0,
      perPiece: it.quantity > 0 ? it.lineTotal / it.quantity : it.lineTotal,
    }))
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const totalRefund = rows.reduce((s, r) => s + (r.refund || 0), 0);

  function setQty(i: number, qty: number) {
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        const capped = Math.max(0, Math.min(qty, items[i].quantity));
        return { ...r, qty: capped, refund: Math.round(capped * r.perPiece * 100) / 100 };
      })
    );
  }
  function setRefund(i: number, refund: number) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, refund: Math.max(0, refund) } : r)));
  }

  function submit() {
    setMsg(null);
    const lines: ReturnLinePayload[] = rows
      .map((r, i) => ({
        itemId: items[i].itemId,
        description: items[i].description,
        metal: items[i].metal,
        karat: items[i].karat,
        silverPurity: items[i].silverPurity,
        weightGrams: items[i].weightGrams,
        quantity: r.qty,
        refundAmount: r.refund,
      }))
      .filter((l) => l.quantity > 0);
    if (lines.length === 0) {
      setMsg({ ok: false, text: "Enter a quantity to return for at least one item." });
      return;
    }
    start(async () => {
      const res = await createReturn({ saleId, lines, refundMethod: method });
      if (res.ok) {
        setMsg({
          ok: true,
          text: `Return ${res.returnNo} saved. Refund ${formatPKR(res.refundTotal)} (balance ${formatPKR(
            res.balanceApplied
          )}, cash ${formatPKR(res.cashRefund)}). Stock restored.`,
        });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-50"
      >
        <Undo2 size={16} /> Return / Refund
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold">Return items — {invoiceNo}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Set how many of each item to return. Returned pieces go back into stock; the refund is
              applied to the customer&apos;s balance first, then paid in cash.
            </p>

            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Sold Qty</th>
                  <th className="py-2 text-center">Return Qty</th>
                  <th className="py-2 text-right">Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="py-2">
                      <div className="font-medium">{it.description}</div>
                      <div className="text-xs text-gray-400">
                        {it.metal === "silver" ? `${it.silverPurity ?? 999} Ag` : `${it.karat}K`}
                      </div>
                    </td>
                    <td className="py-2 text-center tnum">{it.quantity}</td>
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        max={it.quantity}
                        value={rows[i].qty || ""}
                        onChange={(e) => setQty(i, Number(e.target.value))}
                        className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center tnum"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        value={rows[i].refund || ""}
                        onChange={(e) => setRefund(i, Number(e.target.value))}
                        className="w-28 rounded-lg border border-gray-200 px-2 py-1 text-right tnum"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Cash refund via</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div className="text-sm">
                Total refund: <span className="font-bold tnum">{formatPKR(totalRefund)}</span>
              </div>
            </div>

            {msg && <div className={`text-sm mt-3 ${msg.ok ? "text-success" : "text-red-600"}`}>{msg.text}</div>}

            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
                Close
              </button>
              <button
                onClick={submit}
                disabled={pending || totalRefund <= 0}
                className="rounded-lg bg-red-600 text-white font-semibold px-5 py-2 text-sm hover:brightness-110 disabled:opacity-50"
              >
                {pending ? "Processing…" : "Process Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
