import { formatPKR, formatWeightDual, formatDateTime } from "@/lib/format";

interface SaleItem {
  id: number;
  description: string;
  metal?: string | null;
  karat: number;
  silverPurity?: number | null;
  weightGrams: number;
  ratePerTola: number;
  goldValue: number;
  making: number;
  wastage: number;
  other: number;
  quantity: number;
  lineTotal: number;
}
interface OldGold {
  id: number;
  metal?: string | null;
  karat: number;
  silverPurity?: number | null;
  weightGrams: number;
  buyRatePerTola: number;
  value: number;
}
interface Sale {
  invoiceNo: string;
  createdAt: number;
  subtotal: number;
  taxTotal: number;
  discount: number;
  oldGoldTotal: number;
  grandTotal: number;
  paidTotal: number;
}
interface Customer {
  name: string;
  phone: string | null;
  cnic: string | null;
  address: string | null;
}
interface Hallmark {
  description: string;
  metal?: "gold" | "silver" | null;
  karat: number;
  silverPurity?: number | null;
  hallmark: string | null;
  hallmarkLab: string | null;
  certNo: string | null;
  certDate: string | null;
}

/** A4 tax-style invoice. Prints to a real PDF via the OS print dialog. */
export function A4Invoice({
  settings,
  sale,
  items,
  oldGold,
  customer,
  qrSvg,
  hallmarks = [],
}: {
  settings: Record<string, string>;
  sale: Sale;
  items: SaleItem[];
  oldGold: OldGold[];
  customer: Customer | null;
  qrSvg?: string;
  hallmarks?: Hallmark[];
}) {
  return (
    <div className="bg-white text-black mx-auto" style={{ width: "210mm", minHeight: "297mm", padding: "14mm" }}>
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-gold pb-4">
        <div>
          <div className="text-2xl font-bold text-navy-900">{settings.shop_name_en || "PakGold Jewellers"}</div>
          {settings.shop_name_ur && <div className="urdu text-lg text-gold-700">{settings.shop_name_ur}</div>}
          <div className="text-xs text-gray-600 mt-1">
            {settings.address}
            {settings.phone && <> • Ph: {settings.phone}</>}
          </div>
          {(settings.ntn || settings.strn) && (
            <div className="text-xs text-gray-600">
              {settings.ntn && <>NTN: {settings.ntn} </>}
              {settings.strn && <>• STRN: {settings.strn}</>}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gold-700">INVOICE</div>
          <div className="text-sm font-mono">{sale.invoiceNo}</div>
          <div className="text-xs text-gray-600">{formatDateTime(sale.createdAt)}</div>
        </div>
      </div>

      {/* Bill to */}
      <div className="flex justify-between mt-4 text-sm">
        <div>
          <div className="text-xs text-gray-500 uppercase">Bill To / گاہک</div>
          <div className="font-semibold">{customer?.name ?? "Walk-in Customer"}</div>
          {customer?.phone && <div className="text-gray-600">{customer.phone}</div>}
          {customer?.cnic && <div className="text-gray-600">CNIC: {customer.cnic}</div>}
          {customer?.address && <div className="text-gray-600">{customer.address}</div>}
        </div>
      </div>

      {/* Items table */}
      <table className="w-full mt-4 text-xs border-collapse">
        <thead>
          <tr className="bg-navy-900 text-white text-left">
            <th className="px-2 py-2">#</th>
            <th className="px-2 py-2">Description</th>
            <th className="px-2 py-2">Purity</th>
            <th className="px-2 py-2 text-right">Weight</th>
            <th className="px-2 py-2 text-right">Gold</th>
            <th className="px-2 py-2 text-right">Making</th>
            <th className="px-2 py-2 text-right">Wastage</th>
            <th className="px-2 py-2 text-right">Other</th>
            <th className="px-2 py-2 text-right">Qty</th>
            <th className="px-2 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id} className="border-b border-gray-200">
              <td className="px-2 py-2">{i + 1}</td>
              <td className="px-2 py-2">{it.description}</td>
              <td className="px-2 py-2">{(it.metal ?? "gold") === "silver" ? (it.silverPurity ? `${it.silverPurity} Ag` : "Silver") : it.karat ? `${it.karat}K` : "—"}</td>
              <td className="px-2 py-2 text-right">{it.weightGrams ? formatWeightDual(it.weightGrams) : "—"}</td>
              <td className="px-2 py-2 text-right tnum">{formatPKR(it.goldValue)}</td>
              <td className="px-2 py-2 text-right tnum">{formatPKR(it.making)}</td>
              <td className="px-2 py-2 text-right tnum">{formatPKR(it.wastage)}</td>
              <td className="px-2 py-2 text-right tnum">{formatPKR(it.other)}</td>
              <td className="px-2 py-2 text-right">{it.quantity}</td>
              <td className="px-2 py-2 text-right tnum font-semibold">{formatPKR(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Old gold */}
      {oldGold.length > 0 && (
        <table className="w-full mt-3 text-xs">
          <tbody>
            <tr>
              <td className="font-semibold text-gold-700 py-1">Old Metal Received / پرانا سونا</td>
            </tr>
            {oldGold.map((g) => (
              <tr key={g.id} className="text-gray-600">
                <td className="py-0.5">
                  {(g.metal ?? "gold") === "silver" ? `${g.silverPurity ?? 999} Ag` : `${g.karat}K`} • {formatWeightDual(g.weightGrams)} @ {formatPKR(g.buyRatePerTola)}/tola
                  <span className="float-right text-red-600 tnum">− {formatPKR(g.value)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Hallmark / purity certificates */}
      {hallmarks.length > 0 && (
        <div className="mt-3 rounded border border-gold-400 bg-gold-50 p-2 text-xs">
          <div className="font-semibold text-gold-700">Hallmark / Purity Certificate · ہال مارک سند</div>
          <table className="w-full mt-1">
            <tbody>
              {hallmarks.map((h, i) => (
                <tr key={i} className="text-gray-700">
                  <td className="py-0.5 pr-2">{h.description}</td>
                  <td className="py-0.5 pr-2">{(h.metal ?? "gold") === "silver" ? `${h.silverPurity ?? 999} Ag` : `${h.karat}K`}{h.hallmark ? ` (${h.hallmark})` : ""}</td>
                  <td className="py-0.5 pr-2">{h.hallmarkLab ?? "—"}</td>
                  <td className="py-0.5">
                    {h.certNo ? `Cert: ${h.certNo}` : ""}
                    {h.certDate ? ` • ${h.certDate}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div className="flex justify-end mt-4">
        <div className="w-72 text-sm space-y-1">
          <Line label="Subtotal" value={formatPKR(sale.subtotal, { decimals: true })} />
          {sale.taxTotal > 0 && <Line label="Tax" value={formatPKR(sale.taxTotal, { decimals: true })} />}
          {sale.discount > 0 && <Line label="Discount" value={`− ${formatPKR(sale.discount, { decimals: true })}`} />}
          {sale.oldGoldTotal > 0 && <Line label="Less: Old Gold" value={`− ${formatPKR(sale.oldGoldTotal, { decimals: true })}`} />}
          <div className="flex justify-between border-t-2 border-navy-900 pt-1 mt-1 text-base font-bold">
            <span>Grand Total</span>
            <span className="tnum">{formatPKR(sale.grandTotal)}</span>
          </div>
          <Line label="Paid" value={formatPKR(sale.paidTotal, { decimals: true })} />
          {sale.grandTotal - sale.paidTotal > 0.5 && (
            <Line label="Balance (Udhaar)" value={formatPKR(sale.grandTotal - sale.paidTotal, { decimals: true })} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 flex justify-between items-end">
        <div className="text-xs text-gray-600 max-w-md flex items-start gap-3">
          {qrSvg && (
            <div
              className="shrink-0 overflow-hidden [&>svg]:block [&>svg]:!w-full [&>svg]:!h-full"
              style={{ width: 90, height: 90 }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          )}
          <div>
            {settings.footer_terms_en && <div>{settings.footer_terms_en}</div>}
            {settings.footer_terms_ur && <div className="urdu mt-1">{settings.footer_terms_ur}</div>}
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 w-40 pt-1 text-xs text-gray-600">Authorised Signature</div>
        </div>
      </div>
      <div className="text-center text-xs text-gray-400 mt-6">Thank you for your business • شکریہ</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-700">
      <span>{label}</span>
      <span className="tnum">{value}</span>
    </div>
  );
}
