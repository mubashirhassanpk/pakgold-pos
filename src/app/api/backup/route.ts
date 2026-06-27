import fs from "node:fs";
import { getCurrentUser } from "@/lib/auth";
import { createBackup, backupPath } from "@/lib/backup";

/** GET /api/backup — create a fresh backup and download it in one click. */
export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "owner") return new Response("Forbidden", { status: 403 });

  const name = await createBackup();
  const p = backupPath(name);
  if (!p) return new Response("Backup failed", { status: 500 });

  const data = fs.readFileSync(p);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
