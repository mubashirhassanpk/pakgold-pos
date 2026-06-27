import { getGoldLedger, getSilverLedger, type KaratWeight, type PurityWeight } from "@/lib/finance";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { KARAT_PURITY, silverPurityFactor } from "@/lib/constants";
import { gramsToTola } from "@/lib/units";

export const dynamic = "force-dynamic";

const factor = (k: number) => KARAT_PURITY[k]?.factor ?? k / 24;
const fine = (rows: KaratWeight[]) => rows.reduce((s, r) => s + r.grams * factor(r.karat), 0); // 24K-equivalent grams
const grams = (rows: KaratWeight[]) => rows.reduce((s, r) => s + r.grams, 0);

// Silver: "fine" = pure (999-equivalent) grams.
const sFine = (rows: PurityWeight[]) => rows.reduce((s, r) => s + r.grams * silverPurityFactor(r.fineness), 0);
const sGrams = (rows: PurityWeight[]) => rows.reduce((s, r) => s + r.grams, 0);

function monthStart() {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default async function GoldLedgerPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user?.role, "goldledger")) return <NoAccess role={user?.role ?? "unknown"} />;

  const sp = await searchParams;
  const fromStr = sp.from ?? monthStart();
  const toStr = sp.to ?? new Date().toISOString().slice(0, 10);
  const from = new Date(fromStr).getTime();
  const to = new Date(toStr).getTime() + 86399999;
  const led = getGoldLedger(from, to);
  const sled = getSilverLedger(from, to);

  const inGrams = grams(led.oldGoldInByKarat) + grams(led.stockInByKarat);
  const inFine = fine(led.oldGoldInByKarat) + fine(led.stockInByKarat);
  const outGrams = grams(led.soldByKarat);
  const outFine = fine(led.soldByKarat);
  const netFine = inFine - outFine;

  // Silver totals (pure-equivalent grams).
  const sInFine = sFine(sled.oldSilverInByPurity) + sFine(sled.stockInByPurity);
  const sOutFine = sFine(sled.soldByPurity);
  const sNetFine = sInFine - sOutFine;
  const hasSilver =
    sled.soldByPurity.length + sled.oldSilverInByPurity.length + sled.stockInByPurity.length + sled.currentStockByPurity.length > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gold Weight Ledger <span className="urdu text-base text-gray-400">وزن کھاتہ</span></h1>
        <p className="text-sm text-gray-500">Pure-gold weight movement — what came in, went out, and is in stock (24K-equivalent / fine weight).</p>
      </div>

      <form className="flex flex-wrap items-end gap-2 bg-white rounded-2xl ring-1 ring-black/5 p-4">
        <div><label className="block text-xs text-gray-500 mb-1">From</label><input type="date" name="from" defaultValue={fromStr} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
        <div><label className="block text-xs text-gray-500 mb-1">To</label><input type="date" name="to" defaultValue={toStr} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div>
        <button className="rounded-lg bg-navy-900 text-white text-sm font-semibold px-4 py-2 hover:bg-navy-800">Filter</button>
      </form>

      {/* Summary cards (fine = 24K equivalent) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card label="Gold IN (fine)" fineG={inFine} rawG={inGrams} tone="in" />
        <Card label="Gold OUT (fine)" fineG={outFine} rawG={outGrams} tone="out" />
        <Card label="Net Flow (fine)" fineG={netFine} rawG={inGrams - outGrams} tone="net" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Table title="IN — Old Gold Bought" rows={led.oldGoldInByKarat} />
        <Table title="IN — New Stock Added" rows={led.stockInByKarat} />
        <Table title="OUT — Sold" rows={led.soldByKarat} />
        <Table title="Current Stock (in hand)" rows={led.currentStockByKarat} highlight />
      </div>

      {hasSilver && (
        <>
          <div className="pt-2">
            <h2 className="text-xl font-bold">Silver (Chandi) Weight Ledger <span className="urdu text-base text-gray-400">چاندی وزن کھاتہ</span></h2>
            <p className="text-sm text-gray-500">Pure-silver (999-equivalent) weight movement, kept separate from gold.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SCard label="Silver IN (fine)" fineG={sInFine} rawG={sGrams(sled.oldSilverInByPurity) + sGrams(sled.stockInByPurity)} tone="in" />
            <SCard label="Silver OUT (fine)" fineG={sOutFine} rawG={sGrams(sled.soldByPurity)} tone="out" />
            <SCard label="Net Flow (fine)" fineG={sNetFine} rawG={0} tone="net" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SilverTable title="IN — Old Silver Bought" rows={sled.oldSilverInByPurity} />
            <SilverTable title="IN — New Stock Added" rows={sled.stockInByPurity} />
            <SilverTable title="OUT — Sold" rows={sled.soldByPurity} />
            <SilverTable title="Current Stock (in hand)" rows={sled.currentStockByPurity} highlight />
          </div>
        </>
      )}
    </div>
  );
}

function SCard({ label, fineG, rawG, tone }: { label: string; fineG: number; rawG: number; tone: "in" | "out" | "net" }) {
  const color = tone === "in" ? "text-success" : tone === "out" ? "text-red-600" : "text-slate-700";
  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tnum ${color}`}>{gramsToTola(fineG).toFixed(3)} <span className="text-sm font-normal text-gray-400">tola</span></div>
      <div className="text-xs text-gray-400 tnum">{fineG.toFixed(3)} g fine{rawG ? ` • ${rawG.toFixed(3)} g gross` : ""}</div>
    </div>
  );
}

function SilverTable({ title, rows, highlight }: { title: string; rows: PurityWeight[]; highlight?: boolean }) {
  const totalG = sGrams(rows);
  const totalFine = sFine(rows);
  return (
    <div className={`rounded-2xl ring-1 ring-black/5 overflow-hidden ${highlight ? "bg-slate-50" : "bg-white"}`}>
      <div className="px-4 py-3 border-b border-black/5 font-semibold text-sm">{title}</div>
      <table className="w-full text-sm">
        <thead className="text-gray-500 text-left text-xs">
          <tr><th className="px-4 py-2">Fineness</th><th className="px-4 py-2 text-right">Weight (g)</th><th className="px-4 py-2 text-right">Tola</th><th className="px-4 py-2 text-right">Fine (g)</th></tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {rows.sort((a, b) => b.fineness - a.fineness).map((r) => (
            <tr key={r.fineness}>
              <td className="px-4 py-2 font-medium">{r.fineness}</td>
              <td className="px-4 py-2 text-right tnum">{r.grams.toFixed(3)}</td>
              <td className="px-4 py-2 text-right tnum">{gramsToTola(r.grams).toFixed(3)}</td>
              <td className="px-4 py-2 text-right tnum text-gray-500">{(r.grams * silverPurityFactor(r.fineness)).toFixed(3)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">None</td></tr>}
          {rows.length > 0 && (
            <tr className="font-semibold bg-black/5">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right tnum">{totalG.toFixed(3)}</td>
              <td className="px-4 py-2 text-right tnum">{gramsToTola(totalG).toFixed(3)}</td>
              <td className="px-4 py-2 text-right tnum">{totalFine.toFixed(3)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Card({ label, fineG, rawG, tone }: { label: string; fineG: number; rawG: number; tone: "in" | "out" | "net" }) {
  const color = tone === "in" ? "text-success" : tone === "out" ? "text-red-600" : "text-navy-900";
  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tnum ${color}`}>{gramsToTola(fineG).toFixed(3)} <span className="text-sm font-normal text-gray-400">tola</span></div>
      <div className="text-xs text-gray-400 tnum">{fineG.toFixed(3)} g fine • {rawG.toFixed(3)} g gross</div>
    </div>
  );
}

function Table({ title, rows, highlight }: { title: string; rows: KaratWeight[]; highlight?: boolean }) {
  const totalG = grams(rows);
  const totalFine = fine(rows);
  return (
    <div className={`rounded-2xl ring-1 ring-black/5 overflow-hidden ${highlight ? "bg-gold-50" : "bg-white"}`}>
      <div className="px-4 py-3 border-b border-black/5 font-semibold text-sm">{title}</div>
      <table className="w-full text-sm">
        <thead className="text-gray-500 text-left text-xs">
          <tr><th className="px-4 py-2">Karat</th><th className="px-4 py-2 text-right">Weight (g)</th><th className="px-4 py-2 text-right">Tola</th><th className="px-4 py-2 text-right">Fine (g)</th></tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {rows.sort((a, b) => b.karat - a.karat).map((r) => (
            <tr key={r.karat}>
              <td className="px-4 py-2 font-medium">{r.karat}K</td>
              <td className="px-4 py-2 text-right tnum">{r.grams.toFixed(3)}</td>
              <td className="px-4 py-2 text-right tnum">{gramsToTola(r.grams).toFixed(3)}</td>
              <td className="px-4 py-2 text-right tnum text-gray-500">{(r.grams * factor(r.karat)).toFixed(3)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">None</td></tr>}
          {rows.length > 0 && (
            <tr className="font-semibold bg-black/5">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right tnum">{totalG.toFixed(3)}</td>
              <td className="px-4 py-2 text-right tnum">{gramsToTola(totalG).toFixed(3)}</td>
              <td className="px-4 py-2 text-right tnum">{totalFine.toFixed(3)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
