import { getCurrentUser } from "@/lib/auth";
import { listSerialPorts } from "@/lib/hardware";

/** GET /api/hardware/ports — list serial ports for the settings UI. */
export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "owner" && user?.role !== "manager") {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const ports = await listSerialPorts();
  return Response.json({ ok: true, ports });
}
