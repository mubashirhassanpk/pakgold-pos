import type { CurrentRate } from "@/lib/queries";
import { formatPKR, formatDateTime } from "@/lib/format";

/** Big, always-visible gold rate banner (24K & 22K headline). */
export function RateBanner({ rates }: { rates: CurrentRate[] }) {
  const headline = rates.filter((r) => r.karat === 24 || r.karat === 22);
  const updated = rates[0]?.effectiveAt;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800 text-white p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm uppercase tracking-wider text-gold/80">
          Today&apos;s Gold Rate <span className="urdu">آج کا ریٹ</span>
        </h2>
        {updated && (
          <span className="text-xs text-white/50">Updated {formatDateTime(updated)}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {headline.map((r) => (
          <div key={r.karat} className="rounded-xl bg-white/5 p-4 ring-1 ring-gold/20">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-gold">{r.karat}K</span>
              <span className="text-xs text-white/40">per tola</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 tnum">
              <div>
                <div className="text-[11px] text-white/50">SELL</div>
                <div className="text-lg font-semibold">{formatPKR(r.sellPerTola)}</div>
              </div>
              <div>
                <div className="text-[11px] text-white/50">BUYBACK</div>
                <div className="text-lg font-semibold text-gold-200">
                  {formatPKR(r.buyPerTola)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
