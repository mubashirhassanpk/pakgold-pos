"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteItem } from "@/lib/inventoryActions";

export function DeleteItemButton({ id, name }: { id: number; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      title="Delete item from stock"
      onClick={() => {
        if (!confirm(`Delete "${name}" from stock? This cannot be undone.`)) return;
        start(async () => {
          const res = await deleteItem(id);
          if (!res.ok) {
            alert(res.error);
            return;
          }
          router.refresh();
        });
      }}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      <Trash2 size={13} /> Delete
    </button>
  );
}
