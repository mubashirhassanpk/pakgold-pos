import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { getSaleDetail } from "@/lib/sales";
import { readHardwareConfig, buildReceipt, drawerKickBytes, sendToPrinter } from "@/lib/hardware";

/** POST /api/print/<saleId> — print an ESC/POS receipt + optional drawer kick. */
export async function POST(_req: Request, { params }: { params: Promise<{ saleId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { saleId } = await params;
  const detail = getSaleDetail(Number(saleId));
  if (!detail) return Response.json({ ok: false, error: "Sale not found" }, { status: 404 });

  const settings = getSettings();
  const cfg = readHardwareConfig(settings);
  if (cfg.printerMode === "off") {
    return Response.json({ ok: false, error: "Printer not configured (use browser print instead)" }, { status: 400 });
  }

  const method = detail.payments[0]?.method;
  const receipt = buildReceipt(settings, {
    invoiceNo: detail.sale.invoiceNo,
    createdAt: detail.sale.createdAt,
    items: detail.items.map((i) => ({ description: i.description, quantity: i.quantity, lineTotal: i.lineTotal })),
    subtotal: detail.sale.subtotal,
    taxTotal: detail.sale.taxTotal,
    discount: detail.sale.discount,
    oldGoldTotal: detail.sale.oldGoldTotal,
    grandTotal: detail.sale.grandTotal,
    paidTotal: detail.sale.paidTotal,
    method,
  });

  try {
    const payload = cfg.drawerKick ? Buffer.concat([receipt, drawerKickBytes()]) : receipt;
    await sendToPrinter(cfg, payload);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Print failed" }, { status: 500 });
  }
}
