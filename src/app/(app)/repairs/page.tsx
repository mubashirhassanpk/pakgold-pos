import Link from "next/link";
import { listJobs, jobStatusCounts, JOB_STATUSES } from "@/lib/repairs";
import { customersForPicker } from "@/lib/customers";
import { karigarsForPicker } from "@/lib/karigar";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { formatPKR, formatDateTime } from "@/lib/format";
import { AddJob } from "./AddJob";
import { StatusBadge } from "./StatusBadge";

export const dynamic = "force-dynamic";

const TABS = ["all", ...JOB_STATUSES];

export default async function RepairsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user?.role, "repairs")) return <NoAccess role={user?.role ?? "unknown"} />;

  const { status } = await searchParams;
  const active = status && TABS.includes(status) ? status : "all";
  const jobs = listJobs(active);
  const counts = jobStatusCounts();
  const open = (counts.received ?? 0) + (counts.in_progress ?? 0) + (counts.ready ?? 0);
  const customers = customersForPicker();
  const karigars = karigarsForPicker();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Repairs &amp; Job Work</h1>
          <p className="text-sm text-gray-500">
            {open} open job(s) <span className="urdu">مرمت / کاریگری</span>
          </p>
        </div>
        <AddJob customers={customers} karigars={karigars} />
      </div>

      <div className="inline-flex flex-wrap rounded-xl bg-gray-100 p-1">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/repairs?status=${t}`}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              active === t ? "bg-white shadow-sm text-navy-900" : "text-gray-500 hover:text-navy-900"
            }`}
          >
            {t.replace("_", " ")}
            {t !== "all" && counts[t] ? <span className="ml-1 text-xs text-gray-400">{counts[t]}</span> : null}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Job #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Item / Work</th>
              <th className="px-4 py-3">Expected</th>
              <th className="px-4 py-3 text-right">Charge</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-gold-50/40">
                <td className="px-4 py-3">
                  <Link href={`/repairs/${j.id}`} className="font-mono text-xs text-navy-900 hover:text-gold-700">
                    {j.jobNo}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{j.customerName}</div>
                  {j.phone && <div className="text-xs text-gray-400">{j.phone}</div>}
                </td>
                <td className="px-4 py-3">
                  <div>{j.itemDescription}</div>
                  <div className="text-xs text-gray-400 capitalize">{j.jobType.replace("_", " ")}</div>
                </td>
                <td className="px-4 py-3 text-gray-500">{j.expectedDate || "—"}</td>
                <td className="px-4 py-3 text-right tnum">{formatPKR(j.estimatedCharge)}</td>
                <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">No jobs in this view.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
