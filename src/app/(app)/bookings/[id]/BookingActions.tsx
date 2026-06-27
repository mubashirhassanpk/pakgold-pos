"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBookingStatus, deliverAndBill } from "@/lib/bookingActions";
import { BOOKING_STATUSES } from "@/lib/constants";

export function BookingActions({
  id, status, billed, estimatedAmount, advance,
}: {
  id: number; status: string; billed: boolean; estimatedAmount: number; advance: number;
}) {
  const [pending, start] = useTransition();
  const [method, setMethod] = useState("cash");
  const [finalAmount, setFinalAmount] = useState(estimatedAmount);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  function change(s: string) {
    start(async () => { await setBookingStatus(id, s); router.refresh(); });
  }
  function deliver() {
    setMsg("");
    start(async () => {
      const res = await deliverAndBill(id, finalAmount, method);
      if (res.ok) { setMsg(`✓ Delivered & billed — ${res.invoiceNo}`); router.refresh(); }
      else setMsg(res.error);
    });
  }

  const balanceNow = Math.max(0, finalAmount - advance);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-gray-500 mb-2">Update Status</div>
        <div className="flex flex-wrap gap-2">
          {BOOKING_STATUSES.filter((s) => s !== "delivered").map((s) => (
            <button key={s} onClick={() => change(s)} disabled={pending || status === s || status === "delivered"}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize border transition-colors disabled:opacity-50 ${status === s ? "bg-navy-900 text-white border-navy-900" : "border-gray-200 hover:bg-gray-50"}`}>
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {status !== "delivered" && status !== "cancelled" && (
        <div className="rounded-xl bg-gold-50 p-4">
          <div className="text-sm font-medium mb-2">Deliver &amp; Bill</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Final Amount</label>
              <input type="number" value={finalAmount || ""} onChange={(e) => setFinalAmount(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <option value="cash">Cash</option><option value="card">Card</option><option value="jazzcash">JazzCash</option><option value="easypaisa">EasyPaisa</option><option value="bank">Bank</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-2">Balance to collect at delivery (after advance): <b>Rs {balanceNow.toLocaleString("en-PK")}</b></p>
          <button onClick={deliver} disabled={pending || billed} className="w-full rounded-lg bg-success text-white text-sm font-semibold py-2 hover:brightness-105 disabled:opacity-60">
            Mark Delivered &amp; Create Invoice
          </button>
        </div>
      )}
      {msg && <div className="text-sm text-success">{msg}</div>}
    </div>
  );
}
