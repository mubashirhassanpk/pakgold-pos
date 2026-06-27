/** Backup & restore helpers for the local SQLite database. */
import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { sqlite } from "./db";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "pakgold.db");
export const BACKUP_DIR = process.env.BACKUP_DIR ?? path.join(process.cwd(), "backups");

/** Only allow our own backup filenames — guards against path traversal. */
const NAME_RE = /^pakgold-backup-[0-9TZ\-:.]+\.db$/;

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export interface BackupFile {
  name: string;
  size: number;
  createdAt: number;
}

/**
 * Create an online, consistent backup using better-sqlite3's backup API
 * (safe while the database is in use). Returns the new file's name.
 */
export async function createBackup(): Promise<string> {
  ensureDir();
  const name = `pakgold-backup-${timestamp()}.db`;
  await sqlite.backup(path.join(BACKUP_DIR, name));
  return name;
}

export function listBackups(): BackupFile[] {
  ensureDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => NAME_RE.test(f))
    .map((name) => {
      const st = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, size: st.size, createdAt: st.mtimeMs };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Resolve a backup file path safely, or null if the name is invalid/missing. */
export function backupPath(name: string): string | null {
  if (!NAME_RE.test(name)) return null;
  const p = path.join(BACKUP_DIR, name);
  if (!p.startsWith(BACKUP_DIR) || !fs.existsSync(p)) return null;
  return p;
}

export function deleteBackup(name: string): boolean {
  const p = backupPath(name);
  if (!p) return false;
  fs.rmSync(p);
  return true;
}

/**
 * Validate that a buffer is a real PakGold SQLite database, then stage it for
 * restore-on-restart. Throws if the file is not a valid PakGold DB.
 */
export function stageRestore(buffer: Buffer): void {
  // Quick magic-header check ("SQLite format 3\0").
  if (buffer.subarray(0, 15).toString("utf8") !== "SQLite format 3") {
    throw new Error("Not a valid SQLite database file.");
  }
  // Deeper check: open read-only from a temp file and look for our tables.
  const tmp = path.join(BACKUP_DIR, `__verify-${timestamp()}.tmp`);
  ensureDir();
  fs.writeFileSync(tmp, buffer);
  try {
    const test = new Database(tmp, { readonly: true });
    const row = test
      .prepare("SELECT count(*) c FROM sqlite_master WHERE type='table' AND name IN ('sales','users','inventory_items')")
      .get() as { c: number };
    test.close();
    if (row.c < 3) throw new Error("This file is not a PakGold backup.");
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  // Stage it; the swap happens at next server start (see db/index.ts).
  fs.writeFileSync(`${DB_PATH}.restore`, buffer);
}
