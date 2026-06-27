"use client";

import type { LineItemResult } from "@/lib/calculations";
import { computeOldGoldValue, type InvoiceTotals } from "@/lib/calculations";
import { formatPKR, formatWeightDual, formatDateTime } from "@/lib/format";

interface CartLineView {
  line: { key: string; description: string; metal?: "gold" | "silver"; karat: number; silverPurity?: number | null; weightGrams: number; ratePerTola: number };
  result: LineItemResult;
}
interface OldGoldView {
  key: string;
  metal?: "gold" | "silver";
  weightGrams: number;
  karat: number;
  silverPurity?: number | null;
  buyRatePerTola: number;
}

/**
 * 80mm thermal-style receipt. Pure HTML/CSS so it prints crisply via the
 * browser print dialog. Phase 3 will add direct ESC/POS commands + auto-cut.
 */
export function Receipt({
  settings,
  invoiceNo,
  lines,
  oldGold,
  totals,
  method,
}: {
  settings: Record<string, string>;
  invoiceNo: string;
  lines: CartLineView[];
  oldGold: OldGoldView[];
  totals: InvoiceTotals;
  method: string;
}) {
  return (
    <div className="text-[11px] leading-tight text-black" style={{ fontFamily: "ui-monospace, monospace" }}>
      {/* Header */}
      <div className="text-center">
        <div className="text-base font-bold">{settings.shop_name_en || "PakGold Jewellers"}</div>
        {settings.shop_name_ur && <div className="urdu text-sm">{settings.shop_name_ur}</div>}
        {settings.address && <div>{settings.address}</div>}
        {settings.phone && <div>Ph: {settings.phone}</div>}
        {settings.ntn && <div>NTN: {settings.ntn} {settings.strn && `• STRN: ${settings.strn}`}</div>}
      </div>

      <Divider />
      <div className="flex justify-between">
        <span>Invoice: {invoiceNo}</span>
      </div>
      <div>{formatDateTime(Date.now())}</div>
      <Divider />

      {/* Items */}
      {lines.map(({ line, result }) => {
        const isSilver = (line.metal ?? "gold") === "silver";
        const purityLabel = isSilver ? `${line.silverPurity ?? 999} Ag` : `${line.karat}K`;
        return (
        <div key={line.key} className="mb-1">
          <div className="font-semibold">{line.description} ({purityLabel})</div>
          <div>{formatWeightDual(line.weightGrams)}</div>
          <Cell label={isSilver ? "Silver / چاندی" : "Gold / سونا"} v={result.goldValue} />
          {result.making > 0 && <Cell label="Making / مزدوری" v={result.making} />}
          {result.wastage > 0 && <Cell label="Wastage / کاٹ" v={result.wastage} />}
          {result.other > 0 && <Cell label="Other" v={result.other} />}
          <div className="flex justify-between font-semibold">
            <span>Line Total</span>
            <span>{formatPKR(result.lineTotal, { decimals: true })}</span>
          </div>
        </div>
        );
      })}

      {oldGold.length > 0 && (
        <>
          <Divider />
          <div className="font-semibold">Old Metal / پرانا سونا</div>
          {oldGold.map((g) => (
            <Cell
              key={g.key}
              label={`${(g.metal ?? "gold") === "silver" ? `${g.silverPurity ?? 999} Ag` : `${g.karat}K`}  ${g.weightGrams.toFixed(3)}g`}
              v={-computeOldGoldValue(g.weightGrams, g.buyRatePerTola)}
            />
          ))}
        </>
      )}

      <Divider />
      <Cell label="Subtotal" v={totals.subtotal} />
      {totals.tax > 0 && <Cell label="Tax / ٹیکس" v={totals.tax} />}
      {totals.discount > 0 && <Cell label="Discount / رعایت" v={-totals.discount} />}
      {totals.oldGoldTotal > 0 && <Cell label="Less Old Gold" v={-totals.oldGoldTotal} />}
      <Divider />
      <div className="flex justify-between text-sm font-bold">
        <span>GRAND TOTAL</span>
        <span>{formatPKR(totals.grandTotal)}</span>
      </div>
      <div className="urdu text-right text-sm font-bold">کل رقم</div>
      <div className="flex justify-between mt-1">
        <span>Paid via</span>
        <span className="uppercase">{method}</span>
      </div>

      <Divider />
      <div className="text-center">
        {settings.footer_terms_en && <div className="text-[10px]">{settings.footer_terms_en}</div>}
        {settings.footer_terms_ur && <div className="urdu text-[11px] mt-1">{settings.footer_terms_ur}</div>}
        <div className="mt-2 font-semibold">Shukria! / شکریہ 🙏</div>
      </div>
    </div>
  );
}

function Cell({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{formatPKR(v, { decimals: true })}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-dashed border-black my-1" />;
}
