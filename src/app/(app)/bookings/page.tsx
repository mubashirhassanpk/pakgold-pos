import Link from "next/link";
import { listBookings, bookingStatusCounts, BOOKING_STATUSES } from "@/lib/bookings";
import { customersForPicker } from "@/lib/customers";
import { karigarsForPicker } from "@/lib/karigar";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { formatPKR, formatDateTime } from "@/lib/format";
import { StatusBadge } from "../repairs/StatusBadge";
import { AddBooking } from "./AddBooking";

export const dynamic = "force-dynamic";

const TABS = ["all", ...BOOKING_STATUSES];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user?.role, "bookings")) return <NoAccess role={user?.role ?? "unknown"} />;

  const { status } = await searchParams;
  const active = status && TABS.includes(status) ? status : "all";
  const rows = listBookings(active);
  const counts = bookingStatusCounts();
  const open = (counts.booked ?? 0) + (counts.in_progress ?? 0) + (counts.ready ?? 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Advance Booking <span className="urdu text-base text-gray-400">بکنگ / بیعانہ</span></h1>
          <p className="text-sm text-gray-500">{open} open order(s)</p>
        </div>
        <AddBooking customers={customersForPicker()} karigars={karigarsForPicker()} />
      </div>

      <div className="inline-flex flex-wrap rounded-xl bg-gray-100 p-1">
        {TABS.map((t) => (
          <Link key={t} href={`/bookings?status=${t}`} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${active === t ? "bg-white shadow-sm text-navy-900" : "text-gray-500 hover:text-navy-900"}`}>
            {t.replace("_", " ")}{t !== "all" && counts[t] ? <span className="ml-1 text-xs text-gray-400">{counts[t]}</span> : null}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Booking #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Expected</th>
              <th className="px-4 py-3 text-right">Est. / Advance</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((b) => (
              <tr key={b.id} className="hover:bg-gold-50/40">
                <td className="px-4 py-3"><Link href={`/bookings/${b.id}`} className="font-mono text-xs text-navy-900 hover:text-gold-700">{b.bookingNo}</Link></td>
                <td className="px-4 py-3"><div className="font-medium">{b.customerName}</div>{b.phone && <div className="text-xs text-gray-400">{b.phone}</div>}</td>
                <td className="px-4 py-3">{b.description}{b.karat ? <span className="text-xs text-gray-400"> • {b.karat}K</span> : null}</td>
                <td className="px-4 py-3 text-gray-500">{b.expectedDate || "—"}</td>
                <td className="px-4 py-3 text-right tnum">{formatPKR(b.estimatedAmount)}<div className="text-xs text-success">adv {formatPKR(b.advance)}</div></td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No bookings in this view.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
