import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, CreditCard } from "lucide-react";
import { getKarigar, getKarigarLedger, getKarigarBalance } from "@/lib/karigar";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { formatPKR } from "@/lib/format";
import { LedgerSection } from "./LedgerSection";

export const dynamic = "force-dynamic";

export default async function KarigarProfile({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user?.role, "karigars")) return <NoAccess role={user?.role ?? "unknown"} />;

  const { id } = await params;
  const k = getKarigar(Number(id));
  if (!k) notFound();
  const ledger = getKarigarLedger(k.id);
  const balance = getKarigarBalance(k.id);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/karigars" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900">
        <ArrowLeft size={16} /> Back to karigars
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5 space-y-3">
          <div>
            <h1 className="text-xl font-bold">{k.name}</h1>
            <p className="text-xs text-gray-400 capitalize">{k.role} • {k.wageType}</p>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            {k.phone && <div className="flex items-center gap-2"><Phone size={15} className="text-gray-400" /> {k.phone}</div>}
            {k.cnic && <div className="flex items-center gap-2"><CreditCard size={15} className="text-gray-400" /> {k.cnic}</div>}
          </div>
          <dl className="grid grid-cols-2 gap-y-2 text-sm border-t border-gray-100 pt-3">
            <dt className="text-gray-400 text-xs">Monthly</dt><dd>{formatPKR(k.monthlySalary)}</dd>
            <dt className="text-gray-400 text-xs">Dehari/day</dt><dd>{formatPKR(k.dehariRate)}</dd>
            <dt className="text-gray-400 text-xs">Commission</dt><dd>{k.commissionPct}%</dd>
          </dl>
          {k.notes && <p className="text-xs text-gray-500 border-t border-gray-100 pt-2">{k.notes}</p>}
        </div>

        <div className="lg:col-span-2">
          <LedgerSection karigarId={k.id} balance={balance} entries={ledger} />
        </div>
      </div>
    </div>
  );
}
