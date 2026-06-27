import { getCurrentRates, getCurrentSilverRates, getSettings } from "@/lib/queries";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { RateEditor } from "./RateEditor";
import { SilverRateEditor } from "./SilverRateEditor";
import { IntlRatePanel } from "@/components/IntlRatePanel";

export const dynamic = "force-dynamic";

export default async function RatesPage() {
  const user = await getCurrentUser();
  if (!can(user?.role, "rates")) return <NoAccess role={user?.role ?? "unknown"} />;
  const rates = getCurrentRates();
  const silverRates = getCurrentSilverRates();
  const settings = getSettings();
  const localSell: Record<number, number> = Object.fromEntries(rates.map((r) => [r.karat, r.sellPerTola]));

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Metal Rates</h1>
        <p className="text-sm text-gray-500">
          Set today&apos;s SELL and BUYBACK rate. <span className="urdu">سونے اور چاندی کا ریٹ</span>
        </p>
      </div>

      {settings.intl_enabled === "1" && (
        <IntlRatePanel
          autofetch={settings.intl_autofetch === "1"}
          premiumPct={Number(settings.intl_premium_pct || "0") || 0}
          usdPerOz={Number(settings.intl_usd_per_oz || "0") || null}
          usdPkr={Number(settings.intl_usd_pkr || "0") || null}
          fetchedAt={Number(settings.intl_fetched_at || "0") || null}
          localSell={localSell}
        />
      )}

      <RateEditor initial={rates} />

      <div className="border-t border-gray-100 pt-6">
        <SilverRateEditor initial={silverRates} />
      </div>
    </div>
  );
}
