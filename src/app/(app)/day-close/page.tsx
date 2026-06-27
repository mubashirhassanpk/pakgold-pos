import { getDayClose } from "@/lib/finance";
import { getSettings } from "@/lib/queries";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { PrintButton } from "@/components/PrintButton";
import { formatPKR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DayClosePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user?.role, "dayclose")) return <NoAccess role={user?.role ?? "unknown"} />;

  const sp = await searchParams;
  const dateStr = sp.date ?? new Date().toISOString().slice(0, 10);
  const from = new Date(dateStr).getTime();
  const to = from + 86399999;
  const d = getDayClose(from, to);
  const settings = getSettings();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Day Close <span className="urdu text-base text-gray-400">روزنامچہ</span></h1>
          <p className="text-sm text-gray-500">End-of-day cash &amp; sales summary</p>
        </div>
        <div className="flex items-end gap-2">
          <form className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input type="date" name="date" defaultValue={dateStr} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            </div>
            <button className="rounded-lg bg-navy-900 text-white text-sm font-semibold px-4 py-2 hover:bg-navy-800">Go</button>
          </form>
          <PrintButton label="Print" />
        </div>
      </div>

      <div id="print-area" className="bg-white rounded-2xl ring-1 ring-black/5 p-6 space-y-5">
        <div className="text-center border-b border-gray-100 pb-3">
          <div className="text-lg font-bold">{settings.shop_name_en || "PakGold"}</div>
          <div className="text-sm text-gray-500">Day Close — {dateStr}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="Sales (bills)" value={String(d.salesCount)} />
          <Stat label="Sales Value" value={formatPKR(d.salesTotal)} />
        </div>

        <Section title="Receipts (Sales)" rows={d.salesByMethod} empty="No sales receipts" />
        <Section title="Udhaar Received" rows={d.udhaarByMethod} empty="No udhaar received" />
        <Section
          title={`Old Gold Bought (${d.oldGoldWeight.toFixed(3)} g)`}
          rows={d.oldGoldByMethod}
          empty="No old gold bought"
          negative
        />
        <Section
          title="Expenses"
          rows={d.expensesByCategory.map((e) => ({ method: e.category, amount: e.amount }))}
          empty="No expenses"
          negative
        />
        <Section
          title="Salary / Karigar Payouts"
          rows={d.karigarPayouts.map((k) => ({ method: k.name, amount: k.amount }))}
          empty="No staff payouts"
          negative
        />

        {/* Cash summary */}
        <div className="rounded-xl bg-navy-900 text-white p-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-white/70">Cash In (cash sales + udhaar)</span><span className="tnum">{formatPKR(d.cashIn)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-white/70">Cash Out (old gold + expenses + payouts)</span><span className="tnum text-gold-200">− {formatPKR(d.cashOut)}</span></div>
          <div className="flex justify-between border-t border-white/15 pt-2 text-lg font-bold">
            <span>Net Cash in Drawer</span>
            <span className="tnum text-gold">{formatPKR(d.netCash)}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">
          Count your cash drawer and compare with Net Cash above. Differences indicate an unrecorded sale or expense.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-bold tnum">{value}</div>
    </div>
  );
}

function Section({
  title,
  rows,
  empty,
  negative,
}: {
  title: string;
  rows: { method: string; amount: number }[];
  empty: string;
  negative?: boolean;
}) {
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-semibold mb-1">
        <span>{title}</span>
        <span className={`tnum ${negative ? "text-red-600" : ""}`}>{negative && total > 0 ? "− " : ""}{formatPKR(total)}</span>
      </div>
      <div className="text-sm text-gray-600 pl-1 space-y-0.5">
        {rows.length === 0 ? (
          <div className="text-gray-400">{empty}</div>
        ) : (
          rows.map((r) => (
            <div key={r.method} className="flex justify-between">
              <span className="capitalize">{r.method}</span>
              <span className="tnum">{formatPKR(r.amount)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
