import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getSaleDetail } from "@/lib/sales";
import { getSettings } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { A4Invoice } from "@/components/A4Invoice";
import { formatPKR, formatDateTime } from "@/lib/format";
import { InvoiceActions } from "./InvoiceActions";
import { ReturnButton } from "./ReturnButton";
import { DeleteSaleButton } from "./DeleteSaleButton";
import { VoidSaleButton } from "./VoidSaleButton";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return <NoAccess role="unknown" />;

  const { id } = await params;
  const detail = getSaleDetail(Number(id));
  if (!detail) notFound();
  const settings = getSettings();

  const { sale, items, oldGold, customer, hallmarks } = detail;
  const summary =
    `${settings.shop_name_en || "PakGold"}\n` +
    `Invoice ${sale.invoiceNo}\n` +
    `Total: ${formatPKR(sale.grandTotal)}\n` +
    `Thank you for your purchase!`;

  // QR encodes a verifiable invoice summary (FBR-ready: swap in the FBR
  // invoice number here once Tier-1 integration is configured).
  const qrText =
    `${settings.shop_name_en || "PakGold"} | Inv:${sale.invoiceNo} | ${formatDateTime(sale.createdAt)} | ` +
    `Total:${formatPKR(sale.grandTotal)}${settings.ntn ? ` | NTN:${settings.ntn}` : ""}`;
  const qrSvg = await QRCode.toString(qrText, { type: "svg", margin: 0, width: 110 });

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <InvoiceActions phone={customer?.phone ?? null} summary={summary} />
      {sale.status === "void" && (
        <div className="no-print max-w-[210mm] mx-auto -mt-2 mb-4 flex items-center justify-between gap-3 rounded-lg bg-amber-50 ring-1 ring-amber-200 px-4 py-2">
          <span className="text-sm font-semibold text-amber-700">VOID — this sale is cancelled (kept for record).</span>
          {(user.role === "owner" || user.role === "manager") && (
            <DeleteSaleButton saleId={sale.id} invoiceNo={sale.invoiceNo} />
          )}
        </div>
      )}
      {sale.status === "completed" && (user.role === "owner" || user.role === "manager") && (
        <div className="no-print flex justify-end gap-2 max-w-[210mm] mx-auto -mt-2 mb-4">
          {items.some((it) => it.quantity > 0) && (
            <ReturnButton
              saleId={sale.id}
              invoiceNo={sale.invoiceNo}
              items={items
                .filter((it) => it.quantity > 0)
                .map((it) => ({
                  itemId: it.itemId,
                  description: it.description,
                  metal: (it.metal ?? "gold") as "gold" | "silver",
                  karat: it.karat,
                  silverPurity: it.silverPurity ?? null,
                  weightGrams: it.weightGrams,
                  quantity: it.quantity,
                  lineTotal: it.lineTotal,
                }))}
            />
          )}
          <VoidSaleButton saleId={sale.id} invoiceNo={sale.invoiceNo} />
          <DeleteSaleButton saleId={sale.id} invoiceNo={sale.invoiceNo} />
        </div>
      )}
      <div id="print-area" className="shadow-lg ring-1 ring-black/5 mx-auto" style={{ width: "210mm" }}>
        <A4Invoice settings={settings} sale={sale} items={items} oldGold={oldGold} customer={customer} qrSvg={qrSvg} hallmarks={hallmarks} />
      </div>
    </div>
  );
}
