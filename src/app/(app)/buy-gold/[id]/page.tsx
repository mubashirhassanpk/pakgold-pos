import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getPurchase } from "@/lib/oldgold";
import { getSettings } from "@/lib/queries";
import { getCurrentUser, can } from "@/lib/auth";
import { NoAccess } from "@/components/NoAccess";
import { formatPKR, formatDateTime } from "@/lib/format";
import { VoucherView } from "./VoucherView";

export const dynamic = "force-dynamic";

export default async function PurchaseVoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user?.role, "buygold")) return <NoAccess role={user?.role ?? "unknown"} />;

  const { id } = await params;
  const data = getPurchase(Number(id));
  if (!data) notFound();
  const { purchase, items } = data;
  const settings = getSettings();
  const canManage = user?.role === "owner" || user?.role === "manager";

  // QR encodes a verifiable voucher summary (matches the sale-invoice approach).
  const qrText =
    `${settings.shop_name_en || "PakGold"} | Voucher:${purchase.voucherNo} | ${formatDateTime(purchase.createdAt)} | ` +
    `Total:${formatPKR(purchase.totalValue)}${settings.ntn ? ` | NTN:${settings.ntn}` : ""}`;
  const qrSvg = await QRCode.toString(qrText, { type: "svg", margin: 0, width: 110 });

  return (
    <VoucherView
      settings={settings}
      purchaseId={purchase.id}
      purchase={{
        voucherNo: purchase.voucherNo,
        createdAt: purchase.createdAt,
        customerName: purchase.customerName,
        phone: purchase.phone,
        totalWeight: purchase.totalWeight,
        totalValue: purchase.totalValue,
        paid: purchase.paid,
        method: purchase.method,
        notes: purchase.notes,
        status: purchase.status,
      }}
      items={items.map((it) => ({
        id: it.id,
        metal: it.metal,
        karat: it.karat,
        silverPurity: it.silverPurity,
        weightGrams: it.weightGrams,
        buyRatePerTola: it.buyRatePerTola,
        value: it.value,
        notes: it.notes,
        inventoryItemId: it.inventoryItemId,
      }))}
      qrSvg={qrSvg}
      canManage={canManage}
    />
  );
}
