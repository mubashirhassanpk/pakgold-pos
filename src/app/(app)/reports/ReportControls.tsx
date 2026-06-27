"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import type { RangePreset } from "@/lib/reports";
import { formatDateTime } from "@/lib/format";

const TABS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 Days" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

interface RecentRow {
  invoiceNo: string;
  grandTotal: number;
  taxTotal: number;
  oldGoldTotal: number;
  createdAt: number;
}

export function ReportControls({
  active,
  recent,
  rangeLabel,
}: {
  active: RangePreset;
  recent: RecentRow[];
  rangeLabel: string;
}) {
  function exportCsv() {
    const header = ["Invoice", "Date", "Grand Total", "Tax", "Old Gold"];
    const rows = recent.map((r) => [
      r.invoiceNo,
      formatDateTime(r.createdAt),
      r.grandTotal,
      r.taxTotal,
      r.oldGoldTotal,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pakgold-sales-${active}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex rounded-xl bg-gray-100 p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/reports?range=${t.key}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active === t.key ? "bg-white shadow-sm text-navy-900" : "text-gray-500 hover:text-navy-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <button
        onClick={exportCsv}
        className="flex items-center gap-2 rounded-lg bg-navy-900 text-white text-sm px-4 py-2 hover:bg-navy-800"
      >
        <Download size={16} /> Export CSV
      </button>
    </div>
  );
}
