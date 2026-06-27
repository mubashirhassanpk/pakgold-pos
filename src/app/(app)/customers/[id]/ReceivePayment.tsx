"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordCustomerPayment } from "@/lib/customerActions";

export function ReceivePayment({ customerId, maxAmount }: { customerId: number; maxAmount: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(maxAmount);
  const [method, setMethod] = useState("cash");
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    start(async () => {
      const res = await recordCustomerPayment(customerId, amount, method);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg bg-success text-white text-sm font-semibold py-2 hover:brightness-105"
      >
        Receive Payment
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="number"
        value={amount || ""}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum"
        placeholder="Amount"
      />
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      >
        <option value="cash">Cash</option>
        <option value="card">Card</option>
        <option value="jazzcash">JazzCash</option>
        <option value="easypaisa">EasyPaisa</option>
        <option value="bank">Bank Transfer</option>
      </select>
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={pending || amount <= 0}
          className="flex-1 rounded-lg bg-success text-white text-sm font-semibold py-2 hover:brightness-105 disabled:opacity-60"
        >
          {pending ? "…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}
