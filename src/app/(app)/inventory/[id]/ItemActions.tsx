"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Printer, Trash2 } from "lucide-react";
import { deleteItem } from "@/lib/inventoryActions";

export function ItemActions({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function remove() {
    if (!confirm("Delete this item from stock?")) return;
    start(async () => {
      const res = await deleteItem(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.push("/inventory");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2 no-print">
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-lg bg-navy-900 text-white text-sm px-4 py-2 hover:bg-navy-800"
      >
        <Printer size={16} /> Print Label
      </button>
      <button
        onClick={remove}
        disabled={pending}
        className="flex items-center gap-2 rounded-lg bg-red-50 text-red-600 text-sm px-4 py-2 hover:bg-red-100 disabled:opacity-60"
      >
        <Trash2 size={16} /> Delete
      </button>
    </div>
  );
}
