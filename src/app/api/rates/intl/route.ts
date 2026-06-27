import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { KARAT_PURITY } from "@/lib/constants";
import {
  DEFAULT_SPOT_URL,
  DEFAULT_FX_URL,
  parseSpotUsdPerOz,
  parseUsdPkr,
  intlAllKaratRows,
  intlKaratSellPerTola,
} from "@/lib/intl";

export const dynamic = "force-dynamic";

/** Fetch JSON with a hard timeout so an offline shop never hangs the UI. */
async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function persistSetting(key: string, value: string) {
  db.insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
    .run();
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const settings = getSettings();
  const spotUrl = settings.intl_spot_url || DEFAULT_SPOT_URL;
  const fxUrl = settings.intl_fx_url || DEFAULT_FX_URL;
  const premiumPct = Number(settings.intl_premium_pct || "0") || 0;

  const wantSave = req.nextUrl.searchParams.get("save") === "1";
  const wantApply = req.nextUrl.searchParams.get("apply") === "1";

  let usdPerOz: number | null = null;
  let usdPkr: number | null = null;
  let error: string | null = null;

  try {
    const [spotRaw, fxRaw] = await Promise.all([fetchJson(spotUrl), fetchJson(fxUrl)]);
    usdPerOz = parseSpotUsdPerOz(spotRaw);
    usdPkr = parseUsdPkr(fxRaw);
    if (!usdPerOz || !usdPkr) error = "Could not read price from the configured source(s).";
  } catch (e) {
    error = e instanceof Error ? e.message : "fetch failed";
  }

  // Offline-tolerant: if the live fetch failed, fall back to the last known.
  if (!usdPerOz) usdPerOz = Number(settings.intl_usd_per_oz || "0") || null;
  if (!usdPkr) usdPkr = Number(settings.intl_usd_pkr || "0") || null;

  if (!usdPerOz || !usdPkr) {
    return NextResponse.json({
      ok: false,
      error: error ?? "No rate available yet.",
      usdPerOz,
      usdPkr,
    });
  }

  const fetchedAt = Date.now();
  const computed = intlAllKaratRows(usdPerOz, usdPkr, premiumPct);

  // Persist last-known values (any logged-in user) so offline still shows them.
  const live = !error;
  if (wantSave && live) {
    persistSetting("intl_usd_per_oz", String(usdPerOz));
    persistSetting("intl_usd_pkr", String(usdPkr));
    persistSetting("intl_fetched_at", String(fetchedAt));
    const d = new Date(fetchedAt);
    persistSetting(
      "intl_fetched_date",
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }

  // Optionally APPLY as today's billing rate (owner/manager + autoapply only).
  let applied = false;
  const canApply = user.role === "owner" || user.role === "manager";
  if (wantApply && live && canApply && settings.intl_autoapply === "1") {
    for (const r of computed) {
      const factor = KARAT_PURITY[r.karat]?.factor ?? r.karat / 24;
      db.insert(schema.goldRates)
        .values({
          karat: r.karat,
          purityFactor: factor,
          sellPerTola: r.sellPerTola,
          buyPerTola: r.buyPerTola,
          source: "api",
          createdBy: user.id,
        })
        .run();
    }
    db.insert(schema.auditLog)
      .values({
        userId: user.id,
        action: "rate_autofetch",
        entity: "gold_rate",
        entityId: "intl",
        detail: `spot=${usdPerOz} usd/oz fx=${usdPkr} premium=${premiumPct}%`,
      })
      .run();
    applied = true;
    revalidatePath("/");
    revalidatePath("/rates");
  }

  return NextResponse.json({
    ok: true,
    live,
    error,
    usdPerOz,
    usdPkr,
    premiumPct,
    fetchedAt: live ? fetchedAt : Number(settings.intl_fetched_at || "0") || null,
    pkrPerTola24k: Math.round(intlKaratSellPerTola(usdPerOz, usdPkr, 24, 0)),
    computed,
    applied,
  });
}
