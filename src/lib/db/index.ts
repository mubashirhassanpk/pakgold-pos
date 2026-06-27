/**
 * Drizzle + better-sqlite3 client.
 *
 * better-sqlite3 is synchronous and extremely fast — perfect for a local POS
 * where the Next.js server and the database live on the same shop machine.
 * The connection is cached on globalThis so Next's dev hot-reload does not
 * open a new handle on every change.
 */
import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "pakgold.db");

const globalForDb = globalThis as unknown as {
  __pakgoldSqlite?: Database.Database;
};

/**
 * Restart-safe restore: if a staged restore file exists (written by the restore
 * action), swap it into place BEFORE opening the DB. Doing this at startup
 * avoids fighting the open file handle / Windows file lock.
 */
function applyPendingRestore() {
  const pending = `${DB_PATH}.restore`;
  if (!fs.existsSync(pending)) return;
  // Clear stale WAL/SHM so they don't override the restored file.
  for (const ext of ["-wal", "-shm"]) {
    if (fs.existsSync(DB_PATH + ext)) fs.rmSync(DB_PATH + ext);
  }
  fs.copyFileSync(pending, DB_PATH);
  fs.rmSync(pending);
  console.log("♻️  Restored database from staged backup.");
}

function createConnection(): Database.Database {
  applyPendingRestore();
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL"); // better concurrency + crash safety
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

export const sqlite = globalForDb.__pakgoldSqlite ?? createConnection();
if (process.env.NODE_ENV !== "production") globalForDb.__pakgoldSqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema };
