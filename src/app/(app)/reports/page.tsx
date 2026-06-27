import Link from "next/link";
import { getReport, resolveRange, type RangePreset } from "@/lib/reports";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { ReportControls } from "./ReportControls";
import { BarList, DailyChart } from "@/components/BarList";
import { formatPKR, formatDateTime } from "@/lib/format";
import { gramsToTola } from "@/lib/units";

export const dynamic = "force-dynamic";

const VALID: RangePreset[] = ["today", "week", "month", "all"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user?.role, "reports")) return <NoAccess role={user?.role ?? "unknown"} />;
  const sp = await searchParams;
  const preset: RangePreset = VALID.includes(sp.range as RangePreset)
    ? (sp.range as RangePreset)
    : "month";
  const range = resolveRange(preset);
  const r = getReport(range);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Reports &amp; Analytics</h1>
          <p className="text-sm text-gray-500">
            {range.label} • {r.summary.count} bill(s) <span className="urdu">رپورٹس</span>
          </p>
        </div>
      </div>

      <ReportControls active={preset} recent={r.recent} rangeLabel={range.label} />

      {/* Headline stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Sales" value={formatPKR(r.summary.grandTotal)} accent />
        <Stat label="Gold Value Sold" value={formatPKR(r.summary.goldValueTotal)} />
        <Stat label="Making Earned" value={formatPKR(r.summary.makingTotal)} />
        <Stat label="Tax Collected" value={formatPKR(r.summary.taxTotal)} />
        <Stat label="Wastage Earned" value={formatPKR(r.summary.wastageTotal)} />
        <Stat label="Discounts Given" value={formatPKR(r.summary.discountTotal)} />
        <Stat label="Old Gold Bought" value={formatPKR(r.summary.oldGoldTotal)} />
        <Stat
          label="Avg. Bill"
          value={formatPKR(r.summary.count ? r.summary.grandTotal / r.summary.count : 0)}
        />
        <Stat label="Expenses" value={formatPKR(r.expensesTotal)} />
        <Stat label="Salary / Karigar Payouts" value={formatPKR(r.karigarPayoutTotal)} />
        <Stat
          label="Net (Making+Wastage − Exp − Payouts)"
          value={formatPKR(
            r.summary.makingTotal + r.summary.wastageTotal - r.expensesTotal - r.karigarPayoutTotal
          )}
          accent
        />
      </div>

      {/* Daily chart */}
      <Card title="Sales Trend">
        <DailyChart data={r.daily} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="By Metal">
          <BarList items={r.byMetal} sub={(it) => `${gramsToTola(it.grams ?? 0).toFixed(2)} tola`} />
        </Card>
        <Card title="By Gold Purity">
          <BarList items={r.byKarat} sub={(it) => `${gramsToTola(it.grams ?? 0).toFixed(2)} tola`} />
        </Card>
        <Card title="By Category">
          <BarList items={r.byCategory} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {r.bySilverPurity.length > 0 && (
          <Card title="By Silver Purity">
            <BarList items={r.bySilverPurity} sub={(it) => `${gramsToTola(it.grams ?? 0).toFixed(2)} tola`} />
          </Card>
        )}
        <Card title="By Payment Method">
          <BarList items={r.byPayment} />
        </Card>
        {r.expensesByCategory.length > 0 && (
          <Card title="Expenses by Category">
            <BarList items={r.expensesByCategory} />
          </Card>
        )}
        {r.karigarPayouts.length > 0 && (
          <Card title="Salary / Karigar Payouts">
            <BarList items={r.karigarPayouts} />
          </Card>
        )}
      </div>

      {/* Top customers */}
      <Card title="Top Customers">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2">Customer</th>
                <th className="py-2 text-right">Bills</th>
                <th className="py-2 text-right">Total Purchases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {r.topCustomers.map((c, i) => (
                <tr key={i} className="hover:bg-gold-50/40">
                  <td className="py-2 font-medium">{c.name}</td>
                  <td className="py-2 text-right tnum">{c.bills}</td>
                  <td className="py-2 text-right tnum font-semibold">{formatPKR(c.total)}</td>
                </tr>
              ))}
              {r.topCustomers.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-400">No sales in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Salesman performance */}
      <Card title="Staff Performance — Sales & Making by Salesman">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2">Salesman</th>
                <th className="py-2 text-right">Bills</th>
                <th className="py-2 text-right">Gold Value</th>
                <th className="py-2 text-right">Making</th>
                <th className="py-2 text-right">Wastage</th>
                <th className="py-2 text-right">Discount</th>
                <th className="py-2 text-right">Avg Bill</th>
                <th className="py-2 text-right">Total Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {r.bySalesman.map((s) => (
                <tr key={s.userId ?? "none"} className="hover:bg-gold-50/40">
                  <td className="py-2 font-medium">
                    {s.name}
                    {s.role && <span className="text-xs text-gray-400 capitalize ml-1">· {s.role}</span>}
                  </td>
                  <td className="py-2 text-right tnum">{s.bills}</td>
                  <td className="py-2 text-right tnum text-gray-500">{formatPKR(s.goldValueTotal)}</td>
                  <td className="py-2 text-right tnum font-semibold text-gold-700">{formatPKR(s.makingTotal)}</td>
                  <td className="py-2 text-right tnum text-gray-500">{formatPKR(s.wastageTotal)}</td>
                  <td className="py-2 text-right tnum text-gray-500">{formatPKR(s.discountTotal)}</td>
                  <td className="py-2 text-right tnum text-gray-500">{formatPKR(s.avgBill)}</td>
                  <td className="py-2 text-right tnum font-bold">{formatPKR(s.grandTotal)}</td>
                </tr>
              ))}
              {r.bySalesman.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    No sales in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent invoices */}
      <Card title="Invoices">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2">Invoice</th>
                <th className="py-2">Date</th>
                <th className="py-2 text-right">Tax</th>
                <th className="py-2 text-right">Old Gold</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {r.recent.map((s) => (
                <tr key={s.id} className="hover:bg-gold-50/40">
                  <td className="py-2 font-mono text-xs">
                    <Link href={`/invoice/${s.id}`} className="text-navy-900 hover:text-gold-700">
                      {s.invoiceNo}
                    </Link>
                  </td>
                  <td className="py-2 text-gray-500">{formatDateTime(s.createdAt)}</td>
                  <td className="py-2 text-right tnum text-gray-500">{formatPKR(s.taxTotal)}</td>
                  <td className="py-2 text-right tnum text-gray-500">
                    {s.oldGoldTotal ? `− ${formatPKR(s.oldGoldTotal)}` : "—"}
                  </td>
                  <td className="py-2 text-right tnum font-semibold">{formatPKR(s.grandTotal)}</td>
                </tr>
              ))}
              {r.recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No sales in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl p-4 shadow-sm ring-1 ring-black/5 ${
        accent ? "bg-navy-900 text-white" : "bg-white"
      }`}
    >
      <div className={`text-xs ${accent ? "text-white/60" : "text-gray-500"}`}>{label}</div>
      <div className="mt-1 text-xl font-bold tnum">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
      <h2 className="font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}
