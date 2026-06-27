"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteKarigar } from "@/lib/karigarActions";

export function DeleteKarigar({ id, name }: { id: number; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      title="Delete karigar / staff"
      onClick={() => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        start(async () => {
          const res = await deleteKarigar(id);
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
