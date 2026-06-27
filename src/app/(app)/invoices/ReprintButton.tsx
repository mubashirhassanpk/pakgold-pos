"use client";

import { useState } from "react";
import { Printer } from "lucide-react";

/** Reprint an old invoice on the ESC/POS thermal printer. */
export function ReprintButton({ saleId }: { saleId: number }) {
  const [msg, setMsg] = useState("");
  async function reprint() {
    setMsg("…");
    try {
      const res = await fetch(`/api/print/${saleId}`, { method: "POST" });
      const data = await res.json();
      setMsg(data.ok ? "✓" : "✗");
      if (!data.ok) alert(`Print: ${data.error}`);
    } catch {
      setMsg("✗");
      alert("Could not reach the printer. Check Settings → Hardware.");
    }
  }
  return (
    <button
      onClick={reprint}
      title="Reprint thermal receipt"
      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
    >
      <Printer size={13} /> Thermal {msg}
    </button>
  );
}
