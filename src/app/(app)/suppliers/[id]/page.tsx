import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, CreditCard } from "lucide-react";
import { getSupplier, getSupplierLedger, getSupplierBalance } from "@/lib/suppliers";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { SupplierLedger } from "./SupplierLedger";

export const dynamic = "force-dynamic";

export default async function SupplierProfile({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user?.role, "suppliers")) return <NoAccess role={user?.role ?? "unknown"} />;

  const { id } = await params;
  const s = getSupplier(Number(id));
  if (!s) notFound();
  const ledger = getSupplierLedger(s.id);
  const balance = getSupplierBalance(s.id);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/suppliers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900"><ArrowLeft size={16} /> Back to suppliers</Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5 space-y-3">
          <h1 className="text-xl font-bold">{s.name}</h1>
          <div className="space-y-2 text-sm text-gray-600">
            {s.phone && <div className="flex items-center gap-2"><Phone size={15} className="text-gray-400" /> {s.phone}</div>}
            {s.cnic && <div className="flex items-center gap-2"><CreditCard size={15} className="text-gray-400" /> {s.cnic}</div>}
          </div>
          {s.notes && <p className="text-xs text-gray-500 border-t border-gray-100 pt-2">{s.notes}</p>}
        </div>
        <div className="lg:col-span-2">
          <SupplierLedger supplierId={s.id} balance={balance} entries={ledger} />
        </div>
      </div>
    </div>
  );
}
