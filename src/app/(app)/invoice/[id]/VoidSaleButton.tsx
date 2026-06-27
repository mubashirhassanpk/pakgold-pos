"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { voidSale } from "@/lib/actions";

export function VoidSaleButton({ saleId, invoiceNo }: { saleId: number; invoiceNo: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function doVoid() {
    if (
      !confirm(
        `Void sale ${invoiceNo}?\n\nThe items go back to stock and any udhaar is reversed, but the record is kept (hidden from lists & reports) for history.`
      )
    )
      return;
    start(async () => {
      const res = await voidSale(saleId);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      onClick={doVoid}
      disabled={pending}
      className="flex items-center gap-2 rounded-lg border border-amber-400 text-amber-700 px-4 py-2 text-sm font-semibold hover:bg-amber-50 disabled:opacity-60"
    >
      <Ban size={16} /> {pending ? "Voiding…" : "Void"}
    </button>
  );
}
