"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Globe, WifiOff } from "lucide-react";
import { formatPKR, formatDateTime } from "@/lib/format";
import { intlAllKaratRows, isStale } from "@/lib/intl";
import { KARAT_PURITY } from "@/lib/constants";

interface IntlState {
  usdPerOz: number | null;
  usdPkr: number | null;
  premiumPct: number;
  fetchedAt: number | null;
  live: boolean;
  error: string | null;
}

export function IntlRatePanel({
  autofetch,
  premiumPct,
  usdPerOz,
  usdPkr,
  fetchedAt,
  localSell,
}: {
  autofetch: boolean;
  premiumPct: number;
  usdPerOz: number | null;
  usdPkr: number | null;
  fetchedAt: number | null;
  localSell: Record<number, number>; // karat -> shop sell/tola
}) {
  const [state, setState] = useState<IntlState>({
    usdPerOz,
    usdPkr,
    premiumPct,
    fetchedAt,
    live: false,
    error: null,
  });
  const [loading, setLoading] = useState(false);
  const didAuto = useRef(false);

  const refresh = useCallback(async (apply: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rates/intl?save=1${apply ? "&apply=1" : ""}`, { cache: "no-store" });
      const data = await res.json();
      if (data.usdPerOz && data.usdPkr) {
        setState({
          usdPerOz: data.usdPerOz,
          usdPkr: data.usdPkr,
          premiumPct: data.premiumPct ?? premiumPct,
          fetchedAt: data.fetchedAt ?? null,
          live: !!data.live,
          error: data.error ?? null,
        });
      } else {
        setState((s) => ({ ...s, live: false, error: data.error ?? "No rate available" }));
      }
    } catch {
      setState((s) => ({ ...s, live: false, error: "offline" }));
    } finally {
      setLoading(false);
    }
  }, [premiumPct]);

  // Morning auto-fetch: once per day, only if enabled and last fetch is stale.
  useEffect(() => {
    if (didAuto.current) return;
    didAuto.current = true;
    if (autofetch && isStale(fetchedAt)) refresh(true);
  }, [autofetch, fetchedAt, refresh]);

  const haveData = !!state.usdPerOz && !!state.usdPkr;
  const computed = haveData ? intlAllKaratRows(state.usdPerOz!, state.usdPkr!, state.premiumPct) : [];
  const intl24 = computed.find((c) => c.karat === 24)?.sellPerTola ?? 0;

  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Globe size={18} className="text-gold-600" /> International Rate
          <span className="urdu text-sm text-gray-400">عالمی ریٹ</span>
        </h2>
        <button
          onClick={() => refresh(false)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200 disabled:opacity-60"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {!haveData ? (
        <p className="text-sm text-gray-400">
          No international rate yet. Click Refresh, or configure the source in Settings.
        </p>
      ) : (
        <>
          {/* Side-by-side: spot (USD/oz) vs derived PKR/tola */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Tile label="Spot (USD / oz)" value={`$ ${state.usdPerOz!.toLocaleString("en-US", { maximumFractionDigits: 2 })}`} />
            <Tile label="USD → PKR" value={`Rs ${state.usdPkr!.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`} />
            <Tile
              label="24K / tola (intl)"
              value={formatPKR(intl24)}
              sub={state.premiumPct ? `incl. ${state.premiumPct}% premium` : "no premium"}
              accent
            />
          </div>

          {/* Per-karat: international vs your shop rate */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-left">
                <tr>
                  <th className="py-2">Purity</th>
                  <th className="py-2 text-right">Intl / tola</th>
                  <th className="py-2 text-right">Your Sell / tola</th>
                  <th className="py-2 text-right">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {computed.map((c) => {
                  const local = localSell[c.karat] ?? 0;
                  const diff = local - c.sellPerTola;
                  return (
                    <tr key={c.karat}>
                      <td className="py-2 font-medium">
                        {c.karat}K <span className="text-gray-400 font-normal">({KARAT_PURITY[c.karat]?.hallmark})</span>
                      </td>
                      <td className="py-2 text-right tnum">{formatPKR(c.sellPerTola)}</td>
                      <td className="py-2 text-right tnum">{local ? formatPKR(local) : "—"}</td>
                      <td className={`py-2 text-right tnum ${diff >= 0 ? "text-success" : "text-red-600"}`}>
                        {local ? `${diff >= 0 ? "+" : ""}${formatPKR(diff)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            {state.live ? (
              <span>Live • updated {state.fetchedAt ? formatDateTime(state.fetchedAt) : "just now"}</span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600">
                <WifiOff size={12} /> Offline — showing last known
                {state.fetchedAt ? ` (${formatDateTime(state.fetchedAt)})` : ""}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ring-1 ${accent ? "bg-navy-900 text-white ring-gold/20" : "bg-gray-50 ring-black/5"}`}>
      <div className={`text-[11px] ${accent ? "text-white/60" : "text-gray-500"}`}>{label}</div>
      <div className="mt-1 text-lg font-bold tnum">{value}</div>
      {sub && <div className={`text-[10px] mt-0.5 ${accent ? "text-gold-200" : "text-gray-400"}`}>{sub}</div>}
    </div>
  );
}
