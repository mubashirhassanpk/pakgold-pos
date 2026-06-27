import { formatPKR, formatWeightDual, formatDateTime } from "@/lib/format";

interface PurchaseItem {
  id: number;
  metal?: string | null;
  karat: number;
  silverPurity?: number | null;
  weightGrams: number;
  buyRatePerTola: number;
  value: number;
  notes?: string | null;
}
interface Purchase {
  voucherNo: string;
  createdAt: number;
  customerName: string | null;
  phone: string | null;
  totalWeight: number;
  totalValue: number;
  paid: number;
  method: string;
  notes: string | null;
}

/** A4 voucher for an old-gold/silver purchase. Prints to PDF via the OS dialog. */
export function A4Purchase({
  settings,
  purchase,
  items,
  qrSvg,
}: {
  settings: Record<string, string>;
  purchase: Purchase;
  items: PurchaseItem[];
  qrSvg?: string;
}) {
  const balance = Math.round((purchase.totalValue - purchase.paid) * 100) / 100;
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
          <div className="text-xl font-bold text-gold-700">PURCHASE VOUCHER</div>
          <div className="urdu text-sm text-gray-600">پرانا سونا خرید</div>
          <div className="text-sm font-mono">{purchase.voucherNo}</div>
          <div className="text-xs text-gray-600">{formatDateTime(purchase.createdAt)}</div>
        </div>
      </div>

      {/* Received from */}
      <div className="flex justify-between mt-4 text-sm">
        <div>
          <div className="text-xs text-gray-500 uppercase">Received From / گاہک</div>
          <div className="font-semibold">{purchase.customerName || "Walk-in Customer"}</div>
          {purchase.phone && <div className="text-gray-600">{purchase.phone}</div>}
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
            <th className="px-2 py-2 text-right">Rate / tola</th>
            <th className="px-2 py-2 text-right">Value</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id} className="border-b border-gray-200">
              <td className="px-2 py-2">{i + 1}</td>
              <td className="px-2 py-2">{it.notes || "Old metal"}</td>
              <td className="px-2 py-2">
                {(it.metal ?? "gold") === "silver" ? (it.silverPurity ? `${it.silverPurity} Ag` : "Silver") : `${it.karat}K`}
              </td>
              <td className="px-2 py-2 text-right">{formatWeightDual(it.weightGrams)}</td>
              <td className="px-2 py-2 text-right tnum">{formatPKR(it.buyRatePerTola)}</td>
              <td className="px-2 py-2 text-right tnum font-semibold">{formatPKR(it.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mt-4">
        <div className="w-72 text-sm space-y-1">
          <Line label="Total Weight" value={`${purchase.totalWeight.toFixed(3)} g`} />
          <div className="flex justify-between border-t-2 border-navy-900 pt-1 mt-1 text-base font-bold">
            <span>Total Value</span>
            <span className="tnum">{formatPKR(purchase.totalValue)}</span>
          </div>
          <Line label={`Paid (${purchase.method})`} value={formatPKR(purchase.paid, { decimals: true })} />
          {balance > 0.5 && <Line label="Balance Payable" value={formatPKR(balance, { decimals: true })} />}
        </div>
      </div>

      {purchase.notes && <div className="mt-3 text-xs text-gray-600">Note: {purchase.notes}</div>}

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
            <div>Old metal purchased at the buyback rate shown above.</div>
            {settings.footer_terms_ur && <div className="urdu mt-1">{settings.footer_terms_ur}</div>}
          </div>
        </div>
        <div className="flex gap-10">
          <div className="text-center">
            <div className="border-t border-gray-400 w-40 pt-1 text-xs text-gray-600">Customer Signature</div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 w-40 pt-1 text-xs text-gray-600">Authorised Signature</div>
          </div>
        </div>
      </div>
      <div className="text-center text-xs text-gray-400 mt-6">Thank you • شکریہ</div>
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
