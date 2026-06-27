import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { readHardwareConfig, readScale } from "@/lib/hardware";

/** GET /api/scale — read a stable weight (grams) from the configured scale. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const cfg = readHardwareConfig(getSettings());
    const result = await readScale(cfg);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Scale error" }, { status: 500 });
  }
}
