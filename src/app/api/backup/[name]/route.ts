import fs from "node:fs";
import { getCurrentUser } from "@/lib/auth";
import { backupPath } from "@/lib/backup";

/** GET /api/backup/<name> — download an existing backup file. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "owner") return new Response("Forbidden", { status: 403 });

  const { name } = await params;
  const p = backupPath(name);
  if (!p) return new Response("Not found", { status: 404 });

  const data = fs.readFileSync(p);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
