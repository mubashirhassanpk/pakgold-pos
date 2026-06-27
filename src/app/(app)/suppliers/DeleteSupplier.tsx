"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteSupplier } from "@/lib/supplierActions";

export function DeleteSupplier({ id, name }: { id: number; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      title="Delete supplier"
      onClick={() => {
        if (!confirm(`Delete supplier "${name}"? This cannot be undone.`)) return;
        start(async () => {
          const res = await deleteSupplier(id);
          if (!res.ok) {
            alert(res.error);
            return;
          }
          router.refresh();
        });
      }}
      disabled={pending}
      className="text-gray-300 hover:text-red-500 disabled:opacity-50"
    >
      <Trash2 size={16} />
    </button>
  );
}
