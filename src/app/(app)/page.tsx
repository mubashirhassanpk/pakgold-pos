import Link from "next/link";
import {
  ShoppingCart,
  Coins,
  Package,
  RefreshCw,
  Wrench,
  PiggyBank,
  Users,
  Wallet,
  FileText,
  CalendarCheck,
  BarChart3,
  Receipt,
} from "lucide-react";
import { getCurrentRates, getDashboardStats, getInventory, getSettings } from "@/lib/queries";
import { jobStatusCounts } from "@/lib/repairs";
import { getCurrentUser, getEffectiveAccess } from "@/lib/auth";
import { RateBanner } from "@/components/RateBanner";
import { IntlRatePanel } from "@/components/IntlRatePanel";
import { formatPKR } from "@/lib/format";
import { gramsToTola } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const rates = getCurrentRates();
  const stats = getDashboardStats();
  const inventory = getInventory();
  const jobCounts = jobStatusCounts();
  const settings = getSettings();
  const intlEnabled = settings.intl_enabled === "1";
  const localSell: Record<number, number> = Object.fromEntries(rates.map((r) => [r.karat, r.sellPerTola]));
  const openRepairs =
    (jobCounts.received ?? 0) + (jobCounts.in_progress ?? 0) + (jobCounts.ready ?? 0);

  // Inventory value at *current market rate* (net weight × sell rate for its karat).
  const rateByKarat = new Map(rates.map((r) => [r.karat, r.sellPerTola]));
  const inventoryValue = inventory.reduce((sum, it) => {
    const rate = rateByKarat.get(it.karat) ?? 0;
    return sum + gramsToTola(it.netWeight * it.quantity) * rate;
  }, 0);

  const plain = "bg-white text-navy-900 ring-1 ring-navy-900/10";
  const allowed = new Set(getEffectiveAccess(user?.role));
  // Role-aware shortcuts — only those the signed-in user is allowed to open show.
  const quickActions = [
    { href: "/pos", area: "pos", label: "New Sale", ur: "نئی فروخت", icon: ShoppingCart, color: "bg-gold text-navy-900" },
    { href: "/buy-gold", area: "buygold", label: "Buy Old Gold", ur: "پرانا سونا", icon: Coins, color: "bg-navy-900 text-white" },
    { href: "/inventory", area: "inventory", label: "Inventory", ur: "اسٹاک", icon: Package, color: plain },
    { href: "/customers", area: "customers", label: "Customers", ur: "گاہک", icon: Users, color: plain },
    { href: "/receivables", area: "receivables", label: "Udhaar", ur: "ادھار", icon: Wallet, color: plain },
    { href: "/invoices", area: "invoices", label: "Invoices", ur: "رسیدیں", icon: FileText, color: plain },
    { href: "/expenses", area: "expenses", label: "Expenses", ur: "اخراجات", icon: Receipt, color: plain },
    { href: "/repairs", area: "repairs", label: "Repairs", ur: "مرمت", icon: Wrench, color: plain },
    { href: "/committees", area: "committees", label: "Committees", ur: "کمیٹی", icon: PiggyBank, color: plain },
    { href: "/day-close", area: "dayclose", label: "Day Close", ur: "روزنامچہ", icon: CalendarCheck, color: plain },
    { href: "/reports", area: "reports", label: "Reports", ur: "رپورٹس", icon: BarChart3, color: plain },
    { href: "/rates", area: "rates", label: "Update Rate", ur: "ریٹ اپڈیٹ", icon: RefreshCw, color: plain },
  ].filter((a) => allowed.has(a.area));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">Salaam — here&apos;s your shop today</p>
        </div>
      </div>

      <RateBanner rates={rates} />

      {intlEnabled && (
        <IntlRatePanel
          autofetch={settings.intl_autofetch === "1"}
          premiumPct={Number(settings.intl_premium_pct || "0") || 0}
          usdPerOz={Number(settings.intl_usd_per_oz || "0") || null}
          usdPkr={Number(settings.intl_usd_pkr || "0") || null}
          fetchedAt={Number(settings.intl_fetched_at || "0") || null}
          localSell={localSell}
        />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Sales"
          ur="آج کی فروخت"
          value={formatPKR(stats.todaySalesTotal)}
          sub={`${stats.todaySalesCount} bill(s)`}
        />
        <StatCard
          label="Inventory Value"
          ur="اسٹاک کی مالیت"
          value={formatPKR(inventoryValue)}
          sub={`${stats.stockPieces} pieces • ${gramsToTola(stats.stockNetGrams).toFixed(2)} tola`}
        />
        <StatCard
          label="Items in Stock"
          ur="موجود اشیاء"
          value={String(stats.stockPieces)}
          sub={`${stats.stockNetGrams.toFixed(1)} g net gold`}
        />
        <StatCard
          label="Open Repairs"
          ur="مرمت"
          value={String(openRepairs)}
          sub={openRepairs > 0 ? `${jobCounts.ready ?? 0} ready to deliver` : "All clear"}
          href="/repairs"
          highlight={openRepairs > 0}
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className={`${a.color} rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}
              >
                <Icon size={28} />
                <div>
                  <div className="font-semibold">{a.label}</div>
                  <div className="urdu text-sm opacity-70">{a.ur}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  ur,
  value,
  sub,
  href,
  highlight,
}: {
  label: string;
  ur: string;
  value: string;
  sub: string;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <div
      className={`rounded-2xl p-5 shadow-sm ring-1 transition-all ${
        highlight ? "bg-gold-50 ring-gold/30" : "bg-white ring-black/5"
      } ${href ? "hover:shadow-md hover:-translate-y-0.5" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="urdu text-xs text-gray-400">{ur}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tnum text-navy-900">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
