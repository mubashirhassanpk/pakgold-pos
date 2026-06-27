import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCommitteePayout } from "@/lib/committees";
import { getSettings } from "@/lib/queries";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { PrintButton } from "@/components/PrintButton";
import { formatPKR, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CommitteePayoutSlip({
  params,
}: {
  params: Promise<{ id: string; payoutId: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user?.role, "committees")) return <NoAccess role={user?.role ?? "unknown"} />;

  const { id, payoutId } = await params;
  const data = getCommitteePayout(Number(payoutId));
  if (!data || data.committee.id !== Number(id)) notFound();
  const { payout, committee, member } = data;
  const settings = getSettings();
  const isGold = committee.type === "gold";

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="no-print flex items-center justify-between mb-4 max-w-3xl mx-auto">
        <Link href={`/committees/${committee.id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900">
          <ArrowLeft size={16} /> Back to committee
        </Link>
        <PrintButton label="Print Payout Slip" />
      </div>

      <div
        id="print-area"
        className="mx-auto bg-white p-4 ring-1 ring-black/10"
        style={{ width: "80mm", fontFamily: "ui-monospace, monospace", fontSize: 11 }}
      >
        <div className="text-center">
          <div className="font-bold text-base">{settings.shop_name_en || "PakGold"}</div>
          {settings.shop_name_ur && <div className="urdu">{settings.shop_name_ur}</div>}
          {settings.phone && <div className="text-[10px]">Ph: {settings.phone}</div>}
          <div className="font-semibold mt-1">COMMITTEE PAYOUT SLIP</div>
          <div className="urdu text-[11px]">کمیٹی ادائیگی</div>
        </div>
        <div className="border-t border-dashed border-black my-1" />
        <div>Committee: {committee.name} ({committee.code})</div>
        <div>Member: {member.name}</div>
        {member.phone && <div>Phone: {member.phone}</div>}
        <div>Payout for month: {payout.monthNo} / {committee.totalMonths}</div>
        <div>{formatDateTime(payout.paidAt)}</div>
        <div className="border-t border-dashed border-black my-1" />
        {isGold && payout.grams > 0 && (
          <div className="flex justify-between"><span>Gold paid</span><span>{payout.grams.toFixed(3)} g</span></div>
        )}
        <div className="flex justify-between font-bold text-base">
          <span>Amount</span>
          <span>{formatPKR(payout.amount)}</span>
        </div>
        <div className="flex justify-between"><span>Method</span><span className="capitalize">{payout.method}</span></div>
        {payout.note && <div className="text-[10px] mt-1">Note: {payout.note}</div>}
        <div className="border-t border-dashed border-black my-1" />
        <div className="text-center mt-2">Received by: ____________</div>
        <div className="text-center mt-2">Shukria!</div>
      </div>
    </div>
  );
}
