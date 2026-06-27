import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBooking } from "@/lib/bookings";
import { getKarigar } from "@/lib/karigar";
import { getSettings } from "@/lib/queries";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { PrintButton } from "@/components/PrintButton";
import { formatPKR, formatWeightDual, formatDateTime } from "@/lib/format";
import { StatusBadge } from "../../repairs/StatusBadge";
import { BookingActions } from "./BookingActions";

export const dynamic = "force-dynamic";

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user?.role, "bookings")) return <NoAccess role={user?.role ?? "unknown"} />;

  const { id } = await params;
  const b = getBooking(Number(id));
  if (!b) notFound();
  const settings = getSettings();
  const karigar = b.karigarId ? getKarigar(b.karigarId) : null;
  const balance = b.estimatedAmount - b.advance;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between no-print">
        <Link href="/bookings" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-900"><ArrowLeft size={16} /> Back to bookings</Link>
        <PrintButton label="Print Booking Slip" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white ring-1 ring-black/5 p-6">
          <div className="flex items-start justify-between">
            <div><h1 className="text-xl font-bold font-mono">{b.bookingNo}</h1><p className="text-sm text-gray-500">Advance Booking</p></div>
            <StatusBadge status={b.status} />
          </div>
          <dl className="grid grid-cols-2 gap-y-3 gap-x-6 mt-5 text-sm">
            <Row label="Customer" value={b.customerName} />
            <Row label="Phone" value={b.phone || "—"} />
            <Row label="Order" value={b.description} />
            <Row label="Purity" value={b.karat ? `${b.karat}K` : "—"} />
            <Row label="Est. Weight" value={b.estimatedWeight ? formatWeightDual(b.estimatedWeight) : "—"} />
            <Row label="Expected" value={b.expectedDate || "—"} />
            <Row label="Booked" value={formatDateTime(b.createdAt)} />
            <Row label="Delivered" value={b.deliveredAt ? formatDateTime(b.deliveredAt) : "—"} />
            {karigar && <Row label="Karigar" value={karigar.name} />}
            {b.notes && <Row label="Notes" value={b.notes} full />}
          </dl>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <Money label="Estimated" value={b.estimatedAmount} />
            <Money label="Advance" value={b.advance} />
            <Money label="Balance" value={balance} highlight />
          </div>
          {b.saleId && <p className="mt-3 text-xs text-success">Delivered &amp; billed — sale #{b.saleId}.</p>}
        </div>

        <div className="rounded-2xl bg-white ring-1 ring-black/5 p-6">
          <h2 className="font-semibold mb-4">Actions</h2>
          <BookingActions id={b.id} status={b.status} billed={!!b.saleId} estimatedAmount={b.estimatedAmount} advance={b.advance} />
        </div>
      </div>

      {/* Printable booking slip */}
      <div id="print-area" className="mx-auto bg-white p-3" style={{ width: "80mm", fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
        <div className="text-center">
          <div className="font-bold text-base">{settings.shop_name_en || "PakGold"}</div>
          {settings.shop_name_ur && <div className="urdu">{settings.shop_name_ur}</div>}
          <div className="font-semibold mt-1">BOOKING / BAYANA SLIP</div>
        </div>
        <div className="border-t border-dashed border-black my-1" />
        <div>Booking #: {b.bookingNo}</div>
        <div>Date: {formatDateTime(b.createdAt)}</div>
        {b.expectedDate && <div>Expected: {b.expectedDate}</div>}
        <div>Customer: {b.customerName}{b.phone ? ` (${b.phone})` : ""}</div>
        <div className="border-t border-dashed border-black my-1" />
        <div>Order: {b.description}{b.karat ? ` • ${b.karat}K` : ""}</div>
        {b.estimatedWeight ? <div>Est. weight: {b.estimatedWeight.toFixed(3)} g</div> : null}
        <div className="border-t border-dashed border-black my-1" />
        <div className="flex justify-between"><span>Estimated</span><span>{formatPKR(b.estimatedAmount)}</span></div>
        <div className="flex justify-between"><span>Advance/Bayana</span><span>{formatPKR(b.advance)}</span></div>
        <div className="flex justify-between font-bold"><span>Balance</span><span>{formatPKR(balance)}</span></div>
        <div className="border-t border-dashed border-black my-1" />
        <div className="text-[10px] text-center">Bring this slip at delivery. Advance is non-refundable. / ڈیلیوری پر یہ پرچی لائیں۔</div>
      </div>
    </div>
  );
}

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return <div className={full ? "col-span-2" : ""}><dt className="text-gray-400 text-xs">{label}</dt><dd className="font-medium">{value}</dd></div>;
}
function Money({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-navy-900 text-white" : "bg-gray-50"}`}>
      <div className={`text-xs ${highlight ? "text-white/60" : "text-gray-500"}`}>{label}</div>
      <div className="text-lg font-bold tnum">{formatPKR(value)}</div>
    </div>
  );
}
