/**
 * Danger: deletes the local database file and recreates an empty one.
 * Run with:  npm run db:reset   (then npm run db:migrate && npm run db:seed)
 */
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "pakgold.db");
for (const ext of ["", "-journal", "-wal", "-shm"]) {
  const f = DB_PATH + ext;
  if (fs.existsSync(f)) {
    fs.rmSync(f);
    console.log("🗑️  Removed", f);
  }
}
console.log("✅ Database reset. Now run: npm run db:migrate && npm run db:seed");
