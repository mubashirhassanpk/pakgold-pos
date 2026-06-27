import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getJob } from "@/lib/repairs";
import { getKarigar } from "@/lib/karigar";
import { getSettings } from "@/lib/queries";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { PrintButton } from "@/components/PrintButton";
import { formatPKR, formatWeightDual, formatDateTime } from "@/lib/format";
import { StatusBadge } from "../StatusBadge";
import { JobActions } from "./JobActions";

export const dynamic = "force-dynamic";

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user?.role, "repairs")) return <NoAccess role={user?.role ?? "unknown"} />;

  const { id } = await params;
  const job = getJob(Number(id));
  if (!job) notFound();
  const settings = getSettings();
  const karigar = job.karigarId ? getKarigar(job.karigarId) : null;

  const balance = job.estimatedCharge - job.advance;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print">
        <Link href="/repairs" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900">
          <ArrowLeft size={16} /> Back to repairs
        </Link>
        <PrintButton label="Print Job Card" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white ring-1 ring-black/5 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold font-mono">{job.jobNo}</h1>
              <p className="text-sm text-gray-500 capitalize">{job.jobType.replace("_", " ")}</p>
            </div>
            <StatusBadge status={job.status} />
          </div>

          <dl className="grid grid-cols-2 gap-y-3 gap-x-6 mt-5 text-sm">
            <Row label="Customer" value={job.customerName} />
            <Row label="Phone" value={job.phone || "—"} />
            <Row label="Item / Work" value={job.itemDescription} />
            <Row label="Purity" value={job.karat ? `${job.karat}K` : "—"} />
            <Row label="Gold Weight" value={job.metalWeight ? formatWeightDual(job.metalWeight) : "—"} />
            <Row label="Expected" value={job.expectedDate || "—"} />
            <Row label="Received" value={formatDateTime(job.createdAt)} />
            <Row label="Delivered" value={job.deliveredAt ? formatDateTime(job.deliveredAt) : "—"} />
            {karigar && <Row label="Karigar" value={karigar.name} />}
            {job.notes && <Row label="Notes" value={job.notes} full />}
          </dl>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <Money label="Estimated" value={job.estimatedCharge} />
            <Money label="Advance" value={job.advance} />
            <Money label="Balance" value={balance} highlight />
          </div>
          {job.saleId && (
            <p className="mt-3 text-xs text-success">Billed — linked to sale #{job.saleId}.</p>
          )}
        </div>

        <div className="rounded-2xl bg-white ring-1 ring-black/5 p-6">
          <h2 className="font-semibold mb-4">Actions</h2>
          <JobActions id={job.id} status={job.status} billed={!!job.saleId} />
        </div>
      </div>

      {/* Printable 80mm job card */}
      <div id="print-area" className="mx-auto bg-white p-3" style={{ width: "80mm", fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
        <div className="text-center">
          <div className="font-bold text-base">{settings.shop_name_en || "PakGold"}</div>
          {settings.shop_name_ur && <div className="urdu">{settings.shop_name_ur}</div>}
          <div className="font-semibold mt-1">JOB CARD / مرمت پرچی</div>
        </div>
        <div className="border-t border-dashed border-black my-1" />
        <div>Job #: {job.jobNo}</div>
        <div>Date: {formatDateTime(job.createdAt)}</div>
        {job.expectedDate && <div>Expected: {job.expectedDate}</div>}
        <div>Customer: {job.customerName}{job.phone ? ` (${job.phone})` : ""}</div>
        <div className="border-t border-dashed border-black my-1" />
        <div>Item: {job.itemDescription}</div>
        <div>Work: {job.jobType.replace("_", " ")}{job.karat ? ` • ${job.karat}K` : ""}</div>
        {job.metalWeight ? <div>Gold given: {job.metalWeight.toFixed(3)} g</div> : null}
        {karigar && <div>Karigar: {karigar.name}</div>}
        <div className="border-t border-dashed border-black my-1" />
        <div className="flex justify-between"><span>Estimated</span><span>{formatPKR(job.estimatedCharge)}</span></div>
        <div className="flex justify-between"><span>Advance</span><span>{formatPKR(job.advance)}</span></div>
        <div className="flex justify-between font-bold"><span>Balance</span><span>{formatPKR(balance)}</span></div>
        <div className="border-t border-dashed border-black my-1" />
        <div className="text-[10px] text-center">Please bring this slip at delivery. / ڈیلیوری کے وقت یہ پرچی لائیں۔</div>
      </div>
    </div>
  );
}

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-gray-400 text-xs">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Money({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-navy-900 text-white" : "bg-gray-50"}`}>
      <div className={`text-xs ${highlight ? "text-white/60" : "text-gray-500"}`}>{label}</div>
      <div className="text-lg font-bold tnum">{formatPKR(value)}</div>
    </div>
  );
}
