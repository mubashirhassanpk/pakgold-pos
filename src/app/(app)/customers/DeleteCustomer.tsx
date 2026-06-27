"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCustomer } from "@/lib/customerActions";

export function DeleteCustomer({ id, name }: { id: number; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      title="Delete customer"
      onClick={() => {
        if (!confirm(`Delete customer "${name}"? This cannot be undone.`)) return;
        start(async () => {
          const res = await deleteCustomer(id);
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
