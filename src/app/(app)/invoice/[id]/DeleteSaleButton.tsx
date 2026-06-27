"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteSale } from "@/lib/actions";

export function DeleteSaleButton({ saleId, invoiceNo }: { saleId: number; invoiceNo: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function remove() {
    if (
      !confirm(
        `Delete sale ${invoiceNo}?\n\nThis restocks the sold items, reverses any udhaar from this bill, and permanently removes the invoice. This cannot be undone.`
      )
    )
      return;
    start(async () => {
      const res = await deleteSale(saleId);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.push("/invoices");
      router.refresh();
    });
  }

  return (
    <button
      onClick={remove}
      disabled={pending}
      className="flex items-center gap-2 rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
    >
      <Trash2 size={16} /> {pending ? "Deleting…" : "Delete Sale"}
    </button>
  );
}
