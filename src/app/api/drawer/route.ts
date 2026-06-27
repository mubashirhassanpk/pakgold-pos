import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { readHardwareConfig, drawerKickBytes, sendToPrinter } from "@/lib/hardware";

/** POST /api/drawer — kick the cash drawer (connected via the printer). */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const cfg = readHardwareConfig(getSettings());
  if (cfg.printerMode === "off") {
    return Response.json({ ok: false, error: "Printer not configured" }, { status: 400 });
  }
  try {
    await sendToPrinter(cfg, drawerKickBytes());
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Drawer failed" }, { status: 500 });
  }
}
