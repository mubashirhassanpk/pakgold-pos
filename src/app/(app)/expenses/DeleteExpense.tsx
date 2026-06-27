"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteExpense } from "@/lib/expenseActions";

export function DeleteExpense({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (!confirm("Delete this expense?")) return;
        start(async () => {
          await deleteExpense(id);
          router.refresh();
        });
      }}
      disabled={pending}
      className="text-gray-300 hover:text-red-500 disabled:opacity-50"
    >
      <Trash2 size={15} />
    </button>
  );
}
